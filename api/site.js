/**
 * GET /api/site — ค่าตั้งค่าเว็บจากชีตแท็บ "Site" (ข้อมูลสาธารณะ: ราคา/ประกาศ)
 *
 * เจ้าของแก้ในชีต → หน้าเว็บอัปเดตเองภายใน ~2 นาที (edge cache 120 วินาที)
 * ถ้ายังไม่ได้ตั้งค่าชีต หรือสคริปต์ยังเป็นเวอร์ชันเก่า → ตอบค่า default เว็บไม่พัง
 */

const DEFAULTS = { price: 700, ann: { th: "", en: "" } }; // price = ราคาห้อง Standard (ราคาเริ่มต้น)

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
    const price = Number(String(s.price_per_night || "").replace(/[^\d.]/g, "")) || DEFAULTS.price;
    return res.status(200).json({
      ok: true,
      price,
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
