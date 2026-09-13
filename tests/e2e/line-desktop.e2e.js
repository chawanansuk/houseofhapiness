/* บนคอมกดลิงก์ LINE ต้องได้กล่องทางเลือก (QR + ข้อความที่กรอกไว้ + WhatsApp)
   บนมือถือต้องไม่โดนดัก ลิงก์ยังเด้งเข้าแอป LINE ตามเดิม */
const http = require("http"); const fs = require("fs"); const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const MIME = {".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".jpg":"image/jpeg",".svg":"image/svg+xml",".webmanifest":"application/json",".woff2":"font/woff2"};
const server = http.createServer((req,res)=>{ const url=req.url.split("?")[0];
  if(url.startsWith("/api/")){res.setHeader("Content-Type","application/json");return res.end(JSON.stringify({ok:true,price:700,ann:{th:"",en:""},source:"sheet"}));}
  const f=path.join(ROOT,url==="/"?"index.html":url);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end("nf");}
  res.setHeader("Content-Type",MIME[path.extname(f)]||"application/octet-stream"); res.end(fs.readFileSync(f)); });

const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

(async()=>{ await new Promise(r=>server.listen(8903,r));
  const {chromium}=require("playwright");
  const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"}).catch(()=>chromium.launch());
  const fails=[]; const check=(n,c)=>{console.log((c?"PASS":"FAIL")+" "+n); if(!c)fails.push(n);};

  // ── คอม: หน้าไกด์ (ลิงก์แอดเพื่อน ไม่มีข้อความแนบ) ──
  const desk=await browser.newContext({viewport:{width:1280,height:900},locale:"th-TH",permissions:["clipboard-read","clipboard-write"]});
  let p=await desk.newPage();
  let qrStatus=0; p.on("response",(r)=>{ if(r.url().includes("line-qr.svg")) qrStatus=r.status(); });
  await p.goto("http://localhost:8903/guides.html",{waitUntil:"networkidle"});
  await p.click('a[href*="line.me"]');
  await p.waitForSelector(".line-fb:not([hidden])",{timeout:3000}).catch(()=>{});
  check("desktop guides: กล่องเปิด", await p.isVisible(".line-fb-card"));
  check("desktop guides: มี QR", await p.isVisible(".line-fb-qr img"));
  await p.waitForFunction(()=>{const i=document.querySelector(".line-fb-qr img");return i&&i.complete;},null,{timeout:3000}).catch(()=>{});
  // Chromium คืน naturalWidth=0 กับ SVG จึงใช้ decode() แทน — ถ้า SVG พัง (เช่น XML ไม่ถูก) จะ reject
  const qrOk = await p.$eval(".line-fb-qr img", (i)=>i.decode().then(()=>true,()=>false));
  check("desktop guides: QR วาดได้จริง", qrStatus===200 && qrOk);
  check("desktop guides: โชว์ไอดี LINE", (await p.textContent(".line-fb-id code")).trim()==="@060hvzok");
  check("desktop guides: ไม่มีช่องข้อความ (ลิงก์แอดเพื่อน)", await p.$eval(".line-fb-msg",(e)=>e.hidden));
  check("desktop guides: มีปุ่ม WhatsApp", (await p.getAttribute(".line-fb-alt .btn-wa","href")||"").startsWith("https://wa.me/66994419465"));
  check("desktop guides: ลิงก์เปิด LINE เองยังอยู่", (await p.getAttribute(".line-fb-open","href")||"").includes("line.me"));
  await p.keyboard.press("Escape");
  check("desktop guides: Esc ปิดได้", await p.$eval(".line-fb",(e)=>e.hidden));
  await p.close();

  // ── คอม: หน้าจอง (ลิงก์มีข้อความที่ลูกค้ากรอก) ──
  p=await desk.newPage();
  await p.goto("http://localhost:8903/booking.html",{waitUntil:"networkidle"});
  const d=(n)=>{const x=new Date(Date.now()+n*864e5);return x.toISOString().slice(0,10);};
  await p.check('input[name="room"][value="std"]');
  await p.fill("#checkin",d(10)); await p.fill("#checkout",d(12));
  await p.fill("#name","คุณทดสอบ"); await p.fill("#phone","0812345678");
  await p.waitForTimeout(600);
  const href=await p.getAttribute("#btnLine","href");
  check("booking: ลิงก์ LINE มีข้อความแนบ", !!href && href.includes("oaMessage"));
  const tabsBefore=desk.pages().length;
  await p.click("#btnLine");
  await p.waitForSelector(".line-fb:not([hidden])",{timeout:3000}).catch(()=>{});
  check("booking: กล่องเปิดแทนที่จะเงียบ", await p.isVisible(".line-fb-card"));
  const msg=await p.inputValue(".line-fb-msg textarea");
  check("booking: ข้อความที่กรอกไม่หาย", msg.includes("คุณทดสอบ") && msg.includes("0812345678"));
  check("booking: ช่องข้อความโชว์", await p.$eval(".line-fb-msg",(e)=>!e.hidden));
  const wa=await p.getAttribute(".line-fb-alt .btn-wa","href");
  check("booking: WhatsApp พ่วงข้อความเดิม", !!wa && decodeURIComponent(wa).includes("คุณทดสอบ"));
  const mail=await p.getAttribute(".line-fb-alt .btn-mail","href");
  check("booking: อีเมลพ่วงข้อความเดิม", !!mail && mail.startsWith("mailto:") && decodeURIComponent(mail).includes("คุณทดสอบ"));
  check("booking: ไม่เด้งแท็บใหม่เปล่าๆ", desk.pages().length===tabsBefore);
  await p.click('.line-fb-copy[data-copy="msg"]');
  await p.waitForTimeout(300);
  check("booking: กดคัดลอกแล้วข้อความเข้าคลิปบอร์ดจริง",
    (await p.evaluate(()=>navigator.clipboard.readText())).includes("คุณทดสอบ"));
  check("booking: ปุ่มคัดลอกขึ้นว่าคัดลอกแล้ว",
    (await p.textContent('.line-fb-copy[data-copy="msg"]')).trim()==="คัดลอกแล้ว");
  await p.click('.line-fb-copy[data-copy="id"]');
  await p.waitForTimeout(300);
  check("booking: กดคัดลอกไอดีได้", (await p.evaluate(()=>navigator.clipboard.readText())).trim()==="@060hvzok");
  await p.close();

  // ── คอม: หน้ารูมเซอร์วิส ──
  p=await desk.newPage();
  await p.goto("http://localhost:8903/services.html",{waitUntil:"networkidle"});
  const ok=await p.evaluate(()=>{
    const a=document.getElementById("rsSend");
    a.href="https://line.me/R/oaMessage/@060hvzok/?"+encodeURIComponent("ออร์เดอร์ทดสอบ ห้อง 301");
    a.click();
    const b=document.querySelector(".line-fb");
    return b && !b.hidden && b.querySelector("textarea").value.includes("ห้อง 301");
  });
  check("services: กล่องเปิดพร้อมออร์เดอร์เดิม", ok);
  await p.close(); await desk.close();

  // ── มือถือ: ต้องไม่โดนดัก ──
  const mob=await browser.newContext({viewport:{width:390,height:844},locale:"th-TH",userAgent:MOBILE_UA,isMobile:true,hasTouch:true});
  p=await mob.newPage();
  const errs=[]; p.on("pageerror",(e)=>errs.push(e.message));
  await p.goto("http://localhost:8903/guides.html",{waitUntil:"networkidle"});
  check("mobile: ไม่สร้างกล่อง (ปล่อยให้เปิดแอป LINE)", await p.$eval("body",()=>!document.querySelector(".line-fb")));
  check("mobile: ไม่มี JS error", errs.length===0);
  await p.close(); await mob.close();

  await browser.close(); server.close();
  console.log(fails.length?`\n${fails.length} FAILED: `+fails.join(" | "):"\nทั้งหมดผ่าน ✓");
  process.exit(fails.length?1:0);
})();
