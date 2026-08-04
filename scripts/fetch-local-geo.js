/**
 * รันตอน build บน Vercel (มีอินเทอร์เน็ตเต็ม): geocode สถานที่ในหน้า "กิน-เที่ยวรอบซอย"
 * ผ่าน Nominatim (OpenStreetMap) → เขียน public/data/local-geo.json ให้ Leaflet ใช้
 *
 * ใช้: node scripts/fetch-local-geo.js public/data
 * นโยบาย Nominatim: ยิงช้า ๆ (1.1 วิ/ครั้ง) + ระบุ User-Agent — ห้ามทำ build พัง (จบด้วย {} เสมอ)
 * พิกัดต้องอยู่ในกรอบคลองสาน ไม่งั้นทิ้ง (กัน geocode หลงไปจังหวัดอื่น)
 */

const fs = require("fs");
const path = require("path");

const BBOX = { latMin: 13.71, latMax: 13.75, lonMin: 100.48, lonMax: 100.52 };
const UA = "HouseOfHappinessSite/1.0 (https://houseofhappinessbangkok.com; houseofhapinessbangkok@gmail.com)";

// แต่ละ key ลอง query ตามลำดับจนกว่าจะเจอผลในกรอบ
const PLACES = {
  // จุดเดินเที่ยว
  hoh:        ["Tha Din Daeng Soi 16, Khlong San, Bangkok"],
  shrine:     ["ศาลเจ้าซำไนเก็ง คลองสาน", "Tha Din Daeng Soi 15, Khlong San, Bangkok"],
  market:     ["ตลาดท่าดินแดง คลองสาน กรุงเทพ", "Tha Din Daeng Market Bangkok"],
  pier_tdd:   ["ท่าเรือท่าดินแดง กรุงเทพ", "Tha Din Daeng Pier Bangkok"],
  watthong:   ["วัดทองนพคุณ คลองสาน", "Wat Thong Nopphakhun Bangkok"],
  park:       ["อุทยานเฉลิมพระเกียรติสมเด็จพระศรีนครินทราบรมราชชนนี กรุงเทพ", "Princess Mother Memorial Park Bangkok"],
  cheechin:   ["Chee Chin Khor Temple Bangkok", "มูลนิธิจีจินเกาะ กรุงเทพ"],
  jam:        ["The Jam Factory Bangkok"],
  watsuwan:   ["วัดสุวรรณ คลองสาน กรุงเทพ", "Wat Suwan Charoen Nakhon Bangkok"],
  pier_ks:    ["ท่าเรือคลองสาน กรุงเทพ", "Khlong San Pier Bangkok"],
  // ร้านอาหาร (ใช้บ้านเลขที่บนถนนท่าดินแดงเมื่อรู้)
  jok:        ["Tha Din Daeng Soi 16, Khlong San, Bangkok"],
  pungpung:   ["Tha Din Daeng Soi 16, Khlong San, Bangkok"],
  khaomudaeng:["377 Tha Din Daeng Road, Khlong San, Bangkok"],
  khamu:      ["Tha Din Daeng Soi 15, Khlong San, Bangkok"],
  khaoniao:   ["Tha Din Daeng Soi 13, Khlong San, Bangkok"],
  nomsod:     ["411 Tha Din Daeng Road, Khlong San, Bangkok", "นมสดท่าดินแดง"],
  bokkia:     ["323 Tha Din Daeng Road, Khlong San, Bangkok"],
  ponmaree:   ["282 Tha Din Daeng Road, Khlong San, Bangkok", "PonMaree Bakery Bangkok"],
  satay:      ["183 Tha Din Daeng Road, Khlong San, Bangkok"],
  ann:        ["167 Tha Din Daeng Road, Khlong San, Bangkok"],
  goose:      ["398 Tha Din Daeng Road, Khlong San, Bangkok"],
  rama:       ["61 Tha Din Daeng Road, Khlong San, Bangkok"],
  krua:       ["48 Tha Din Daeng Road, Khlong San, Bangkok", "ครัวท่าดินแดง"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inBox = (lat, lon) =>
  lat >= BBOX.latMin && lat <= BBOX.latMax && lon >= BBOX.lonMin && lon <= BBOX.lonMax;

async function geocode(q) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=3&q=" + encodeURIComponent(q);
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return null;
  const list = await r.json();
  for (const it of list || []) {
    const lat = Number(it.lat), lon = Number(it.lon);
    if (inBox(lat, lon)) return { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
  }
  return null;
}

(async () => {
  const outDir = process.argv[2] || "public/data";
  fs.mkdirSync(outDir, { recursive: true });
  const out = {};
  let okCount = 0;
  for (const [key, queries] of Object.entries(PLACES)) {
    for (const q of queries) {
      try {
        const hit = await geocode(q);
        await sleep(1100);
        if (hit) { out[key] = hit; okCount++; break; }
      } catch {}
    }
    if (!out[key]) console.log("geo-miss:", key);
  }
  fs.writeFileSync(path.join(outDir, "local-geo.json"), JSON.stringify(out));
  console.log(`local-geo: ${okCount}/${Object.keys(PLACES).length} จุด`);
})().catch((e) => {
  console.error("fetch-local-geo ล้ม (ไม่ทำให้ build พัง):", (e && e.message) || e);
  try {
    const outDir = process.argv[2] || "public/data";
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "local-geo.json"), "{}");
  } catch {}
});
