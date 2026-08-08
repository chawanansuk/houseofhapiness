/**
 * fetch-fonts.js — ดึงฟอนต์จาก Google Fonts มาเก็บไว้ในเว็บเราเองตอน build
 *
 * ทำไมต้องทำ: เดิมเบราว์เซอร์ต้องต่อไปอีก 2 โดเมน (fonts.googleapis.com เอา CSS
 * แล้วต่อ fonts.gstatic.com เอาไฟล์ฟอนต์) กว่าจะได้ตัวอักษรจริงมาแสดง
 * แต่ละโดเมนเสียเวลา DNS + TLS ใหม่หมด ซึ่งบนมือถือเน็ตช้าคือครึ่งวินาทีขึ้นไป
 * ย้ายมาไว้โดเมนเดียวกับเว็บ = ใช้การเชื่อมต่อเดิมที่เปิดอยู่แล้ว ไม่ต้องรออะไรเพิ่ม
 *
 * ใช้: node scripts/fetch-fonts.js <โฟลเดอร์ assets>
 * ผลลัพธ์: <assets>/fonts.css + <assets>/fonts/*.woff2
 *
 * ถ้าโหลดไม่สำเร็จ (เน็ตล่ม/Google เปลี่ยนรูปแบบ) จะเขียน fonts.css ที่ชี้กลับไป
 * Google ตามเดิม — เว็บยังได้ฟอนต์ครบ แค่ช้าเท่าของเดิม ไม่พังแน่นอน
 */

const fs = require("fs");
const path = require("path");

// ชุดน้ำหนักที่เว็บใช้จริง (ตรวจจาก style.css แล้ว)
//   Playfair Display 700 — หัวข้อใหญ่ (เดิมโหลด 600 กับตัวเอียงมาด้วยแต่ไม่ได้ใช้เลย)
//   Prompt 500/600/700 — หัวข้อและปุ่ม
//   Sarabun 400/500/600/700 — เนื้อความ (600 ใช้ในหน้า /admin)
const QUERY = [
  "family=Playfair+Display:wght@700",
  "family=Prompt:wght@500;600;700",
  "family=Sarabun:wght@400;500;600;700",
  "display=swap",
].join("&");
const CSS_URL = `https://fonts.googleapis.com/css2?${QUERY}`;

// ต้องส่ง User-Agent เป็นเบราว์เซอร์ใหม่ ไม่งั้น Google จะตอบเป็น .ttf ซึ่งใหญ่กว่า woff2 หลายเท่า
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const FALLBACK_CSS =
  "/* โหลดฟอนต์มาเก็บเองไม่สำเร็จตอน build — ใช้ Google Fonts ตามเดิม เว็บยังแสดงผลครบ */\n" +
  `@import url("${CSS_URL}");\n`;

const outDir = process.argv[2] || "assets";
const fontDir = path.join(outDir, "fonts");
const cssPath = path.join(outDir, "fonts.css");

function slug(s) {
  return String(s).toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function get(url, asBuffer) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  return asBuffer ? Buffer.from(await r.arrayBuffer()) : r.text();
}

async function main() {
  if (typeof fetch !== "function") throw new Error("Node เวอร์ชันนี้ไม่มี fetch");

  const css = await get(CSS_URL, false);
  if (!/@font-face/.test(css)) throw new Error("CSS ที่ได้ไม่มี @font-face");

  fs.mkdirSync(fontDir, { recursive: true });

  // Google ใส่คอมเมนต์ชื่อ subset (/* thai */, /* latin */) ไว้หน้าทุกบล็อก — เก็บไว้ตั้งชื่อไฟล์
  const blocks = [];
  const re = /(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) blocks.push({ subset: m[1] || "x", body: m[2] });
  if (!blocks.length) throw new Error("แยกบล็อก @font-face ไม่ได้");

  let out = "/* ฟอนต์เก็บไว้ในเว็บเราเอง — สร้างอัตโนมัติโดย scripts/fetch-fonts.js ห้ามแก้มือ */\n";
  let downloaded = 0, bytes = 0;
  const seen = new Set();

  for (const b of blocks) {
    const family = (b.body.match(/font-family:\s*([^;]+);/) || [])[1] || "";
    const weight = (b.body.match(/font-weight:\s*([^;]+);/) || [])[1] || "400";
    const style = (b.body.match(/font-style:\s*([^;]+);/) || [])[1] || "normal";
    const url = (b.body.match(/url\(([^)]+)\)/) || [])[1];
    if (!url) continue;

    let name = `${slug(family)}-${slug(weight)}${style.trim() === "italic" ? "-i" : ""}-${slug(b.subset)}.woff2`;
    // กันชื่อชนกันเอง (subset เดียวกันโผล่ซ้ำ) — เติมเลขต่อท้าย
    let n = 2;
    while (seen.has(name)) name = name.replace(/(\.woff2)$/, `-${n++}$1`);
    seen.add(name);

    const buf = await get(url.replace(/['"]/g, ""), true);
    fs.writeFileSync(path.join(fontDir, name), buf);
    downloaded++; bytes += buf.length;

    // เขียนบล็อกใหม่โดยชี้ไปไฟล์ในเว็บเรา (path สัมพัทธ์กับ assets/fonts.css)
    out += "@font-face{" +
      b.body
        .replace(/url\([^)]+\)/, `url("fonts/${name}")`)
        .replace(/\s*\n\s*/g, "")
        .trim() +
      "}\n";
  }

  if (!downloaded) throw new Error("ไม่ได้ไฟล์ฟอนต์เลย");

  fs.writeFileSync(cssPath, out);
  console.log(`fetch-fonts: ได้ฟอนต์ ${downloaded} ไฟล์ (${Math.round(bytes / 1024)} KB) → ${cssPath}`);
}

main().catch((e) => {
  console.warn("fetch-fonts: ไม่สำเร็จ — ใช้ Google Fonts ตามเดิม:", (e && e.message) || e);
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(cssPath, FALLBACK_CSS);
  } catch (e2) {
    console.warn("fetch-fonts: เขียนไฟล์สำรองไม่ได้:", (e2 && e2.message) || e2);
  }
  // ห้าม build ล้มเพราะเรื่องฟอนต์
  process.exit(0);
});
