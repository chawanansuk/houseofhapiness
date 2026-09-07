/**
 * ชั้นเก็บข้อมูลของหลังบ้าน — Postgres (Supabase) เมื่อตั้ง DATABASE_URL แล้ว
 * (ไฟล์ขึ้นต้นด้วย _ = Vercel ไม่ทำเป็น endpoint)
 *
 * ออกแบบให้ทุก API เรียกผ่าน createStore(query) โดย query(sql, params) → { rows }
 * - บน Vercel: pg.Pool ต่อ Supabase transaction pooler
 * - ในเทส: PGlite (Postgres ในโปรเซส) ส่ง query แบบเดียวกันเข้ามา
 * รูปแบบข้อมูลที่ตอบกลับตรงกับ Apps Script `list` ทุกฟิลด์ หน้า /admin จึงใช้ต่อได้ทันที
 */
const fs = require("fs");
const path = require("path");

const BOOKING_COLS = ["id", "source", "name", "checkin", "checkout", "nights", "guests", "rooms", "phone", "amount", "status", "note", "created", "room_no", "paid", "pay_status"];
const BOOKING_EDITABLE = ["status", "room_no", "note", "checkin", "checkout", "amount", "name", "phone", "guests", "paid", "pay_status"];
const EXP_COLS = ["id", "date", "category", "amount", "vendor", "method", "note", "created"];
const ORDER_COLS = ["id", "created", "name", "room", "date", "time", "items", "total", "note", "status", "paid", "lang", "channel"];
const ORDER_EDITABLE = ["status", "paid", "note", "room", "date", "time", "name"];
const SITE_DEFAULTS = [
  ["price_per_night", "700", "ราคาห้อง Standard (บาท/คืน)"],
  ["price_studio", "800", "ราคาห้อง Studio 2 เตียง (บาท/คืน)"],
  ["price_deluxe", "850", "ราคาห้อง Deluxe (บาท/คืน)"],
  ["announcement_th", "", "ประกาศแถบบนหน้าแรก ภาษาไทย (เว้นว่าง = ไม่แสดง)"],
  ["announcement_en", "", "ประกาศหน้าแรก ภาษาอังกฤษ (เว้นว่าง = ไม่แสดง)"],
];
const REAL_ROOMS = ["701", "702", "703", "704", "705", "706", "707twin", "708twin", "709", "710", "713", "714-จองตรง", "715twin", "716", "717", "718", "งิ้ว2", "งิ้ว3"];

const str = (v) => String(v == null ? "" : v).trim();
const bkkNow = () => new Date(Date.now() + 7 * 3600 * 1000);
const pad = (n) => String(n).padStart(2, "0");
const stamp = () => { const d = bkkNow(); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const idStamp = () => { const d = bkkNow(); return `${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`; };
const nightsOf = (ci, co) => (/^\d{4}-\d{2}-\d{2}$/.test(ci) && /^\d{4}-\d{2}-\d{2}$/.test(co)) ? String(Math.round((Date.parse(co) - Date.parse(ci)) / 86400000)) : "";

function dbEnabled() { return Boolean((process.env.DATABASE_URL || "").trim()); }

function createStore(query) {
  let schemaReady = null;
  const ensureSchema = () => {
    if (!schemaReady) {
      schemaReady = (async () => {
        // ตัดบรรทัดคอมเมนต์ก่อน แล้วแยกทีละคำสั่ง (ให้ error ชี้จุดได้)
        const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8").split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
        for (const stmt of sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await query(stmt);
        const r = await query("SELECT count(*)::int AS n FROM rooms");
        if (r.rows[0].n === 0) for (let i = 0; i < REAL_ROOMS.length; i++) await query("INSERT INTO rooms (room, clean, note, sort) VALUES ($1, 'สะอาด', '', $2) ON CONFLICT (room) DO NOTHING", [REAL_ROOMS[i], i]);
        for (const [k, v, d] of SITE_DEFAULTS) await query("INSERT INTO site_settings (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING", [k, v, d]);
      })().catch((e) => { schemaReady = null; throw e; });
    }
    return schemaReady;
  };

  const audit = (actor, action, target, fields) =>
    query("INSERT INTO audit_log (actor, action, target, fields) VALUES ($1, $2, $3, $4)", [str(actor), str(action), str(target), fields ? JSON.stringify(fields) : null]).catch(() => {});

  // id แบบเดิม (WEB-yyMMddHHmmss) + กันชนกันในวินาทีเดียว
  async function freshId(prefix, table) {
    const base = `${prefix}-${idStamp()}`;
    for (let i = 0; i < 20; i++) {
      const cand = i === 0 ? base : `${base}-${i + 1}`;
      const r = await query(`SELECT 1 FROM ${table} WHERE id = $1`, [cand]);
      if (!r.rows.length) return cand;
    }
    return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const pick = (cols, row) => cols.map((c) => str(row[c]));

  let bootstrapTried = false;
  return {
    ensureSchema,
    async ping() { await query("SELECT 1"); return true; },

    // ครั้งแรกที่ฐานข้อมูลยังว่างและมีชีตตั้งค่าอยู่ → ดึงทุกแท็บจากชีตมาให้เองอัตโนมัติ (ไม่ต้องกด /api/migrate)
    // พยายามครั้งเดียวต่ออินสแตนซ์ ถ้าชีตล่มจะลองใหม่ในอินสแตนซ์ถัดไป
    async bootstrapFromSheet(opts = {}) {
      if (bootstrapTried) return null;
      const url = (opts.url != null ? opts.url : (process.env.SHEET_WEBAPP_URL || "")).trim();
      const token = (opts.token != null ? opts.token : (process.env.SHEET_TOKEN || "")).trim();
      if (!url || !token) return null;
      await ensureSchema();
      const n = await query("SELECT count(*)::int AS n FROM bookings");
      if (n.rows[0].n > 0) { bootstrapTried = true; return null; }
      bootstrapTried = true;
      const f = opts.fetchImpl || fetch;
      const sep = url.includes("?") ? "&" : "?";
      const get = async (action) => {
        const r = await f(`${url}${sep}action=${action}&token=${encodeURIComponent(token)}&_ts=${Date.now()}`, { redirect: "follow" });
        if (!r.ok) throw new Error(`sheet ${action} http-${r.status}`);
        const j = await r.json();
        if (j && j.error) throw new Error(`sheet ${action}: ${j.error}`);
        return j;
      };
      try {
        const [list, site] = await Promise.all([get("list"), get("site").catch(() => null)]);
        if (!Array.isArray(list && list.bookings)) throw new Error("sheet list invalid");
        const counts = await this.importFromSheet(list, site);
        console.info(JSON.stringify({ event: "db_bootstrap_from_sheet", counts }));
        return counts;
      } catch (e) {
        bootstrapTried = false; // ให้ลองใหม่รอบหน้า
        console.error(JSON.stringify({ event: "db_bootstrap_failed", reason: String((e && e.message) || e).slice(0, 160) }));
        return null;
      }
    },

    async listAll() {
      await ensureSchema();
      const [b, r, e, o] = await Promise.all([
        query(`SELECT ${BOOKING_COLS.join(",")} FROM bookings ORDER BY created DESC, id`),
        query("SELECT room, clean, note FROM rooms ORDER BY sort, room"),
        query(`SELECT ${EXP_COLS.join(",")} FROM expenses ORDER BY date DESC, id DESC`),
        query(`SELECT ${ORDER_COLS.join(",")} FROM orders ORDER BY date, time, id`),
      ]);
      return { bookings: b.rows, rooms: r.rows, expenses: e.rows, orders: o.rows };
    },

    async addBooking(row, actor) {
      await ensureSchema();
      const id = str(row.id) || await freshId("WEB", "bookings");
      const rec = { ...row, id, nights: nightsOf(str(row.checkin), str(row.checkout)) || str(row.nights), created: str(row.created) || stamp(), rooms: str(row.rooms) || "1", status: str(row.status) || "รอยืนยัน" };
      await query(`INSERT INTO bookings (${BOOKING_COLS.join(",")}) VALUES (${BOOKING_COLS.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING`, pick(BOOKING_COLS, rec));
      await audit(actor || "web", "add", id, { source: rec.source, checkin: rec.checkin, checkout: rec.checkout });
      return id;
    },

    async updateBooking(id, fields, actor) {
      await ensureSchema();
      const keys = Object.keys(fields || {}).filter((k) => BOOKING_EDITABLE.includes(k));
      if (!keys.length) return { ok: true, changed: 0 };
      const vals = keys.map((k) => str(fields[k]));
      // เปลี่ยนวันเข้า/ออก → คำนวณจำนวนคืนใหม่ให้เอง
      const cur = await query("SELECT checkin, checkout FROM bookings WHERE id = $1", [str(id)]);
      if (!cur.rows.length) return { ok: false, error: "not-found" };
      const ci = keys.includes("checkin") ? str(fields.checkin) : cur.rows[0].checkin;
      const co = keys.includes("checkout") ? str(fields.checkout) : cur.rows[0].checkout;
      const sets = keys.map((k, i) => `${k} = $${i + 2}`);
      if (keys.includes("checkin") || keys.includes("checkout")) { sets.push(`nights = $${keys.length + 2}`); vals.push(nightsOf(ci, co)); }
      sets.push("updated_at = now()");
      const r = await query(`UPDATE bookings SET ${sets.join(", ")} WHERE id = $1`, [str(id), ...vals]);
      await audit(actor || "admin", "update", str(id), fields);
      return { ok: true, changed: r.rowCount == null ? 1 : r.rowCount };
    },

    async setRoomClean(room, clean, note, actor) {
      await ensureSchema();
      const r = note === undefined
        ? await query("UPDATE rooms SET clean = $2, updated_at = now() WHERE room = $1", [str(room), str(clean) || "สะอาด"])
        : await query("UPDATE rooms SET clean = $2, note = $3, updated_at = now() WHERE room = $1", [str(room), str(clean) || "สะอาด", str(note)]);
      const changed = r.rowCount == null ? 1 : r.rowCount;
      if (changed) await audit(actor || "admin", "roomclean", str(room), { clean: str(clean), ...(note === undefined ? {} : { note: str(note) }) });
      return changed ? { ok: true } : { ok: false, error: "room-not-found" };
    },

    async addExpense(x, actor) {
      await ensureSchema();
      const id = str(x.id) || await freshId("EXP", "expenses");
      const rec = { ...x, id, date: str(x.date) || stamp().slice(0, 10), category: str(x.category) || "อื่นๆ", created: str(x.created) || stamp() };
      await query(`INSERT INTO expenses (${EXP_COLS.join(",")}) VALUES (${EXP_COLS.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING`, pick(EXP_COLS, rec));
      await audit(actor || "admin", "expadd", id, { amount: rec.amount, category: rec.category });
      return id;
    },

    async deleteExpense(id, actor) {
      await ensureSchema();
      const r = await query("DELETE FROM expenses WHERE id = $1", [str(id)]);
      const changed = r.rowCount == null ? 1 : r.rowCount;
      if (changed) await audit(actor || "admin", "expdel", str(id), null);
      return changed ? { ok: true } : { ok: false, error: "not-found" };
    },

    async addOrder(o) {
      await ensureSchema();
      const id = str(o.id) || await freshId("RS", "orders");
      const rec = { ...o, id, created: str(o.created) || stamp(), status: str(o.status) || "รอยืนยัน", lang: str(o.lang) || "th" };
      await query(`INSERT INTO orders (${ORDER_COLS.join(",")}) VALUES (${ORDER_COLS.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING`, pick(ORDER_COLS, rec));
      await audit("web", "orderadd", id, { room: rec.room, total: rec.total });
      return id;
    },

    async updateOrder(id, fields, actor) {
      await ensureSchema();
      const keys = Object.keys(fields || {}).filter((k) => ORDER_EDITABLE.includes(k));
      if (!keys.length) return { ok: true };
      const r = await query(`UPDATE orders SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")}, updated_at = now() WHERE id = $1`, [str(id), ...keys.map((k) => str(fields[k]))]);
      const changed = r.rowCount == null ? 1 : r.rowCount;
      if (changed) await audit(actor || "admin", "orderupdate", str(id), fields);
      return changed ? { ok: true } : { ok: false, error: "not-found" };
    },

    async getSite() {
      await ensureSchema();
      const [s, r] = await Promise.all([query("SELECT key, value FROM site_settings"), query('SELECT "from", "to", room, price, note FROM rates ORDER BY "from"')]);
      const site = {};
      for (const row of s.rows) site[row.key] = row.value;
      return { site, rates: r.rows };
    },

    // ย้ายข้อมูลจากชีต (payload ของ Apps Script action=list + action=site) — รันซ้ำได้ ไม่ทับค่าที่แก้ในฐานข้อมูลแล้ว
    async importFromSheet(list, site) {
      await ensureSchema();
      const counts = { bookings: 0, rooms: 0, expenses: 0, orders: 0, site: 0, rates: 0 };
      for (const b of (list && list.bookings) || []) {
        if (!str(b.id)) continue;
        const r = await query(`INSERT INTO bookings (${BOOKING_COLS.join(",")}) VALUES (${BOOKING_COLS.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING`, pick(BOOKING_COLS, b));
        counts.bookings += r.rowCount == null ? 1 : r.rowCount;
      }
      let i = 0;
      for (const rm of (list && list.rooms) || []) {
        if (!str(rm.room)) continue;
        const r = await query("INSERT INTO rooms (room, clean, note, sort) VALUES ($1, $2, $3, $4) ON CONFLICT (room) DO UPDATE SET sort = EXCLUDED.sort", [str(rm.room), str(rm.clean) || "สะอาด", str(rm.note), i++]);
        counts.rooms += r.rowCount == null ? 1 : r.rowCount;
      }
      for (const e of (list && list.expenses) || []) {
        if (!str(e.id)) continue;
        const r = await query(`INSERT INTO expenses (${EXP_COLS.join(",")}) VALUES (${EXP_COLS.map((_, j) => `$${j + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING`, pick(EXP_COLS, e));
        counts.expenses += r.rowCount == null ? 1 : r.rowCount;
      }
      for (const o of (list && list.orders) || []) {
        if (!str(o.id)) continue;
        const r = await query(`INSERT INTO orders (${ORDER_COLS.join(",")}) VALUES (${ORDER_COLS.map((_, j) => `$${j + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING`, pick(ORDER_COLS, o));
        counts.orders += r.rowCount == null ? 1 : r.rowCount;
      }
      if (site && site.site) {
        for (const [k, v] of Object.entries(site.site)) {
          const r = await query("INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [str(k), str(v)]);
          counts.site += r.rowCount == null ? 1 : r.rowCount;
        }
      }
      if (site && Array.isArray(site.rates)) {
        await query("DELETE FROM rates");
        for (const rt of site.rates) {
          if (!str(rt.from) || !str(rt.to) || !str(rt.price)) continue;
          await query('INSERT INTO rates ("from", "to", room, price, note) VALUES ($1, $2, $3, $4, $5)', [str(rt.from), str(rt.to), str(rt.room) || "all", str(rt.price), str(rt.note)]);
          counts.rates++;
        }
      }
      await audit("script", "import", "sheet", counts);
      return counts;
    },
  };
}

// singleton pool สำหรับ Vercel (อินสแตนซ์อยู่ยาว ใช้ pool เดิม)
let pgStore = null;
function getStore() {
  if (!dbEnabled()) return null;
  if (!pgStore) {
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
    pool.on("error", (e) => console.error(JSON.stringify({ event: "db_pool_error", reason: String((e && e.message) || e).slice(0, 120) })));
    pgStore = createStore((sql, params) => pool.query(sql, params));
  }
  return pgStore;
}

// สำหรับเทส: ฉีด store ที่ต่อ PGlite แทน pool จริง (ต้องตั้ง DATABASE_URL เป็นค่าอะไรก็ได้ให้ dbEnabled() เป็นจริง)
function __setStore(s) { pgStore = s; }

module.exports = { dbEnabled, getStore, createStore, __setStore, BOOKING_EDITABLE, ORDER_EDITABLE };
