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

// Lightbox: กดรูปในแกลเลอรีเพื่อดูขนาดใหญ่ ปิดด้วยการคลิกหรือปุ่ม Esc
document.addEventListener("DOMContentLoaded", () => {
  const imgs = document.querySelectorAll(".gallery img");
  if (!imgs.length) return;
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.innerHTML = '<img alt="">';
  overlay.hidden = true;
  document.body.appendChild(overlay);
  const big = overlay.querySelector("img");
  imgs.forEach((img) =>
    img.addEventListener("click", () => {
      big.src = img.src;
      big.alt = img.alt;
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
    }));
  const close = () => { overlay.hidden = true; document.body.style.overflow = ""; };
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
});
