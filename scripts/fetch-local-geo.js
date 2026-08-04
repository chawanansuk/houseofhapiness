/**
 * รันตอน build บน Vercel (มีอินเทอร์เน็ตเต็ม): หาพิกัดสถานที่ในหน้า "กิน-เที่ยวรอบซอย"
 * → เขียน public/data/local-geo.json ให้ Leaflet ใช้
 *
 * วิธีหาพิกัด (v2 — แม่นขึ้น):
 *  1. จุดแลนด์มาร์ก (ศาลเจ้า/ตลาด/ท่าเรือ/วัด/สวน) → Nominatim ตามชื่อ (เชื่อถือได้)
 *  2. ร้านอาหารริมถนนท่าดินแดง → Nominatim หาเลขที่บ้านไม่ได้ (ตอบจุดกลางถนนซ้ำ ๆ)
 *     จึงดึง "เส้นถนนท่าดินแดงจริง" จาก Overpass API แล้ววางหมุดตามระยะเดิน
 *     จากปากซอย 16 ไล่ตามแนวถนน (ยึดหัวซอยที่มีใน OSM ก่อน ถ้าไม่มีจึงใช้ระยะเมตร)
 *
 * ใช้: node scripts/fetch-local-geo.js public/data
 * นโยบาย Nominatim: ยิงช้า ๆ (1.1 วิ/ครั้ง) + ระบุ User-Agent — ห้ามทำ build พัง (จบด้วย {} เสมอ)
 * พิกัดต้องอยู่ในกรอบคลองสาน ไม่งั้นทิ้ง (กัน geocode หลงไปจังหวัดอื่น)
 */

const fs = require("fs");
const path = require("path");

const BBOX = { latMin: 13.71, latMax: 13.75, lonMin: 100.48, lonMax: 100.52 };
const UA = "HouseOfHappinessSite/1.0 (https://houseofhappinessbangkok.com; houseofhapinessbangkok@gmail.com)";
const PIER_APPROX = { lat: 13.7352, lon: 100.5081 }; // ท่าเรือท่าดินแดง (ไว้เทียบทิศถนน)

// ── จุดแลนด์มาร์ก: geocode ตามชื่อ (ลอง query ตามลำดับจนเจอผลในกรอบ) ──
const LANDMARKS = {
  shrine:   ["ศาลเจ้าซำไนเก็ง คลองสาน", "Tha Din Daeng Soi 15, Khlong San, Bangkok"],
  market:   ["ตลาดท่าดินแดง คลองสาน กรุงเทพ", "Tha Din Daeng Market Bangkok"],
  pier_tdd: ["ท่าเรือท่าดินแดง กรุงเทพ", "Tha Din Daeng Pier Bangkok"],
  watthong: ["วัดทองนพคุณ คลองสาน", "Wat Thong Nopphakhun Bangkok"],
  park:     ["อุทยานเฉลิมพระเกียรติสมเด็จพระศรีนครินทราบรมราชชนนี กรุงเทพ", "Princess Mother Memorial Park Bangkok"],
  cheechin: ["Chee Chin Khor Temple Bangkok", "Che Chin Khor Bangkok", "247 Chiang Mai Road Khlong San Bangkok"],
  jam:      ["The Jam Factory Bangkok"],
  watsuwan: ["วัดสุวรรณ คลองสาน กรุงเทพ", "Wat Suwan Charoen Nakhon Bangkok"],
  pier_ks:  ["ท่าเรือคลองสาน กรุงเทพ", "Khlong San Pier Bangkok"],
};

// ── ร้านริมถนนท่าดินแดง: วางตามแนวถนน ──
// ลำดับความแม่น: หมุดร้านจริงใน OSM (re) > เลขที่บ้านจากป้าย addr ใน OSM (house)
//   > หัวซอยจาก OSM (soi) > ระยะเดินจากปากซอย 16 ไปทางลาดหญ้า (dist เมตร รวม ~60 ม.ในซอย)
// หมายเหตุทิศ: OSM ยืนยันว่าซอยเลขมาก (16) อยู่ใกล้ท่าเรือ เลขน้อย (9) อยู่ทางลาดหญ้า
// และเลขที่บ้านไล่จากฝั่งลาดหญ้า (48, 61) ขึ้นไปทางท่าเรือ (377, 411)
const SHOPS = [
  { key: "jok",         dist: 0,   soi: 16 },
  { key: "pungpung",    dist: 0,   soi: 16 },
  { key: "khaomudaeng", dist: 30,  house: 377 }, // ฝั่งตรงข้ามปากซอย 16
  { key: "khamu",       dist: 120, re: "ขาหมู.*สันต์|พี่สันต์" },
  { key: "nomsod",      dist: 130, house: 411, re: "นมสด.*ท่าดินแดง|Nomsod" },
  { key: "khaoniao",    dist: 150, soi: 13, re: "ข้าวเหนียวปิ้ง.*(กุ้ง|ท่าดินแดง)" },
  { key: "bokkia",      dist: 180, house: 323, soi: 11, re: "โบ๊กเกี้ย|บ๊กเกี๊ย|โบ๊เกี้ย" },
  { key: "ponmaree",    dist: 200, house: 282, re: "PonMaree|ปอนมารี|พรมารี" },
  { key: "ann",         dist: 280, house: 167, soi: 9, re: "แอน.*ท่าดินแดง" },
  { key: "satay",       dist: 250, house: 183, re: "สะเต๊ะ.*ท่าดินแดง|ตี๋.*สะเต๊ะ" },
  { key: "goose",       dist: 350, house: 398, re: "ฉั่วเจียบง้วน|ห่านพะโล้.*ท่าดินแดง" },
  { key: "krua",        dist: 780, house: 48,  re: "ครัวท่าดินแดง|Khrua Thadindaeng|Krua Tha Din Daeng" },
  { key: "rama",        dist: 850, house: 61,  re: "พระรามลงสรง" },
];

// สำรอง: ถ้าดึงเส้นถนนไม่สำเร็จ ใช้ Nominatim แบบเดิม (แม่นน้อยกว่าแต่ดีกว่าไม่มี)
const SHOP_FALLBACK = {
  jok:        ["Tha Din Daeng Soi 16, Khlong San, Bangkok"],
  pungpung:   ["Tha Din Daeng Soi 16, Khlong San, Bangkok"],
  khaomudaeng:["377 Tha Din Daeng Road, Khlong San, Bangkok"],
  khamu:      ["Tha Din Daeng Soi 15, Khlong San, Bangkok"],
  khaoniao:   ["Tha Din Daeng Soi 13, Khlong San, Bangkok"],
  nomsod:     ["นมสดท่าดินแดง", "411 Tha Din Daeng Road, Khlong San, Bangkok"],
  bokkia:     ["323 Tha Din Daeng Road, Khlong San, Bangkok"],
  ponmaree:   ["PonMaree Bakery Bangkok", "282 Tha Din Daeng Road, Khlong San, Bangkok"],
  satay:      ["183 Tha Din Daeng Road, Khlong San, Bangkok"],
  ann:        ["167 Tha Din Daeng Road, Khlong San, Bangkok"],
  goose:      ["398 Tha Din Daeng Road, Khlong San, Bangkok"],
  rama:       ["61 Tha Din Daeng Road, Khlong San, Bangkok"],
  krua:       ["ครัวท่าดินแดง", "48 Tha Din Daeng Road, Khlong San, Bangkok"],
};

/* ══ เครื่องมือเรขาคณิต ══ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inBox = (lat, lon) =>
  lat >= BBOX.latMin && lat <= BBOX.latMax && lon >= BBOX.lonMin && lon <= BBOX.lonMax;
const round6 = (p) => ({ lat: Number(p.lat.toFixed(6)), lon: Number(p.lon.toFixed(6)) });

// ระยะทางเมตรระหว่างสองพิกัด (haversine)
function havM(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// ต่อท่อนถนนหลายเส้น (OSM แบ่งถนนเป็นหลาย way) ให้เป็นเส้นเดียว แล้วคืนเส้นที่ยาวสุด
function stitchChains(geoms) {
  const chains = geoms.map((g) => g.slice());
  let merged = true;
  while (merged) {
    merged = false;
    outer:
    for (let i = 0; i < chains.length; i++) {
      for (let j = 0; j < chains.length; j++) {
        if (i === j) continue;
        const a = chains[i], b = chains[j];
        const joins = [
          [a[a.length - 1], b[0],            () => a.concat(b.slice(1))],
          [a[a.length - 1], b[b.length - 1], () => a.concat(b.slice(0, -1).reverse())],
          [a[0],            b[b.length - 1], () => b.slice(0, -1).concat(a)],
          [a[0],            b[0],            () => b.slice(1).reverse().concat(a)],
        ];
        for (const [p, q, doJoin] of joins) {
          if (havM(p, q) < 25) {
            chains[i] = doJoin();
            chains.splice(j, 1);
            merged = true;
            break outer;
          }
        }
      }
    }
  }
  let best = null, bestLen = 0;
  for (const c of chains) {
    let len = 0;
    for (let k = 1; k < c.length; k++) len += havM(c[k - 1], c[k]);
    if (len > bestLen) { bestLen = len; best = c; }
  }
  return { pts: best || [], len: bestLen };
}

// เส้นถนนพร้อมระยะสะสม: pointAt(d) = พิกัดที่ระยะ d เมตรจากต้นเส้น, distAlong(p) = ระยะสะสมของจุดใกล้สุด
function makeLine(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + havM(pts[i - 1], pts[i]));
  const total = cum[cum.length - 1];
  const pointAt = (d) => {
    d = Math.max(0, Math.min(total, d));
    let i = 1;
    while (i < cum.length && cum[i] < d) i++;
    if (i >= pts.length) return round6(pts[pts.length - 1]);
    const t = (d - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    return round6({
      lat: pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * t,
      lon: pts[i - 1].lon + (pts[i].lon - pts[i - 1].lon) * t,
    });
  };
  // ฉายจุดลงบนแต่ละช่วงของเส้น (ประมาณระนาบแบน — ระยะสั้นระดับกิโลเมตรพอ)
  const distAlong = (p) => {
    const mLat = 111320, mLon = 111320 * Math.cos((p.lat * Math.PI) / 180);
    let bestAt = 0, bestOff = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const ax = (pts[i - 1].lon - p.lon) * mLon, ay = (pts[i - 1].lat - p.lat) * mLat;
      const bx = (pts[i].lon - p.lon) * mLon, by = (pts[i].lat - p.lat) * mLat;
      const dx = bx - ax, dy = by - ay;
      const segLen2 = dx * dx + dy * dy;
      let t = segLen2 > 0 ? -(ax * dx + ay * dy) / segLen2 : 0;
      t = Math.max(0, Math.min(1, t));
      const px = ax + dx * t, py = ay + dy * t;
      const off = Math.sqrt(px * px + py * py);
      if (off < bestOff) { bestOff = off; bestAt = cum[i - 1] + Math.sqrt(segLen2) * t; }
    }
    return { at: bestAt, off: bestOff };
  };
  return { pts, total, pointAt, distAlong };
}

/* ══ แหล่งข้อมูลภายนอก ══ */
async function geocode(q) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=3&q=" + encodeURIComponent(q);
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return null;
  const list = await r.json();
  for (const it of list || []) {
    const lat = Number(it.lat), lon = Number(it.lon);
    if (inBox(lat, lon)) return round6({ lat, lon });
  }
  return null;
}

async function geocodeSet(dict, out) {
  for (const [key, queries] of Object.entries(dict)) {
    if (out[key]) continue;
    for (const q of queries) {
      try {
        const hit = await geocode(q);
        await sleep(1100);
        if (hit) { out[key] = hit; break; }
      } catch {}
    }
    if (!out[key]) console.log("geo-miss:", key);
  }
}

// ดึงจาก OSM ในคำขอเดียว: ถนน+ซอยท่าดินแดง, ป้ายเลขที่บ้านบนถนนนี้, ร้านตามชื่อ, ท่าเรือข้ามฟาก
async function overpassWays() {
  const bb = `(${BBOX.latMin},${BBOX.lonMin},${BBOX.latMax},${BBOX.lonMax})`;
  const nameRe = SHOPS.filter((s) => s.re).map((s) => s.re).join("|");
  const q = `[out:json][timeout:30];(` +
    `way["highway"]["name"~"ท่าดินแดง"]${bb};` +
    `nwr["addr:street"~"ท่าดินแดง"]["addr:housenumber"]${bb};` +
    `nwr["name"~"${nameRe}"]${bb};` +
    `nwr["amenity"="ferry_terminal"]${bb};` +
    `nwr["man_made"="pier"]["name"~"ท่าดินแดง"]${bb};` +
    `);out tags geom;`;
  const hosts = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  for (const host of hosts) {
    try {
      const r = await fetch(host, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
      });
      if (!r.ok) continue;
      const j = await r.json();
      if (j && Array.isArray(j.elements) && j.elements.length) return j.elements;
    } catch {}
  }
  return null;
}

// จุดตัวแทนของ element (node = ตรง ๆ, way = จุดกึ่งกลางเส้น/รูปทรง)
function elPoint(el) {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lon: el.lon };
  const g = el.geometry || [];
  if (!g.length) return null;
  let lat = 0, lon = 0;
  for (const p of g) { lat += p.lat; lon += p.lon; }
  return { lat: lat / g.length, lon: lon / g.length };
}

// โมเดลเลขที่บ้าน → ระยะบนถนน (เทียบจากป้าย addr ใน OSM ฝั่งเลขคู่/คี่เดียวกันก่อน)
function houseModel(anchors, line) {
  const list = anchors
    .map((a) => { const pa = line.distAlong(a.pt); return pa.off <= 80 ? { no: a.no, d: pa.at } : null; })
    .filter(Boolean)
    .sort((a, b) => a.no - b.no);
  return (no) => {
    const same = list.filter((a) => a.no % 2 === no % 2);
    const use = same.length >= 2 ? same : list;
    if (use.length < 2) {
      const exactOnly = use.find((a) => a.no === no);
      return exactOnly ? exactOnly.d : null;
    }
    const exact = use.find((a) => a.no === no);
    if (exact) return exact.d;
    let lo = null, hi = null;
    for (const a of use) {
      if (a.no <= no && (!lo || a.no > lo.no)) lo = a;
      if (a.no >= no && (!hi || a.no < hi.no)) hi = a;
    }
    if (!lo) { lo = use[0]; hi = use[1]; }
    else if (!hi) { hi = use[use.length - 1]; lo = use[use.length - 2]; }
    if (hi.no === lo.no) return lo.d;
    return lo.d + ((hi.d - lo.d) * (no - lo.no)) / (hi.no - lo.no);
  };
}

/* ══ วางหมุดร้านตามแนวถนน ══ */
function placeShopsOnRoad(elements, out) {
  const mainGeoms = [], soiWays = [], anchors = [], pois = {}, ferries = [];
  for (const el of elements || []) {
    const tags = el.tags || {};
    const name = [tags.name, tags["name:th"], tags["name:en"], tags.alt_name].filter(Boolean).join(" | ");
    const isRoad = tags.highway && /ท่าดินแดง/.test(tags.name || "");
    if (isRoad) {
      const geom = (el.geometry || []).map((g) => ({ lat: g.lat, lon: g.lon }));
      if (geom.length < 2) continue;
      const m = (tags.name || "").match(/(\d+)(?:\/\d+)?\s*$/); // ชื่อลงท้ายด้วยเลข = ซอย
      if (m) soiWays.push({ num: Number(m[1]), geom });
      else mainGeoms.push(geom);
      continue;
    }
    const pt = elPoint(el);
    if (!pt || !inBox(pt.lat, pt.lon)) continue;
    // ป้ายเลขที่บ้านบนถนนท่าดินแดง
    if (/ท่าดินแดง/.test(tags["addr:street"] || "") && tags["addr:housenumber"]) {
      const no = parseInt(String(tags["addr:housenumber"]), 10);
      if (Number.isFinite(no) && no > 0) anchors.push({ no, pt });
    }
    // ท่าเรือข้ามฟาก
    if (tags.amenity === "ferry_terminal" || tags.man_made === "pier") {
      ferries.push({ name, pt });
    }
    // ร้านตามชื่อ (ร้านแรกที่ regex ตรงชนะ)
    if (name) {
      for (const s of SHOPS) {
        if (s.re && !pois[s.key] && new RegExp(s.re, "i").test(name)) pois[s.key] = round6(pt);
      }
    }
  }
  if (!mainGeoms.length) return false;

  const chain = stitchChains(mainGeoms);
  if (chain.len < 500) return false; // สั้นผิดปกติ = ต่อเส้นไม่สำเร็จ

  // ให้ระยะ 0 อยู่ฝั่งท่าเรือเสมอ
  const pierRef = out.pier_tdd || PIER_APPROX;
  let pts = chain.pts;
  if (havM(pts[pts.length - 1], pierRef) < havM(pts[0], pierRef)) pts = pts.slice().reverse();
  const line = makeLine(pts);

  // หัวซอย = ปลายซอยที่ชิดถนนหลักที่สุด (รับเมื่อห่างไม่เกิน 40 ม.)
  const sois = {};
  for (const w of soiWays) {
    const ends = [w.geom[0], w.geom[w.geom.length - 1]];
    const cand = ends.map((p, idx) => ({ idx, p, ...line.distAlong(p) }))
      .sort((x, y) => x.off - y.off)[0];
    if (cand.off <= 40 && (!sois[w.num] || cand.off < sois[w.num].off)) {
      sois[w.num] = { d: cand.at, off: cand.off, junction: round6(cand.p), geom: w.geom, endIdx: cand.idx };
    }
  }

  // ตำแหน่งปากซอย 16: จาก OSM ตรง ๆ > เทียบจากซอยข้างเคียง (ซอยเลขน้อยอยู่ทางลาดหญ้า = d มาก)
  let d16 = sois[16] ? sois[16].d : null;
  if (d16 == null) {
    for (const [num, gap] of [[14, 60], [13, 50], [11, 155], [9, 210]]) {
      if (sois[num]) { d16 = sois[num].d - gap; break; } // gap = ซอยนั้นอยู่ใต้ซอย 16 กี่เมตร
    }
  }
  if (d16 == null) d16 = 260; // ค่าที่วัดจริงจาก OSM รอบก่อน
  d16 = Math.max(30, Math.min(line.total - 30, d16));

  const houseD = houseModel(anchors, line);
  const methods = [];
  for (const s of SHOPS) {
    let p = null, how = "";
    if (pois[s.key]) { p = pois[s.key]; how = "ร้านจริง"; }
    if (!p && s.house != null) {
      const d = houseD(s.house);
      if (d != null) { p = line.pointAt(d); how = `บ้านเลขที่ ${s.house}`; }
    }
    if (!p && s.soi && sois[s.soi]) { p = sois[s.soi].junction; how = `หัวซอย ${s.soi}`; }
    if (!p) {
      // ระยะเดินจากที่พัก (หัก ~60 ม.ในซอย) ไล่ไปทางลาดหญ้า = d เพิ่ม
      p = line.pointAt(d16 + Math.max(0, s.dist - 60));
      how = "ระยะเดิน";
    }
    out[s.key] = p;
    methods.push(`${s.key}=${how}`);
  }

  // ท่าเรือท่าดินแดง: หมุด ferry_terminal ชื่อตรง > ferry ใกล้ปลายถนนฝั่งท่าเรือ
  // > ถ้าค่าจาก Nominatim ห่างปลายถนนเกิน 300 ม. ให้ย้ายมาปลายถนน (ท่าเรืออยู่สุดถนนตามนิยาม)
  const roadEnd = line.pointAt(0);
  const named = ferries.find((f) => /ท่าดินแดง|Din Daeng/i.test(f.name));
  const near = ferries.filter((f) => havM(f.pt, roadEnd) < 200)
    .sort((a, b) => havM(a.pt, roadEnd) - havM(b.pt, roadEnd))[0];
  if (named) out.pier_tdd = round6(named.pt);
  else if (near) out.pier_tdd = round6(near.pt);
  else if (!out.pier_tdd || havM(out.pier_tdd, roadEnd) > 300) {
    console.log("pier_tdd: ใช้ปลายถนนแทน (Nominatim ห่าง " +
      (out.pier_tdd ? Math.round(havM(out.pier_tdd, roadEnd)) : "-") + " ม.)");
    out.pier_tdd = roadEnd;
  }

  // ที่พักอยู่ "ใน" ซอย 16: ถ้า OSM มีเส้นซอย เดินเข้าไป 60 ม. ไม่งั้นใช้ปากซอย
  if (sois[16] && sois[16].geom.length >= 2) {
    let sg = sois[16].geom;
    if (sois[16].endIdx === 1) sg = sg.slice().reverse(); // ให้จุดแรกคือปากซอย
    out.hoh = makeLine(sg).pointAt(60);
  } else {
    out.hoh = line.pointAt(d16);
  }

  console.log(`road: ${Math.round(line.total)}m · sois: ${Object.keys(sois).sort((a, b) => a - b).join(",") || "-"} · d16=${Math.round(d16)}m · addr:${anchors.length} ป้าย · ferry:${ferries.length}`);
  console.log("วิธีวางหมุด: " + methods.join(", "));
  return true;
}

/* ══ งานหลัก ══ */
async function main() {
  const outDir = process.argv[2] || "public/data";
  fs.mkdirSync(outDir, { recursive: true });
  const out = {};

  await geocodeSet(LANDMARKS, out);

  let onRoad = false;
  try {
    const elements = await overpassWays();
    onRoad = placeShopsOnRoad(elements, out);
  } catch (e) {
    console.log("overpass ล้ม:", (e && e.message) || e);
  }
  if (!onRoad) {
    console.log("ใช้ Nominatim สำรองสำหรับร้าน (แม่นน้อยกว่า)");
    await geocodeSet(SHOP_FALLBACK, out);
  }

  fs.writeFileSync(path.join(outDir, "local-geo.json"), JSON.stringify(out));
  const total = Object.keys(LANDMARKS).length + SHOPS.length + 1; // +1 = hoh
  console.log(`local-geo: ${Object.keys(out).length}/${total} จุด (${onRoad ? "หมุดร้านตามแนวถนนจริง" : "หมุดร้านแบบสำรอง"})`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("fetch-local-geo ล้ม (ไม่ทำให้ build พัง):", (e && e.message) || e);
    try {
      const outDir = process.argv[2] || "public/data";
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "local-geo.json"), "{}");
    } catch {}
  });
} else {
  module.exports = { havM, stitchChains, makeLine, placeShopsOnRoad, SHOPS, LANDMARKS };
}
