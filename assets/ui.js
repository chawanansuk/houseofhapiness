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
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
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


// ราคาจริงจากชีต (แท็บ Site) — อัปเดตทุกจุดที่ติด data-price="std|stu|dlx" ในทุกหน้า
// เจ้าของแก้ราคาในชีตที่เดียว ราคาบนหน้าแรก/หน้าห้อง/หน้า SEO เปลี่ยนตามเองใน ~2 นาที
document.addEventListener("DOMContentLoaded", () => {
  const els = document.querySelectorAll("[data-price]");
  if (!els.length) return;
  fetch("/api/site").then((r) => r.json()).then((j) => {
    if (!j.ok || j.source !== "sheet" || !j.prices) return;
    els.forEach((el) => {
      const p = j.prices[el.dataset.price];
      if (p > 0) el.textContent = "฿" + p.toLocaleString();
    });
  }).catch(() => {});
});


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
