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
    ["room-deluxe.html","ห้อง Deluxe","Deluxe Extra-Large Room"],
    ["guides.html","ไกด์เที่ยวจากคนพื้นที่","Local Travel Guides"],
    ["loy-krathong.html","ลอยกระทงริมเจ้าพระยา","Loy Krathong 2026"],
    ["new-year-countdown.html","เคาท์ดาวน์ปีใหม่ริมเจ้าพระยา","New Year's Eve on the Chao Phraya"],
    ["thonburi-one-day.html","เที่ยวฝั่งธนฯ 1 วันเต็ม","One Full Day in Thonburi"],
    ["heritage-walk.html","มรดกไชน่าทาวน์","Heritage Walk"],
    ["services.html","รูมเซอร์วิส","Room Service"],
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

  // รูมเซอร์วิส: เลือกจำนวน → แถบตะกร้า → ชีตสรุป → ลิงก์ LINE ต้องมีออร์เดอร์ครบ ไม่มีช่องว่างให้แขกเติมเอง
  const rs=await ctx.newPage();
  await rs.goto("http://127.0.0.1:8899/services.html",{waitUntil:"domcontentloaded"});
  await rs.waitForTimeout(300);
  await rs.evaluate(()=>{ localStorage.setItem("hoh-lang","th"); applyLang(); });
  check("services: แถบตะกร้าซ่อนตอนยังไม่เลือก", await rs.locator("#rsBar").isHidden());
  check("services: เมนูครบ 21 รายการจากเล่มเมนูจริง", await rs.locator(".rs-card").count()===21);
  await rs.locator('.rs-card[data-id="cocoa"] .qplus').click(); // โกโก้ ฿40 — ยังไม่ถึงขั้นต่ำ ฿100
  check("services: ต่ำกว่าขั้นต่ำ ฿100 ปุ่มสั่งต้องกดไม่ได้",
    await rs.locator("#rsBarBtn").isDisabled() && /ขั้นต่ำ/.test(await rs.textContent("#rsBarSum")));
  await rs.locator('.rs-card[data-id="cocoa"] .qminus').click(); // เอาออก แล้วสั่งของจริง
  await rs.locator(".qty .qplus").first().click(); // มัสมั่น ฿100 × 2
  await rs.locator(".qty .qplus").first().click();
  await rs.locator(".qty .qplus").nth(1).click();
  check("services: เลือก 3 รายการ แถบตะกร้าโผล่พร้อมยอดรวม และปุ่มกดได้",
    await rs.locator("#rsBar").isVisible() && /3 รายการ/.test(await rs.textContent("#rsBarQty"))
    && !(await rs.locator("#rsBarBtn").isDisabled()));
  await rs.click("#rsBarBtn");
  check("services: ชีตสรุปเปิด มี 2 รายการ", await rs.locator("#rsSheet").isVisible() && await rs.locator(".rs-item").count()===2);
  const minD=await rs.getAttribute("#rsDate","min");
  check("services: วันที่ default = พรุ่งนี้ (ล่วงหน้า 1 วัน)", (await rs.inputValue("#rsDate"))===minD && !!minD);
  const slots=await rs.locator("#rsTime option").allTextContents();
  check("services: เวลาจำกัดตามรอบส่ง 9:00-11:30/13:30-15:30",
    slots.includes("09:00") && slots.includes("15:30") && !slots.includes("12:00") && !slots.includes("18:00"));
  await rs.click("#rsSend"); // ยังไม่กรอกชื่อ/ห้อง/เวลา ต้องโดนกัน
  await rs.waitForTimeout(150);
  check("services: กดส่งโดยไม่กรอกชื่อ/ห้อง/เวลา ต้องขึ้นเตือน", await rs.locator("#rsErr").isVisible());
  await rs.fill("#rsName","Somchai Test");
  await rs.fill("#rsRoom","701");
  await rs.selectOption("#rsTime","09:30");
  await rs.waitForTimeout(150);
  const href=await rs.getAttribute("#rsSend","href");
  check("services: ลิงก์ LINE มีออร์เดอร์ครบ (เมนู+ชื่อ+ห้อง+เวลา)",
    href.includes("line.me/R/oaMessage") && href.includes(encodeURIComponent("701"))
    && href.includes(encodeURIComponent("Somchai Test")) && href.includes(encodeURIComponent("มัสมั่น"))
    && href.includes(encodeURIComponent("09:30")) && href.includes(encodeURIComponent("× 2")));
  const hrefWa=await rs.getAttribute("#rsSendWa","href");
  check("services: ลิงก์ WhatsApp มีออร์เดอร์เดียวกัน",
    hrefWa.includes("wa.me/66994419465") && hrefWa.includes(encodeURIComponent("701"))
    && hrefWa.includes(encodeURIComponent("09:30")));
  await rs.close();

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
