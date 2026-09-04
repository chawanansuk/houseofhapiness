/* เอฟเฟกต์เลื่อนแล้วค่อยๆ ปรากฏ — ปิดอัตโนมัติถ้าผู้ใช้ตั้งค่า reduced motion */
document.addEventListener("DOMContentLoaded", () => {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05 });
  els.forEach((el) => io.observe(el));
  // ตัวกันพลาด: ถ้า observer ไม่ยิง (เลื่อนเร็วมาก / เบราว์เซอร์แปลก) ทุกส่วนที่เลื่อนผ่านมาแล้วต้องโชว์เสมอ
  // หน้าเว็บห้ามมีแถบว่างเพราะแอนิเมชันไม่ทำงาน
  const sweep = () => {
    const limit = window.innerHeight * 1.15;
    els.forEach((el) => { if (!el.classList.contains("visible") && el.getBoundingClientRect().top < limit) el.classList.add("visible"); });
  };
  let t;
  window.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(sweep, 120); }, { passive: true });
  setTimeout(sweep, 2500);
  window.addEventListener("beforeprint", () => els.forEach((el) => el.classList.add("visible")));
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


// Vercel Web Analytics: page views only, no custom events or booking/customer fields.
// Vercel reports page paths without query parameters and does not use tracking cookies.
(() => {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  document.head.appendChild(script);
})();
