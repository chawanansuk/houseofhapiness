/* เอฟเฟกต์เลื่อนแล้วค่อยๆ ปรากฏ
   กฎเหล็ก: หน้าเว็บห้ามมีแถบว่างเพราะแอนิเมชันไม่ทำงาน — ถ้าเมื่อไหร่ไม่แน่ใจ ให้แสดงเนื้อหา
   ชั้นกันพลาดมี 4 ชั้น: reduced-motion · observer ล่วงหน้า 220px · sweep ตอนเลื่อน · ตัวจับว่า observer ไม่เคยทำงาน */
document.addEventListener("DOMContentLoaded", () => {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  const showAll = () => els.forEach((el) => el.classList.add("visible"));
  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    showAll();
    return;
  }
  // แสดงทุกบล็อกที่เลื่อนผ่านมาแล้วหรือใกล้จะถึงจอ
  const sweep = () => {
    const limit = window.innerHeight * 1.15;
    els.forEach((el) => { if (!el.classList.contains("visible") && el.getBoundingClientRect().top < limit) el.classList.add("visible"); });
  };
  let fired = false;
  const io = new IntersectionObserver((entries) => {
    fired = true;
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: "220px 0px" });  // เริ่มโผล่ก่อนถึงจอ เลื่อนเร็วแค่ไหนก็ทัน
  els.forEach((el) => io.observe(el));

  let t;
  window.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(sweep, 100); }, { passive: true });
  setTimeout(sweep, 1500);
  // ถ้า observer ไม่เคยส่งอะไรมาเลยภายใน 3 วิ แปลว่ามันไม่ทำงาน — เลิกซ่อนทั้งหมด
  setTimeout(() => { if (!fired) showAll(); }, 3000);
  window.addEventListener("beforeprint", showAll);
});

// ไอคอนเส้นบาง (แทนอีโมจิ — อีโมจิหน้าตาต่างกันทุกเครื่องและดูเป็นเทมเพลต) วาดจาก data-icon
const LINE_ICONS = {
  star: '<path d="M12 2.5l3 6.2 6.8 1-4.9 4.8 1.2 6.8L12 18l-6.1 3.3 1.2-6.8-4.9-4.8 6.8-1z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.6-.8L3 21l1.9-5.4A8.4 8.4 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 9 8.4z"/>',
  river: '<path d="M2 7c.6.5 1.2 1 2.5 1C7 8 7 6 9.5 6c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12.5c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 9.5 17c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  wifi: '<path d="M5 12.6a11 11 0 0 1 14 0M1.4 9a16 16 0 0 1 21.2 0M8.5 16.1a6 6 0 0 1 7 0M12 20h.01"/>',
  snow: '<path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/>',
  city: '<path d="M3 21h18M5 21V8l7-4 7 4v13M9 10h1M14 10h1M9 14h1M14 14h1M9 18h1M14 18h1"/>',
  fridge: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14M9 6v2M9 14v3"/>',
  tv: '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M17 2l-5 5-5-5"/>',
  laundry: '<rect x="3" y="2" width="18" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M7 6h.01M11 6h2"/>',
  bottle: '<path d="M9 2h6v3H9zM8 5h8l1 3v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8z"/>',
  drop: '<path d="M12 2.7s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>',
  shower: '<path d="M4 4a4 4 0 0 1 8 0v2M12 6h6M6 10h12M8 14v2M12 14v3M16 14v2"/>',
  lantern: '<path d="M9 2h6M12 2v3M8 5h8l2 8-2 8H8l-2-8zM10 21h4"/>',
  tree: '<path d="M12 22v-5M6 17h12l-3-5h2l-5-9-5 9h2z"/>',
  temple: '<path d="M3 22h18M5 22V10M19 22V10M9 22v-8M15 22v-8M3 10h18L12 3z"/>',
  bag: '<path d="M6 2 4 7v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-2-5zM4 7h16M16 11a4 4 0 0 1-8 0"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  train: '<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3M8 15h.01M16 15h.01"/>',
  pin: '<path d="M12 22s7-7.2 7-12a7 7 0 0 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
};
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".ico[data-icon]").forEach((el) => {
    const d = LINE_ICONS[el.dataset.icon];
    if (d) el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
  });
});

// เมนู ☰ บนมือถือ — ฉีดจากที่นี่ที่เดียว ทุกหน้าได้เมนูครบเหมือนกัน
// (จอเล็กเมนูลิงก์บน nav ถูกซ่อน ลูกค้ามือถือหาหน้ารูป/ที่เที่ยว/FAQ ไม่เจอ)
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".topnav");
  const right = nav && nav.querySelector(".nav-right");
  if (!nav || !right) return;
  const onHome = /(?:^|\/)(index\.html)?$/.test(location.pathname);
  const pre = onHome ? "" : "index.html";

  const btn = document.createElement("button");
  btn.className = "menu-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "เมนู");
  btn.setAttribute("aria-expanded", "false");
  btn.textContent = "☰";
  right.appendChild(btn);

  const panel = document.createElement("div");
  panel.className = "mobile-menu";
  panel.hidden = true;
  panel.innerHTML =
    `<a href="${pre}#rooms" data-i18n="nav.rooms">ห้องพัก</a>` +
    `<a href="${pre}#reviews" data-i18n="nav.reviews">รีวิว</a>` +
    `<a href="gallery.html" data-i18n="nav.gallery">รูปภาพ</a>` +
    `<a href="guides.html" data-i18n="nav.guides">ไกด์เที่ยว & บทความ</a>` +
    `<a href="services.html" data-i18n="nav.services">รูมเซอร์วิส</a>` +
    `<a href="${pre}#location" data-i18n="nav.location">ที่ตั้ง</a>` +
    `<a href="${pre}#faq" data-i18n="nav.faq">คำถาม</a>` +
    `<a class="mm-book" href="booking.html" data-i18n="nav.book">จองเลย</a>`;
  nav.insertAdjacentElement("afterend", panel);
  if (typeof applyLang === "function" && typeof getLang === "function") applyLang(getLang());

  const setOpen = (open) => {
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.textContent = open ? "✕" : "☰";
    if (open) panel.style.top = nav.offsetHeight + "px"; // ใต้ nav พอดี (nav เป็น sticky)
  };
  btn.addEventListener("click", () => setOpen(panel.hidden));
  panel.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("click", (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
});

/* แถบปุ่มติดขอบล่างสำหรับหน้าบทความบนมือถือ
   โผล่เมื่อ hero เลื่อนพ้นจอ และหลบให้ตอนถึงปุ่ม CTA ท้ายบทความ จะได้ไม่ซ้ำซ้อนกัน */
document.addEventListener("DOMContentLoaded", () => {
  const hero = document.querySelector(".ld-hero");
  const page = location.pathname.split("/").pop() || "index.html";
  if (!hero || page === "booking.html" || document.querySelector(".sticky-cta, .ld-bar")) return;

  const bar = document.createElement("div");
  bar.className = "ld-bar";
  bar.innerHTML =
    '<a class="btn btn-gold btn-sm" href="booking.html" data-i18n="sb.rates">เช็คห้องว่าง</a>' +
    '<a class="btn bar-line btn-sm" href="https://line.me/R/ti/p/@060hvzok" target="_blank" rel="noopener" data-i18n="sb.line">ถามทางไลน์</a>';
  document.body.appendChild(bar);
  if (typeof applyLang === "function") applyLang();

  const cta = document.querySelector(".ld-cta");
  let heroOut = false, ctaIn = false;
  const update = () => bar.classList.toggle("show", heroOut && !ctaIn);
  if (!("IntersectionObserver" in window)) return;
  new IntersectionObserver(([e]) => { heroOut = !e.isIntersecting; update(); }, { threshold: 0 }).observe(hero);
  if (cta) new IntersectionObserver(([e]) => { ctaIn = e.isIntersecting; update(); }, { threshold: 0 }).observe(cta);
});

/* สารบัญอัตโนมัติสำหรับหน้าบทความที่ยาวพอ (หัวข้อ h2 ตั้งแต่ 4 อันขึ้นไป)
   id ของหัวข้อมาจากคีย์ภาษา ไม่ใช่ข้อความ — ลิงก์จึงไม่พังเวลาสลับไทย/อังกฤษ */
document.addEventListener("DOMContentLoaded", () => {
  const wrap = document.querySelector(".ld-wrap");
  if (!wrap || document.querySelector(".ld-toc")) return;
  const heads = [].slice.call(wrap.querySelectorAll(".ld-sec > h2"));
  if (heads.length < 4) return;

  heads.forEach((h, i) => {
    if (!h.id) h.id = "s-" + ((h.dataset.i18n || "").replace(/[^a-z0-9]+/gi, "-") || "sec-" + (i + 1));
  });

  const nav = document.createElement("nav");
  nav.className = "ld-toc";
  nav.setAttribute("aria-label", "สารบัญ");
  nav.innerHTML = '<div><div class="h" data-i18n="toc.t">ในหน้านี้มีอะไรบ้าง</div><ol></ol></div>';
  const ol = nav.querySelector("ol");
  heads.forEach((h) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + h.id;
    if (h.dataset.i18n) { a.dataset.i18n = h.dataset.i18n; }
    a.textContent = h.textContent.trim();
    li.appendChild(a);
    ol.appendChild(li);
  });

  const intro = document.querySelector(".ld-intro");
  if (intro) intro.insertAdjacentElement("afterend", nav);
  else wrap.insertAdjacentElement("beforebegin", nav);
  if (typeof applyLang === "function") applyLang();
});

/* วันที่ปรับปรุงล่าสุด: เก็บเป็น ISO ใน datetime="" ให้เครื่องอ่าน แล้วแสดงตามภาษาที่เลือก
   ไทยใช้ พ.ศ. ให้ตรงกับที่ใช้ในหน้าอื่นของเว็บ */
(function () {
  var MON_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  var MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function paint() {
    var th = (typeof getLang === "function" ? getLang() : "th") === "th";
    [].forEach.call(document.querySelectorAll(".ld-stamp time[datetime]"), function (el) {
      var p = el.getAttribute("datetime").split("-");
      if (p.length !== 3) return;
      var y = Number(p[0]), m = Number(p[1]) - 1, d = Number(p[2]);
      el.textContent = th ? d + " " + MON_TH[m] + " " + (y + 543) : d + " " + MON_EN[m] + " " + y;
    });
  }
  document.addEventListener("DOMContentLoaded", paint);
  document.addEventListener("langchange", paint);
})();

/* ปุ่ม EN บนหน้าไทย: ถ้าหน้านั้นมีคู่ภาษาอังกฤษเป็น URL ของตัวเองแล้ว ให้พาไปหน้านั้นเลย
   จะได้ไม่มีสองวิธีในการอ่านภาษาอังกฤษ (สลับในหน้า กับ /en/...) ซึ่งทำให้ลิงก์ที่แชร์ออกไปไม่ตรงกัน
   หน้าไหนยังไม่มีคู่ภาษา (เช่น รูมเซอร์วิส) ปุ่มยังทำงานแบบสลับในหน้าเหมือนเดิม */
document.addEventListener("DOMContentLoaded", () => {
  if (window.HOH_LANG) return;                       // อยู่ในหน้า /en/ อยู่แล้ว
  const alt = document.querySelector('link[rel="alternate"][hreflang="en"]');
  const btn = document.querySelector('.lang-toggle button[data-lang="en"]');
  if (!alt || !btn) return;
  const url = new URL(alt.href);
  const a = document.createElement("a");
  a.href = url.pathname;
  a.setAttribute("hreflang", "en");
  a.textContent = btn.textContent;
  a.className = btn.className;
  a.addEventListener("click", () => { try { localStorage.setItem("hoh-lang", "en"); } catch (e) {} });
  btn.replaceWith(a);
});

// Lightbox: รองรับเมาส์ คีย์บอร์ด และ screen reader
document.addEventListener("DOMContentLoaded", () => {
  const imgs = document.querySelectorAll(".gallery img");
  if (!imgs.length) return;
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Photo preview");
  overlay.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close photo preview">✕</button><img alt="">';
  overlay.hidden = true;
  document.body.appendChild(overlay);
  const big = overlay.querySelector("img");
  const closeBtn = overlay.querySelector(".lightbox-close");
  let trigger = null;

  const open = (img) => {
    trigger = img;
    big.src = img.src;
    big.alt = img.alt;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  };
  const close = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
    trigger?.focus();
  };

  imgs.forEach((img) => {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", `View larger image: ${img.alt || "photo"}`);
    img.addEventListener("click", () => open(img));
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(img);
      }
    });
  });
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
});

// ปุ่มกลับขึ้นบนสุด — โผล่หลังเลื่อนลงมาระยะหนึ่ง
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.createElement("button");
  btn.className = "to-top";
  btn.type = "button";
  btn.setAttribute("aria-label", "Back to top");
  btn.textContent = "↑";
  btn.hidden = true;
  document.body.appendChild(btn);
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => { btn.hidden = window.scrollY < 600; }, { passive: true });
});

// Scrollspy: ไฮไลต์เมนูบน nav ตาม section ที่กำลังดูอยู่
document.addEventListener("DOMContentLoaded", () => {
  const links = [...document.querySelectorAll(".navlinks a[href^='#']")];
  if (!links.length || !("IntersectionObserver" in window)) return;
  const map = new Map();
  links.forEach((a) => {
    const sec = document.querySelector(a.getAttribute("href"));
    if (sec) map.set(sec, a);
  });
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        links.forEach((a) => a.classList.remove("active"));
        map.get(e.target)?.classList.add("active");
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  map.forEach((_, sec) => spy.observe(sec));
});


// นโยบายราคา: ไม่แสดงราคาห้องบนเว็บสาธารณะ (เงื่อนไข rate parity ของ OTA)
// แขกสอบถามราคาทาง LINE/WhatsApp แทน — ราคาในชีต (แท็บ Site) ยังใช้ในระบบหลังบ้านได้


// Vercel Web Analytics — ยอดเข้าชมหน้า + เหตุการณ์ที่บอกว่าแขก "ลงมือทำ" ไม่ใช่แค่เปิดหน้าแล้วปิด
// ไม่ส่งข้อมูลส่วนตัวใด ๆ เลย: ไม่มีชื่อ เบอร์โทร อีเมล วันเข้าพัก หรือเนื้อความที่แขกพิมพ์
// ส่งแค่ชื่อเหตุการณ์กับช่องทางที่ใช้ (line/whatsapp/mail) ซึ่งนับรวมแล้วไม่ชี้ตัวบุคคล
// Vercel เก็บ path โดยตัด query string ทิ้ง และไม่ใช้คุกกี้ติดตาม
(() => {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  document.head.appendChild(script);
})();

// ตัวส่งเหตุการณ์ — เงียบเสมอถ้า analytics ปิดอยู่หรือสคริปต์โหลดไม่ขึ้น ห้ามทำให้หน้าเว็บพัง
function hohTrack(name, data) {
  try { if (window.va) window.va("event", data ? { name, data } : { name }); } catch (e) { /* ไม่สนใจ */ }
}

// ผูกครั้งเดียวที่ document ครอบคลุมทุกหน้า และปุ่มที่หน้าอื่นสร้างทีหลังก็จับได้
document.addEventListener("click", (e) => {
  const a = e.target.closest("a, button");
  if (!a) return;
  // ปุ่มส่งในกล่องทางเลือก LINE บนคอม นับแยกจากลิงก์ LINE ปกติ
  const inFallback = !!a.closest(".line-fb");
  const href = a.getAttribute("href") || "";

  if (a.id === "btnLine" || a.id === "btnWa" || a.id === "btnMail" || a.id === "btnCopy") {
    if (a.getAttribute("aria-disabled") === "true") return; // ยังกรอกไม่ครบ กดไม่ติด ไม่ต้องนับ
    hohTrack("booking_sent", { via: { btnLine: "line", btnWa: "whatsapp", btnMail: "email", btnCopy: "copy" }[a.id] });
    return;
  }
  if (a.id === "rsSend" || a.id === "rsSendWa") {
    hohTrack("order_sent", { via: a.id === "rsSendWa" ? "whatsapp" : "line" });
    return;
  }
  if (href.includes("line.me/")) { hohTrack("line_click", { from: inFallback ? "desktop_fallback" : "link" }); return; }
  if (href.includes("wa.me/")) { hohTrack("whatsapp_click", { from: inFallback ? "desktop_fallback" : "link" }); return; }
  if (href.startsWith("mailto:")) { hohTrack("email_click", { from: inFallback ? "desktop_fallback" : "link" }); return; }
});

// สลับภาษา — ตอบคำถามว่าควรแยก URL ภาษาอังกฤษไหม ต้องรู้ก่อนว่ามีคนกดกี่คน
// ต้องดักในเฟส capture เพราะปุ่มใช้ onclick="setLang(...)" ซึ่งเปลี่ยน <html lang> ไปก่อน
// ถ้าดักตอน bubble จะเทียบภาษาเก่าไม่ได้แล้ว และจะไม่นับอะไรเลย
document.addEventListener("click", (e) => {
  const b = e.target.closest(".lang-toggle button[data-lang]");
  if (b && b.dataset.lang !== document.documentElement.lang) hohTrack("lang_switch", { to: b.dataset.lang });
}, true);

// มือถือ: ส่วนที่ยาวพับเก็บไว้ก่อน (แผนที่วาดมือ, วิธีเดินทาง) กดเปิดเมื่ออยากอ่าน — desktop เปิดค้างเสมอ
// ถ้าสคริปต์ไม่ทำงานทุกอย่างยังเปิดอยู่ตามเดิม (graceful)
document.addEventListener("DOMContentLoaded", () => {
  if (!window.matchMedia("(max-width: 640px)").matches) return;
  document.querySelectorAll("details.m-fold[open]").forEach((d) => d.removeAttribute("open"));
  // คำใบ้ "เลื่อนดู" ซ่อนหลังผู้ใช้เลื่อนรางครั้งแรก (บอกครั้งเดียวพอ)
  document.querySelectorAll(".rail").forEach((rail) => {
    const cue = rail.previousElementSibling;
    if (!cue || !cue.classList.contains("rail-cue")) return;
    rail.addEventListener("scroll", () => cue.classList.add("seen"), { once: true, passive: true });
  });
});

// บนคอมพิวเตอร์ ลิงก์ LINE เปิดไม่ได้ (แอปอยู่บนมือถือ) กดแล้วเงียบ
// หน้าจองกับหน้ารูมเซอร์วิสส่งข้อความที่ลูกค้ากรอกไว้ไปกับลิงก์ ถ้าเปิดไม่ติดข้อมูลหายทั้งก้อน
// จึงดักเฉพาะเครื่องที่ไม่ใช่มือถือ แล้วเปิดกล่องทางเลือก (QR / คัดลอกข้อความ / WhatsApp / อีเมล)
// มือถือไม่แตะต้อง — ลิงก์ยังเด้งเข้าแอป LINE เหมือนเดิม
(() => {
  const LINE_ID = "@060hvzok";
  const WA_NUMBER = "66994419465";
  const EMAIL = "houseofhapinessbangkok@gmail.com";

  const ua = navigator.userAgent || "";
  // iPadOS 13+ รายงานตัวเองเป็น Macintosh — ดูจากนิ้วสัมผัสเพิ่ม
  const isMobile = /Android|iPhone|iPad|iPod|Windows Phone|IEMobile/i.test(ua) ||
                   (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isMobile) return;

  const say = (key, fallback) => (typeof t === "function" ? t(key) : fallback);

  let box = null, msgWrap = null, msgBox = null, waBtn = null, mailBtn = null, openBtn = null, lastFocus = null;

  function build() {
    box = document.createElement("div");
    box.className = "line-fb";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "lineFbTitle");
    box.innerHTML =
      '<div class="line-fb-card">' +
        '<button class="line-fb-x" type="button" data-i18n="lf.close" data-i18n-attr="aria-label" aria-label="ปิด">✕</button>' +
        '<h3 id="lineFbTitle" data-i18n="lf.title">เปิด LINE บนคอมไม่ได้ใช่ไหม</h3>' +
        '<p class="line-fb-lead" data-i18n="lf.lead"></p>' +
        '<div class="line-fb-qr">' +
          '<img src="/images/line-qr.svg" alt="LINE QR ' + LINE_ID + '" width="150" height="150">' +
          '<p data-i18n="lf.qr"></p>' +
          '<p class="line-fb-idlabel" data-i18n="lf.idlabel"></p>' +
          '<p class="line-fb-id"><code>' + LINE_ID + '</code>' +
            '<button type="button" class="line-fb-copy" data-copy="id" data-i18n="lf.copyid">คัดลอกไอดี</button></p>' +
        '</div>' +
        '<div class="line-fb-msg" hidden>' +
          '<p data-i18n="lf.msglabel"></p>' +
          '<textarea readonly rows="5" aria-label="message"></textarea>' +
          '<button type="button" class="btn line-fb-copy line-fb-copymsg" data-copy="msg" data-i18n="lf.copymsg">คัดลอกข้อความ</button>' +
        '</div>' +
        '<p class="line-fb-altlabel" data-i18n="lf.altlabel"></p>' +
        '<div class="line-fb-alt">' +
          '<a class="btn btn-wa" target="_blank" rel="noopener" data-i18n="lf.wa">WhatsApp</a>' +
          '<a class="btn btn-mail" data-i18n="lf.mail">อีเมล</a>' +
        '</div>' +
        '<a class="line-fb-open" target="_blank" rel="noopener" data-i18n="lf.open"></a>' +
      '</div>';
    document.body.appendChild(box);
    msgWrap = box.querySelector(".line-fb-msg");
    msgBox = box.querySelector("textarea");
    waBtn = box.querySelector(".btn-wa");
    mailBtn = box.querySelector(".btn-mail");
    openBtn = box.querySelector(".line-fb-open");

    box.querySelector(".line-fb-x").addEventListener("click", close);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
      const f = [...box.querySelectorAll('button, a[href], textarea')].filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".line-fb-copy");
      if (!b) return;
      const text = b.dataset.copy === "msg" ? msgBox.value : LINE_ID;
      const done = () => {
        const before = b.textContent;
        b.textContent = say("lf.copied", "คัดลอกแล้ว");
        b.classList.add("ok");
        setTimeout(() => { b.textContent = before; b.classList.remove("ok"); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => selectFallback(b, text, done));
      } else selectFallback(b, text, done);
    });
    if (typeof applyLang === "function") applyLang();
  }

  // เบราว์เซอร์เก่า/หน้าที่ไม่ใช่ https — คลิปบอร์ด API ใช้ไม่ได้
  // เลือกตัวอักษรไว้ให้จริงก่อน แล้วค่อยสั่งคัดลอก ถ้ายังไม่ได้อย่างน้อยผู้ใช้กด Ctrl+C เองต่อได้
  function selectFallback(btn, text, done) {
    if (btn.dataset.copy === "msg") {
      msgBox.focus();
      msgBox.select();
    } else {
      const code = box.querySelector(".line-fb-id code");
      const r = document.createRange();
      r.selectNodeContents(code);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }
    try { if (document.execCommand("copy")) done(); } catch (e) { /* ผู้ใช้กด Ctrl+C เองได้ */ }
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true;
    document.body.style.overflow = "";
    lastFocus && lastFocus.focus();
  }

  // ดึงข้อความที่แนบมากับลิงก์ LINE ออกมา (รูปแบบ line.me/R/oaMessage/<id>/?<ข้อความ>)
  function messageOf(href) {
    const m = /line\.me\/R\/oaMessage\/[^/]+\/\?(.+)$/.exec(href);
    if (!m) return "";
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }

  function open(href) {
    if (!box) build();
    const msg = messageOf(href);
    msgWrap.hidden = !msg;
    msgBox.value = msg;
    waBtn.href = "https://wa.me/" + WA_NUMBER + (msg ? "?text=" + encodeURIComponent(msg) : "");
    const subject = say("lf.mailsub", "ติดต่อจากเว็บไซต์ House of Happiness");
    mailBtn.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) +
                   (msg ? "&body=" + encodeURIComponent(msg) : "");
    openBtn.href = href;
    lastFocus = document.activeElement;
    box.hidden = false;
    // วัดว่าปัญหา "กด LINE บนคอมแล้วเงียบ" เกิดขึ้นจริงบ่อยแค่ไหน และมีข้อความค้างอยู่ไหม
    hohTrack("line_desktop_fallback", { has_message: msg ? "yes" : "no" });
    document.body.style.overflow = "hidden";
    box.querySelector(".line-fb-x").focus();
  }

  document.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // ผู้ใช้ตั้งใจเปิดแท็บใหม่เอง
    const a = e.target.closest('a[href*="line.me/"]');
    if (!a || a.closest(".line-fb")) return;
    if (a.getAttribute("aria-disabled") === "true") return;
    e.preventDefault();
    open(a.href);
  });
})();
