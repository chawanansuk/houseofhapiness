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
