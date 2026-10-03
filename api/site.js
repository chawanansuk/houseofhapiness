/**
 * GET /api/site — ค่าตั้งค่าเว็บสาธารณะจากชีตแท็บ "Site" (หรือฐานข้อมูล)
 *
 * ตอนนี้ส่งออกเฉพาะ "แถบประกาศหน้าแรก" (announcement_th / announcement_en)
 * นโยบาย rate parity (ต.ค. 2569): เว็บสาธารณะไม่แสดงราคาห้อง — ราคา 3 ห้องและเรทเทศกาลในชีต
 * ยังเก็บไว้ตามเดิม (price_per_night / price_studio / price_deluxe และแท็บ Rates) แต่ไม่ส่งออกทาง API สาธารณะนี้แล้ว
 * ถ้าวันหนึ่งตัดสินใจแสดงราคาบนเว็บ ให้เพิ่ม field กลับที่นี่ พร้อมแก้เทสต์ rate parity ใน tests/site.test.js
 *
 * เจ้าของแก้ในชีต → หน้าเว็บอัปเดตเองภายใน ~2 นาที (edge cache 120 วิ)
 */

const DEFAULTS = { ann: { th: "", en: "" } };
const { dbEnabled, getStore } = require("./_store.js");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url && !dbEnabled()) return res.status(200).json({ ok: true, ...DEFAULTS, source: "default" });

  try {
    let j;
    if (dbEnabled()) {
      try { j = await getStore().getSite(); } catch (e) { console.error(JSON.stringify({ event: "site_db_failed_fallback_sheet", reason: String((e && e.message) || e).slice(0, 160) })); }
    }
    if (!j && url) {
      const sep = url.includes("?") ? "&" : "?";
      const r = await fetch(`${url}${sep}action=site&token=${encodeURIComponent(token)}`, { redirect: "follow" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      j = await r.json();
      if (j && j.error) throw new Error(String(j.error)); // สคริปต์เก่ายังไม่รู้จัก action=site
      j.__sheet = true;
    }
    const s = (j && j.site) || {};
    return res.status(200).json({
      ok: true,
      ann: {
        th: String(s.announcement_th || "").trim().slice(0, 300),
        en: String(s.announcement_en || "").trim().slice(0, 300),
      },
      source: (dbEnabled() && j && !j.__sheet) ? "db" : "sheet",
    });
  } catch {
    return res.status(200).json({ ok: true, ...DEFAULTS, source: "default" });
  }
};
