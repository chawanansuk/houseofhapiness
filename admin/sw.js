// Service worker ของหน้าหลังบ้าน — ให้ติดตั้งเป็นแอปได้และเปิดได้ไวขึ้น
// กลยุทธ์: network-first เสมอ (ข้อมูลการจองต้องสดใหม่) แล้วเก็บสำเนาไว้เปิดตอนเน็ตล่ม
const CACHE = "hoh-admin-v3";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // ไม่แคช API — ข้อมูลการจองต้องมาจากเซิร์ฟเวอร์เท่านั้น
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  // หน้าเว็บ (HTML) ต้องดึงจากเน็ตสด ๆ ข้ามแคช HTTP ของเบราว์เซอร์เสมอ กันหน้าหลังบ้านค้างเวอร์ชันเก่า
  const isDoc = e.request.mode === "navigate" || e.request.destination === "document";
  const netReq = isDoc ? new Request(e.request, { cache: "reload" }) : e.request;

  e.respondWith(
    fetch(netReq)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
