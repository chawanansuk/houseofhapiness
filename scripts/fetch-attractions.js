#!/usr/bin/env node
/**
 * รันตอน build บน Vercel: ดึงรูปแหล่งท่องเที่ยวจาก Wikipedia/Wikimedia Commons
 * (ย่อเหลือกว้าง 900px) + ดึงข้อมูลไลเซนส์/ผู้ถ่าย มาเขียน credits.json
 * เพื่อให้หน้า attractions.html แสดงเครดิตรูปได้ถูกต้องตามสัญญา CC
 *
 * ใช้: node scripts/fetch-attractions.js <output-dir>
 * ออกแบบให้ "ห้ามทำ build พัง" — รูปไหนดึงไม่ได้ก็ข้าม (หน้าเว็บซ่อนรูปที่หายเอง)
 */

const fs = require("fs");
const path = require("path");

const OUT = process.argv[2] || "public/images/attractions";

// slug = ชื่อไฟล์ปลายทาง, titles = ชื่อบทความ Wikipedia ที่ลองตามลำดับ ("th:" = วิกิไทย)
const ITEMS = [
  { slug: "iconsiam",   titles: ["Iconsiam", "ICONSIAM"] },
  { slug: "skypark",    titles: ["Chao Phraya Sky Park", "th:สวนลอยฟ้าเจ้าพระยา"] },
  { slug: "watarun",    titles: ["Wat Arun"] },
  { slug: "watpho",     titles: ["Wat Pho"] },
  { slug: "grandpalace",titles: ["Grand Palace"] },
  { slug: "yaowarat",   titles: ["Yaowarat Road"] },
  { slug: "pakkhlong",  titles: ["Pak Khlong Talat"] },
  { slug: "riverboat",  titles: ["Chao Phraya Express Boat"] },
  { slug: "kudichin",   titles: ["Santa Cruz Church, Bangkok", "Santa Cruz Church (Bangkok)", "Kudi Chin", "th:โบสถ์ซางตาครู้ส"] },
];

const UA = "HouseOfHappinessSite/1.0 (hotel website build; houseofhapinessbangkok@gmail.com)";

async function getJSON(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" }, redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

async function download(url, dest) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 5000) throw new Error(`file too small (${buf.length}b) ${url}`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

const stripHTML = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function summaryFor(title) {
  const th = title.startsWith("th:");
  const host = th ? "th.wikipedia.org" : "en.wikipedia.org";
  const t = encodeURIComponent((th ? title.slice(3) : title).replace(/ /g, "_"));
  return getJSON(`https://${host}/api/rest_v1/page/summary/${t}?redirect=true`);
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const credits = [];

  for (const item of ITEMS) {
    let done = false;
    for (const title of item.titles) {
      try {
        const sum = await summaryFor(title);
        const orig = sum.originalimage && sum.originalimage.source;
        if (!orig) continue;

        // ชื่อไฟล์บน Commons = ส่วนท้ายของ URL ต้นฉบับ
        const fname = decodeURIComponent(orig.split("/").pop());

        // ขอรูปย่อกว้าง 900px ผ่าน Special:FilePath (redirect ไป thumb ที่ถูกต้องเอง)
        const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fname)}?width=900`;
        const dest = path.join(OUT, `${item.slug}.jpg`);
        let size;
        try {
          size = await download(thumbUrl, dest);
        } catch {
          size = await download(orig, dest); // รูปต้นฉบับเล็กกว่า 900px → ใช้ต้นฉบับ
        }

        // ดึงไลเซนส์ + ผู้ถ่าย เพื่อทำเครดิต
        let license = "", artist = "";
        try {
          const meta = await getJSON(
            `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fname)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`
          );
          const pages = meta.query && meta.query.pages;
          const page = pages && Object.values(pages)[0];
          const em = page && page.imageinfo && page.imageinfo[0] && page.imageinfo[0].extmetadata;
          if (em) {
            license = stripHTML(em.LicenseShortName && em.LicenseShortName.value);
            artist = stripHTML(em.Artist && em.Artist.value).slice(0, 80);
          }
        } catch {}

        credits.push({
          slug: item.slug,
          file: fname,
          filePage: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fname)}`,
          license: license || "ดูที่หน้าไฟล์ต้นทาง",
          artist,
        });
        console.log(`ok  ${item.slug}  ${Math.round(size / 1024)}KB  [${license}] ${fname}`);
        done = true;
        break;
      } catch (e) {
        console.log(`..  ${item.slug} via "${title}" failed: ${e.message}`);
      }
    }
    if (!done) console.log(`SKIP ${item.slug} — no image found (การ์ดจะแสดงแบบไม่มีรูป)`);
  }

  fs.writeFileSync(path.join(OUT, "credits.json"), JSON.stringify(credits, null, 1));
  console.log(`credits.json: ${credits.length} entries`);
}

run().catch((e) => {
  // ห้ามทำ build พังเด็ดขาด — เว็บส่วนอื่นต้องขึ้นได้เสมอ
  console.error("fetch-attractions failed:", e.message);
  try { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, "credits.json"), "[]"); } catch {}
});
