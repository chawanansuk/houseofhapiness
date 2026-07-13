// Service worker ของหน้าหลังบ้าน — ให้ติดตั้งเป็นแอปได้และเปิดได้ไวขึ้น
// กลยุทธ์: network-first เสมอ (ข้อมูลการจองต้องสดใหม่) แล้วเก็บสำเนาไว้เปิดตอนเน็ตล่ม
const CACHE = "hoh-admin-v1";

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

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
