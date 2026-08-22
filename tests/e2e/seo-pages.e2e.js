/* ตรวจ 6 หน้า SEO ใหม่: โหลดไม่มี error · h1 ถูก · สลับ EN ได้ · schema JSON ถูก · ลิงก์ภายในไม่เสีย · ปุ่มคัดลอกที่อยู่ */
const http = require("http"); const fs = require("fs"); const path = require("path");
const ROOT = require("path").join(__dirname, "..", "..");
const MIME = {".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".jpg":"image/jpeg",".webmanifest":"application/json",".woff2":"font/woff2"};
const server = http.createServer((req,res)=>{ const url=req.url.split("?")[0];
  if(url.startsWith("/api/")){res.setHeader("Content-Type","application/json");return res.end(JSON.stringify({ok:true,price:700,ann:{th:"",en:""},source:"sheet"}));}
  const f=path.join(ROOT,url==="/"?"index.html":url);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end("nf");}
  res.setHeader("Content-Type",MIME[path.extname(f)]||"application/octet-stream"); res.end(fs.readFileSync(f)); });

(async()=>{ await new Promise(r=>server.listen(8899,r));
  const {chromium}=require("playwright");
  const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"}).catch(()=>chromium.launch());
  const fails=[]; const check=(n,c)=>{console.log((c?"PASS":"FAIL")+" "+n); if(!c)fails.push(n);};
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:"th-TH"});

  const PAGES=[
    ["near-iconsiam.html","ที่พักใกล้ ICONSIAM","Budget Hotel near ICONSIAM"],
    ["near-chinatown.html","ที่พักใกล้เยาวราช","Hotel near Yaowarat"],
    ["airport-guide.html","วิธีเดินทางจากสนามบิน","Getting here from the airport"],
    ["room-standard.html","ห้อง Standard","Standard Double Room"],
    ["room-studio.html","ห้อง Studio","Studio Twin Room"],
    ["room-deluxe.html","ห้อง Deluxe","Deluxe Room with Living Room"],
    ["guides.html","ไกด์เที่ยวจากคนพื้นที่","Local Travel Guides"],
    ["loy-krathong.html","ลอยกระทงริมเจ้าพระยา","Loy Krathong 2026"],
    ["new-year-countdown.html","เคาท์ดาวน์ปีใหม่ริมเจ้าพระยา","New Year's Eve on the Chao Phraya"],
    ["thonburi-one-day.html","เที่ยวฝั่งธนฯ 1 วันเต็ม","One Full Day in Thonburi"],
  ];
  for (const [file, thH1, enH1] of PAGES) {
    const page=await ctx.newPage();
    const errs=[];
    page.on("pageerror",e=>errs.push(e.message));
    page.on("console",m=>{ if(m.type()==="error") errs.push(m.text()); });
    await page.goto("http://127.0.0.1:8899/"+file,{waitUntil:"domcontentloaded"});
    await page.waitForTimeout(400);
    // เทสหน้าก่อนสลับ EN ค้างไว้ใน localStorage (พฤติกรรมจริงของเว็บ) — รีเซ็ตเป็นไทยก่อนเช็ค
    await page.evaluate(()=>{ localStorage.setItem("hoh-lang","th"); applyLang(); });
    await page.waitForTimeout(150);
    check(`${file}: ไม่มี JS error`, errs.length===0 || (console.log("  errs:",errs), false));
    const h1=await page.textContent("h1");
    check(`${file}: h1 ไทยถูกต้อง`, h1.includes(thH1));
    // schema JSON ทุกก้อน parse ได้
    const schemaOk=await page.evaluate(()=>{
      try { document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>JSON.parse(s.textContent)); return true; }
      catch { return false; }
    });
    check(`${file}: schema JSON ถูกต้อง`, schemaOk);
    // เมนู ☰ โผล่ (ui.js ทำงาน)
    check(`${file}: มีเมนู ☰`, await page.isVisible(".menu-btn"));
    // สลับ EN
    await page.click('.lang-toggle button[data-lang="en"]');
    await page.waitForTimeout(200);
    const h1en=await page.textContent("h1");
    check(`${file}: สลับ EN แล้ว h1 เป็นอังกฤษ`, h1en.includes(enH1));
    // ลิงก์ภายในทุกอันชี้ไฟล์ที่มีจริง
    const hrefs=await page.evaluate(()=>[...document.querySelectorAll("a[href]")].map(a=>a.getAttribute("href")).filter(h=>h && !h.startsWith("http") && !h.startsWith("#") && !h.startsWith("mailto")));
    const missing=hrefs.filter(h=>{ const f=h.split("#")[0]; return f && !fs_exists(f); });
    function fs_exists(){ return true; } // ตรวจฝั่ง node ด้านล่างแทน
    const missReal=[...new Set(hrefs.map(h=>h.split("#")[0]).filter(Boolean))].filter(f=>!fs.existsSync(path.join(ROOT,f)));
    check(`${file}: ลิงก์ภายในครบ`, missReal.length===0 || (console.log("  missing:",missReal), false));
    await page.close();
  }

  // ปุ่มคัดลอกที่อยู่ (airport-guide)
  const pg=await ctx.newPage();
  await pg.goto("http://127.0.0.1:8899/airport-guide.html",{waitUntil:"domcontentloaded"});
  await pg.waitForTimeout(300);
  await pg.click("#copyAddr");
  await pg.waitForTimeout(200);
  check("airport-guide: ปุ่มคัดลอกทำงาน", /คัดลอกแล้ว|Copied/.test(await pg.textContent("#copyAddr")));

  // index: การ์ดห้องมีลิงก์รายละเอียด + footer มีลิงก์หน้าใหม่
  const ix=await ctx.newPage();
  await ix.goto("http://127.0.0.1:8899/",{waitUntil:"domcontentloaded"});
  await ix.waitForTimeout(300);
  check("index: ลิงก์รายละเอียดห้องครบ 3", await ix.locator(".room-detail-link").count()===3);
  check("index: footer มีลิงก์ near-iconsiam", await ix.locator('a[href="near-iconsiam.html"]').count()>=1);

  await browser.close(); server.close();
  console.log(fails.length?"\n❌ "+fails.length+" failed":"\n✅ all passed");
  process.exit(fails.length?1:0);
})().catch(e=>{console.error("ERROR",e);process.exit(1);});
