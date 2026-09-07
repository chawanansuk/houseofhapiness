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

// ทำความสะอาด DATABASE_URL ที่คัดลอกมาจาก Supabase: ตัดช่องว่าง/เครื่องหมายคำพูด และ encode รหัสผ่านที่มีอักขระพิเศษ (@ # / % ฯลฯ)
// คืน { connectionString } หรือ { error: "placeholder" | "invalid-url" } — ไม่เคยพิมพ์ค่าจริงลง log
function parseDbUrl(raw) {
  let s = String(raw == null ? "" : raw).trim().replace(/^["']|["']$/g, "").trim();
  if (!s) return { error: "missing" };
  if (/\[YOUR-PASSWORD\]|YOUR-PASSWORD|\[password\]/i.test(s)) return { error: "placeholder" };
  // แยกด้วย @ ตัวสุดท้าย (รหัสผ่านอาจมี @ เอง) แล้ว encode รหัสผ่านถ้ามีอักขระที่ URL ไม่รับ
  const m = s.match(/^(postgres(?:ql)?:\/\/)(.*)$/i);
  if (!m) return { error: "invalid-url" };
  const at = m[2].lastIndexOf("@");
  if (at < 0) { try { new URL(s); return { connectionString: s }; } catch (_) { return { error: "invalid-url" }; } }
  const cred = m[2].slice(0, at), host = m[2].slice(at + 1);
  const c = cred.indexOf(":");
  const user = c < 0 ? cred : cred.slice(0, c);
  let pass = c < 0 ? "" : cred.slice(c + 1);
  let repaired = false;
  const badEncoding = /%/.test(pass) && !/^(?:[^%]|%[0-9A-Fa-f]{2})*$/.test(pass);
  if (/[@#\/?\s\[\]]/.test(pass) || badEncoding) { pass = encodeURIComponent(pass); repaired = true; }
  const fixed = `${m[1]}${user}${c < 0 ? "" : ":" + pass}@${host}`;
  try { const u = new URL(fixed); if (!u.hostname) throw 0; return repaired ? { connectionString: fixed, repaired: true } : { connectionString: fixed }; }
  catch (_) { return { error: "invalid-url" }; }
}
function dbConfigError() { const p = parseDbUrl(process.env.DATABASE_URL); return p.error || null; }

function createStore(query) {
  let schemaReady = null;
  const ensureSchema = () => {
    if (!schemaReady) {
      schemaReady = (async () => {
        // ทางลัด 1 คำสั่ง: ถ้าตารางสุดท้ายในไฟล์ (audit_log) มีแล้ว = สร้างครบแล้ว ข้ามทั้งชุด
        // (ไม่งั้นทุกอินสแตนซ์ใหม่ต้องยิง CREATE/seed ~16 ครั้ง ครั้งละหนึ่งรอบวิ่งไป-กลับฐานข้อมูล)
        // ⚠ เพิ่มตารางใหม่ใน schema.sql ต้องมาแก้ชื่อตารางที่เช็คตรงนี้ด้วย
        try {
          const have = await query("SELECT to_regclass('public.audit_log') AS t");
          if (have.rows[0] && have.rows[0].t) return;
        } catch (_) { /* เช็คไม่ได้ก็สร้างตามปกติ */ }
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

  const pick = (cols, row) => cols.map((c) => str(row[c]));

  // เพิ่มแถวใหม่แบบ atomic: id แบบเดิม (WEB-yyMMddHHmmss) แต่ถ้าชนกัน (สองคนจองวินาทีเดียวกัน)
  // จะลองต่อท้าย -2, -3, … จน INSERT สำเร็จจริง — ห้ามคืน id ที่ไม่ได้เขียน มิฉะนั้นการจองจะหายเงียบ ๆ
  async function insertWithFreshId(table, cols, rec, prefix) {
    const explicit = str(rec.id);
    const base = explicit || `${prefix}-${idStamp()}`;
    for (let i = 0; i < 25; i++) {
      const id = i === 0 ? base : (explicit ? `${base}-${i + 1}` : `${base}-${i + 1}`);
      const r = await query(
        `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map((_, j) => `$${j + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING RETURNING id`,
        pick(cols, { ...rec, id }),
      );
      if (r.rows.length) return id;
      if (explicit) return id; // ระบุ id มาเองและมีอยู่แล้ว = ตั้งใจให้ idempotent (นำเข้าจากชีต)
    }
    throw new Error(`${table}: could not allocate id`);
  }

  let bootstrapTried = false;
  let lastSyncAt = 0;
  const SYNC_INTERVAL_MS = 120 * 1000;
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
      const rec = { ...row, nights: nightsOf(str(row.checkin), str(row.checkout)) || str(row.nights), created: str(row.created) || stamp(), rooms: str(row.rooms) || "1", status: str(row.status) || "รอยืนยัน" };
      const id = await insertWithFreshId("bookings", BOOKING_COLS, rec, "WEB");
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
      const rec = { ...x, date: str(x.date) || stamp().slice(0, 10), category: str(x.category) || "อื่นๆ", created: str(x.created) || stamp() };
      const id = await insertWithFreshId("expenses", EXP_COLS, rec, "EXP");
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
      const rec = { ...o, created: str(o.created) || stamp(), status: str(o.status) || "รอยืนยัน", lang: str(o.lang) || "th" };
      const id = await insertWithFreshId("orders", ORDER_COLS, rec, "RS");
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

    // ซิงก์จากชีตระหว่างช่วงเปลี่ยนผ่าน: Apps Script ยังเขียนอีเมลจอง Booking.com ลงชีตอยู่
    // - แถวใหม่ (id ยังไม่มีในฐานข้อมูล) → เพิ่ม
    // - แถวเดิม → เติมเฉพาะช่องที่ฐานข้อมูลยังว่างและชีตมีค่า (ชื่อ/วัน/ผู้พัก/ยอด ที่สแกนเนอร์เติมทีหลัง)
    //           และรับสถานะ "ยกเลิก" จากอีเมลยกเลิก (ฐานข้อมูลยังไม่ยกเลิก)
    // - ค่าที่แก้ในหลังบ้าน (ห้อง/สถานะเช็คอิน/ชำระ) ไม่ถูกทับ
    async syncFromSheet(list) {
      await ensureSchema();
      const out = { added: 0, backfilled: 0, cancelled: 0, rooms: 0, expenses: 0, orders: 0 };
      const existing = new Map((await query("SELECT id, name, checkin, checkout, guests, rooms, amount, status, note FROM bookings")).rows.map((r) => [r.id, r]));
      for (const b of (list && list.bookings) || []) {
        const id = str(b.id); if (!id) continue;
        const cur = existing.get(id);
        if (!cur) {
          await query(`INSERT INTO bookings (${BOOKING_COLS.join(",")}) VALUES (${BOOKING_COLS.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING`, pick(BOOKING_COLS, b));
          out.added++; continue;
        }
        const fields = {};
        for (const k of ["name", "checkin", "checkout", "guests", "rooms", "amount"]) if (!str(cur[k]) && str(b[k])) fields[k] = str(b[k]);
        if (/ยกเลิก|cancel/i.test(str(b.status)) && !/ยกเลิก|cancel/i.test(str(cur.status))) { fields.status = "ยกเลิก"; if (str(b.note) && str(b.note) !== str(cur.note)) fields.note = str(b.note); out.cancelled++; }
        if (Object.keys(fields).length) {
          const keys = Object.keys(fields), vals = keys.map((k) => fields[k]);
          const ci = fields.checkin || cur.checkin, co = fields.checkout || cur.checkout;
          const sets = keys.map((k, i) => `${k} = $${i + 2}`);
          if (fields.checkin || fields.checkout) { sets.push(`nights = $${keys.length + 2}`); vals.push(nightsOf(ci, co)); }
          await query(`UPDATE bookings SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`, [id, ...vals]);
          if (!fields.status) out.backfilled++;
          await audit("script", "sync", id, fields);
        }
      }
      for (const rm of (list && list.rooms) || []) {
        if (!str(rm.room)) continue;
        const r = await query("INSERT INTO rooms (room, clean, note, sort) VALUES ($1, $2, $3, 99) ON CONFLICT (room) DO NOTHING", [str(rm.room), str(rm.clean) || "สะอาด", str(rm.note)]);
        out.rooms += r.rowCount == null ? 1 : r.rowCount;
      }
      for (const e of (list && list.expenses) || []) {
        if (!str(e.id)) continue;
        const r = await query(`INSERT INTO expenses (${EXP_COLS.join(",")}) VALUES (${EXP_COLS.map((_, j) => `$${j + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING`, pick(EXP_COLS, e));
        out.expenses += r.rowCount == null ? 1 : r.rowCount;
      }
      for (const o of (list && list.orders) || []) {
        if (!str(o.id)) continue;
        const r = await query(`INSERT INTO orders (${ORDER_COLS.join(",")}) VALUES (${ORDER_COLS.map((_, j) => `$${j + 1}`).join(",")}) ON CONFLICT (id) DO NOTHING`, pick(ORDER_COLS, o));
        out.orders += r.rowCount == null ? 1 : r.rowCount;
      }
      return out;
    },

    // ค่าตั้งค่าเว็บ + เรทเทศกาล: เจ้าของยังแก้ในชีต (แท็บ Site/Rates) เป็นหลัก → ชีตเป็นตัวจริงของสองตารางนี้
    async syncSiteFromSheet(site) {
      if (!site) return { site: 0, rates: 0 };
      const out = { site: 0, rates: 0 };
      for (const [k, v] of Object.entries(site.site || {})) {
        await query("INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [str(k), str(v)]);
        out.site++;
      }
      if (Array.isArray(site.rates)) {
        await query("DELETE FROM rates");
        for (const rt of site.rates) {
          if (!str(rt.from) || !str(rt.to) || !str(rt.price)) continue;
          await query('INSERT INTO rates ("from", "to", room, price, note) VALUES ($1, $2, $3, $4, $5)', [str(rt.from), str(rt.to), str(rt.room) || "all", str(rt.price), str(rt.note)]);
          out.rates++;
        }
      }
      return out;
    },

    // เรียกจาก /api/data: ซิงก์จากชีตอย่างมากทุก 2 นาที (อีเมลจองใหม่จาก Apps Script ถึงฐานข้อมูลภายใน ~2 นาทีหลังสแกน)
    async syncFromSheetIfStale(opts = {}) {
      const url = (opts.url != null ? opts.url : (process.env.SHEET_WEBAPP_URL || "")).trim();
      const token = (opts.token != null ? opts.token : (process.env.SHEET_TOKEN || "")).trim();
      if (!url || !token) return null;
      const now = Date.now();
      if (now - lastSyncAt < (opts.minIntervalMs != null ? opts.minIntervalMs : SYNC_INTERVAL_MS)) return null;
      lastSyncAt = now;
      const f = opts.fetchImpl || fetch;
      try {
        const sep = url.includes("?") ? "&" : "?";
        const get = async (action) => {
          const r = await f(`${url}${sep}action=${action}&token=${encodeURIComponent(token)}&_ts=${now}`, { redirect: "follow" });
          if (!r.ok) throw new Error(`sheet ${action} http-${r.status}`);
          return r.json();
        };
        const [list, site] = await Promise.all([get("list"), get("site").catch(() => null)]);
        if (!Array.isArray(list && list.bookings)) throw new Error("sheet list invalid");
        const out = await this.syncFromSheet(list);
        // แท็บ Site/Rates: เจ้าของแก้ในชีตแล้วเว็บต้องอัปเดตตาม (ประกาศหน้าแรก/ราคา/เรทเทศกาล)
        if (site && !site.error) Object.assign(out, await this.syncSiteFromSheet(site));
        if (out.added || out.backfilled || out.cancelled || out.orders) console.info(JSON.stringify({ event: "db_sync_from_sheet", ...out }));
        return out;
      } catch (e) {
        lastSyncAt = now - SYNC_INTERVAL_MS + 30000; // ล้มเหลว → ลองใหม่ใน 30 วิ
        console.error(JSON.stringify({ event: "db_sync_failed", reason: String((e && e.message) || e).slice(0, 160) }));
        return null;
      }
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
    const parsed = parseDbUrl(process.env.DATABASE_URL);
    if (parsed.error) throw new Error(`database-url-${parsed.error}`);
    if (parsed.repaired) console.info(JSON.stringify({ event: "db_url_repaired", note: "password url-encoded automatically" }));
    const pool = new Pool({
      connectionString: parsed.connectionString,
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

module.exports = { dbEnabled, dbConfigError, parseDbUrl, getStore, createStore, __setStore, BOOKING_EDITABLE, ORDER_EDITABLE };
