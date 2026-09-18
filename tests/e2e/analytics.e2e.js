/* ตัวนับเหตุการณ์ Vercel Analytics — ต้องยิงถูกชื่อ ถูกช่องทาง และ "ห้ามมีข้อมูลส่วนตัวหลุด"
   ดักที่ window.va แทนการยิงจริง เพราะ analytics ยังไม่เปิดและไม่ควรส่งข้อมูลจากเครื่องทดสอบ */
const http = require("http"); const fs = require("fs"); const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const MIME = {".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/json",".woff2":"font/woff2"};
const server = http.createServer((req,res)=>{ const url=req.url.split("?")[0];
  if(url.startsWith("/_vercel/")){ res.setHeader("Content-Type","text/javascript"); return res.end("/* stub */"); }
  if(url.startsWith("/api/")){res.setHeader("Content-Type","application/json");return res.end(JSON.stringify({ok:true,price:700,ann:{th:"",en:""},source:"sheet"}));}
  const f=path.join(ROOT,url==="/"?"index.html":url);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end("nf");}
  res.setHeader("Content-Type",MIME[path.extname(f)]||"application/octet-stream"); res.end(fs.readFileSync(f)); });

// ui.js ไม่ยิงบน localhost จึงต้องเสิร์ฟผ่านชื่อโฮสต์อื่น
const HOST = "http://127.0.0.1.nip.io:8975";
const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

(async()=>{ await new Promise(r=>server.listen(8975,"0.0.0.0",r));
  const {chromium}=require("playwright");
  const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"}).catch(()=>chromium.launch());
  const fails=[]; const check=(n,c)=>{console.log((c?"PASS":"FAIL")+" "+n); if(!c)fails.push(n);};

  // ดัก window.va ก่อนสคริปต์หน้าจะรัน แล้วเก็บทุก event ไว้ตรวจ
  const spy = `window.va = function(){ (window.__ev = window.__ev || []).push([...arguments]); };`;
  const events = async (p) => p.evaluate(() => (window.__ev||[]).filter(a=>a[0]==="event").map(a=>a[1]));

  const ctx = await browser.newContext({viewport:{width:1280,height:900},locale:"th-TH",permissions:["clipboard-read","clipboard-write"]});
  await ctx.addInitScript(spy);

  // ── หน้าจอง: กรอกครบแล้วกดส่ง ──
  let p = await ctx.newPage();
  await p.goto(`${HOST}/booking.html`,{waitUntil:"networkidle"});
  await p.evaluate(()=>document.getElementById("btnLine").click());  // ยังกรอกไม่ครบ ต้องไม่นับ
  check("ยังกรอกไม่ครบ กดแล้วไม่นับ", (await events(p)).length === 0);
  const d=(n)=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
  await p.check('input[name="room"][value="std"]');
  await p.fill("#checkin",d(10)); await p.fill("#checkout",d(12));
  await p.fill("#name","คุณทดสอบ ความลับ"); await p.fill("#phone","0812345678");
  await p.fill("#note","ขอห้องชั้นสูง");
  await p.waitForTimeout(600);
  await p.click("#btnLine");
  await p.waitForTimeout(300);
  let ev = await events(p);
  const booking = ev.find(e=>e.name==="booking_sent");
  check("กดจองผ่าน LINE → booking_sent via=line", !!booking && booking.data.via==="line");
  // เดสก์ท็อปจะเด้งกล่องทางเลือก LINE ด้วย
  check("คอมเปิดกล่อง LINE → line_desktop_fallback (has_message=yes)",
    !!ev.find(e=>e.name==="line_desktop_fallback" && e.data.has_message==="yes"));
  // ── ข้อมูลส่วนตัวต้องไม่หลุดไปกับ event ── (สำคัญที่สุด)
  const blob = JSON.stringify(ev);
  check("ไม่มีชื่อผู้จองใน event", !blob.includes("ทดสอบ") && !blob.includes("ความลับ"));
  check("ไม่มีเบอร์โทรใน event", !blob.includes("0812345678"));
  check("ไม่มีวันเข้าพักใน event", !blob.includes(d(10)));
  check("ไม่มีหมายเหตุที่แขกพิมพ์ใน event", !blob.includes("ชั้นสูง"));
  await p.click('.line-fb-alt .btn-wa');
  await p.waitForTimeout(200);
  const wa = (await events(p)).find(e=>e.name==="whatsapp_click");
  check("กด WhatsApp ในกล่อง → from=desktop_fallback", !!wa && wa.data.from==="desktop_fallback");
  await p.close();

  // ── หน้ารูมเซอร์วิส ──
  p = await ctx.newPage();
  await p.goto(`${HOST}/services.html`,{waitUntil:"networkidle"});
  await p.evaluate(()=>{ const a=document.getElementById("rsSendWa"); a.href="https://wa.me/66994419465?text=x"; a.click(); });
  await p.waitForTimeout(200);
  const order = (await events(p)).find(e=>e.name==="order_sent");
  check("ส่งออร์เดอร์ทาง WhatsApp → order_sent via=whatsapp", !!order && order.data.via==="whatsapp");
  check("order_sent ไม่แนบรายการอาหาร", !JSON.stringify(order).includes("x"));
  await p.close();

  // ── สลับภาษา ──
  p = await ctx.newPage();
  await p.goto(`${HOST}/guides.html`,{waitUntil:"networkidle"});
  await p.click('.lang-toggle button[data-lang="en"]');
  await p.waitForTimeout(200);
  const ls = (await events(p)).find(e=>e.name==="lang_switch");
  check("กดสลับเป็น EN → lang_switch to=en", !!ls && ls.data.to==="en");
  await p.click('.lang-toggle button[data-lang="en"]');   // กดซ้ำภาษาเดิม
  await p.waitForTimeout(200);
  check("กดภาษาเดิมซ้ำ ไม่นับเพิ่ม", (await events(p)).filter(e=>e.name==="lang_switch").length===1);
  await p.close(); await ctx.close();

  // ── มือถือ: กด LINE ปกติ ไม่ใช่ fallback ──
  const mob = await browser.newContext({viewport:{width:390,height:844},userAgent:MOBILE_UA,isMobile:true,hasTouch:true,locale:"th-TH"});
  await mob.addInitScript(spy);
  p = await mob.newPage();
  const errs=[]; p.on("pageerror",(e)=>errs.push(e.message));
  await p.goto(`${HOST}/guides.html`,{waitUntil:"networkidle"});
  await p.evaluate(()=>{ const a=document.querySelector('a[href*="line.me"]'); a.removeAttribute("target"); a.addEventListener("click",(e)=>e.preventDefault()); a.click(); });
  await p.waitForTimeout(200);
  const lc = (await events(p)).find(e=>e.name==="line_click");
  check("มือถือกด LINE → line_click from=link", !!lc && lc.data.from==="link");
  check("มือถือไม่มี JS error", errs.length===0);
  await p.close(); await mob.close();

  // ── analytics ปิดอยู่ (ไม่มี window.va) ต้องไม่พังและไม่ throw ──
  const off = await browser.newContext({viewport:{width:1280,height:900}});
  p = await off.newPage();
  const errs2=[]; p.on("pageerror",(e)=>errs2.push(e.message));
  await p.goto(`${HOST}/booking.html`,{waitUntil:"networkidle"});
  await p.evaluate(()=>{ delete window.va; document.getElementById("btnCopy").click(); });
  await p.waitForTimeout(200);
  check("ไม่มี window.va ก็ไม่พัง", errs2.length===0);
  await p.close(); await off.close();

  await browser.close(); server.close();
  console.log(fails.length?`\n${fails.length} FAILED: `+fails.join(" | "):"\nทั้งหมดผ่าน ✓");
  process.exit(fails.length?1:0);
})();
