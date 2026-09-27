/**
 * FAQ schema ต้องตรงกับ "ถามบ่อย" ที่แขกเห็นบนหน้า — ภาษาเดียวกัน คำเดียวกัน จำนวนเท่ากัน
 * (Google กำหนดไว้แบบนี้ ถ้าไม่ตรงอาจไม่แสดงผลแบบถาม-ตอบในผลค้นหา)
 *
 * เดิมแต่ละหน้าเขียน FAQPage schema แยกจากเนื้อหา ทำให้หลายหน้าไม่ตรงกัน:
 * หน้าไทยมี schema อังกฤษ, หน้าอังกฤษมี schema ไทย, บางหน้าคำถามไม่ครบ
 * ตอนนี้สร้าง schema จากคำถาม-คำตอบใน <details> ของหน้านั้นเสมอ
 *
 * ใช้ 2 ที่:
 *   - scripts/sync-faq.mjs  เขียน schema ภาษาไทยลงหน้าไทยที่ราก
 *   - scripts/build-en.mjs  เขียน schema ภาษาอังกฤษลงหน้าใน en/
 */

const plain = (html) => String(html || "")
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, " ")
  .trim();

// คำถาม-คำตอบของหน้า: <details> ที่มี <summary> และ <p> (ไม่นับกล่องพับเนื้อหา .m-fold ของหน้าแรก)
export function faqEntities(doc, dict, lang) {
  const out = [];
  for (const d of doc.querySelectorAll("details")) {
    if (d.classList.contains("m-fold")) continue;
    const s = d.querySelector("summary"), p = d.querySelector("p");
    if (!s || !p) continue;
    const pick = (el) => {
      const k = el.getAttribute("data-i18n");
      if (k && dict[k] && typeof dict[k][lang] === "string") return plain(dict[k][lang]);
      return plain(el.innerHTML);
    };
    const q = pick(s), a = pick(p);
    if (q && a) out.push({ q, a });
  }
  return out;
}

export function faqJson(entities) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entities.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  });
}

// แก้ใน DOM (ใช้กับหน้าอังกฤษที่ build-en สร้างใหม่ทั้งไฟล์อยู่แล้ว)
export function applyFaqToDoc(doc, entities) {
  const blocks = [...doc.querySelectorAll('script[type="application/ld+json"]')];
  const faq = blocks.find((s) => { try { return JSON.parse(s.textContent)["@type"] === "FAQPage"; } catch (e) { return false; } });
  if (!entities.length) { if (faq) faq.remove(); return; }
  if (faq) { faq.textContent = faqJson(entities); return; }
  const s = doc.createElement("script");
  s.setAttribute("type", "application/ld+json");
  s.textContent = faqJson(entities);
  const anchor = blocks[blocks.length - 1];
  if (anchor) anchor.after(s); else doc.head.appendChild(s);
}

// แก้ในข้อความดิบของไฟล์ (หน้าไทย — ไม่อยากให้ jsdom จัดรูปแบบไฟล์ทั้งไฟล์ใหม่)
export function applyFaqToHtml(html, entities) {
  const re = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>\n?/g;
  let faqMatch = null, lastEnd = -1;
  for (const m of html.matchAll(re)) {
    lastEnd = m.index + m[0].length;
    try { if (JSON.parse(m[1])["@type"] === "FAQPage") faqMatch = m; } catch (e) { /* ข้าม */ }
  }
  const block = entities.length ? `<script type="application/ld+json">\n${faqJson(entities)}\n</script>\n` : "";
  if (faqMatch) return html.slice(0, faqMatch.index) + block + html.slice(faqMatch.index + faqMatch[0].length);
  if (!block) return html;
  if (lastEnd >= 0) return html.slice(0, lastEnd) + block + html.slice(lastEnd);
  return html.replace("</head>", block + "</head>");
}
