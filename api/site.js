/**
 * GET /api/site — ค่าตั้งค่าเว็บจากชีตแท็บ "Site" + เรทช่วงเทศกาลจากแท็บ "Rates"
 * (ข้อมูลสาธารณะ: ราคา 3 ห้อง / ประกาศ / เรทตามช่วงวันที่)
 *
 * เจ้าของแก้ในชีต → หน้าเว็บอัปเดตเองภายใน ~2 นาที (edge cache 120 วินาที)
 * ถ้ายังไม่ได้ตั้งค่าชีต หรือสคริปต์ยังเป็นเวอร์ชันเก่า → ตอบค่า default เว็บไม่พัง
 */

// prices: key ตรงกับ id ห้องบนหน้าเว็บ (std=Standard, stu=Studio, dlx=Deluxe)
const DEFAULTS = {
  price: 700, // ราคาห้อง Standard — คงไว้ให้หน้าเว็บเวอร์ชันเก่าที่ยังอ่าน j.price
  prices: { std: 700, stu: 800, dlx: 850 },
  rates: [],
  ann: { th: "", en: "" },
};

const ROOM_KEYS = ["std", "stu", "dlx", "all"];
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const toPrice = (v, fallback) => {
  const n = Number(String(v == null ? "" : v).replace(/[^\d.]/g, ""));
  return n >= 100 && n <= 100000 ? Math.round(n) : fallback;
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url) return res.status(200).json({ ok: true, ...DEFAULTS, source: "default" });

  try {
    const sep = url.includes("?") ? "&" : "?";
    const r = await fetch(`${url}${sep}action=site&token=${encodeURIComponent(token)}`, { redirect: "follow" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (j && j.error) throw new Error(String(j.error)); // สคริปต์เก่ายังไม่รู้จัก action=site
    const s = (j && j.site) || {};
    const prices = {
      std: toPrice(s.price_per_night, DEFAULTS.prices.std),
      stu: toPrice(s.price_studio, DEFAULTS.prices.stu),
      dlx: toPrice(s.price_deluxe, DEFAULTS.prices.dlx),
    };
    // เรทช่วงเทศกาล — กรองเฉพาะแถวที่ครบและถูกต้อง แถวเสียไม่ทำให้เว็บพัง
    const rates = (Array.isArray(j.rates) ? j.rates : [])
      .filter((rt) => rt && isYmd(rt.from) && isYmd(rt.to) && rt.from <= rt.to &&
        ROOM_KEYS.includes(rt.room) && toPrice(rt.price, 0) > 0)
      .slice(0, 100)
      .map((rt) => ({
        from: rt.from,
        to: rt.to,
        room: rt.room,
        price: toPrice(rt.price, 0),
        note: String(rt.note || "").trim().slice(0, 120),
      }));
    return res.status(200).json({
      ok: true,
      price: prices.std,
      prices,
      rates,
      ann: {
        th: String(s.announcement_th || "").trim().slice(0, 300),
        en: String(s.announcement_en || "").trim().slice(0, 300),
      },
      source: "sheet",
    });
  } catch {
    return res.status(200).json({ ok: true, ...DEFAULTS, source: "default" });
  }
};
