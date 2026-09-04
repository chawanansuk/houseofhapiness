/* ======================================================================
   HOH หลังบ้าน 2.0 — House of Happiness back office
   หน้าตา/พฤติกรรมตามต้นแบบ design/hoh-admin-redesign.html
   ข้อมูล/การบันทึกใช้ API เดิมทุกประการ: GET /api/data · POST /api/update
   ====================================================================== */
'use strict';

/* ---------- ค่าคงที่ (ชื่อ storage คงจากเวอร์ชันเดิม — ล็อกอิน/ธีมเดิมใช้ต่อได้) ---------- */
const KEY_STORE = "hoh-admin-key";
const DATA_CACHE = "hoh-admin-data";   // ข้อมูลรอบล่าสุด — เปิดหน้าใหม่โชว์ทันทีไม่ต้องรอชีต
const LAST_IMPORT = "hoh-last-import"; // วันที่นำเข้าไฟล์ Booking ครั้งล่าสุด (เตือนให้ทำรายสัปดาห์)
const THEME_KEY = "hoh-admin-theme";
const EXP_CATS = ["ค่าน้ำ", "ค่าไฟ", "เน็ต/เคเบิล", "เงินเดือน", "แม่บ้าน/ของใช้", "ซ่อมบำรุง", "ค่าคอม OTA", "การตลาด", "อื่นๆ"];
const MAP_LINK = "https://maps.google.com/?q=House%20of%20Happiness%20558%2F1%20Tha%20Din%20Daeng%20Khlong%20San%20Bangkok";
const $ = (id) => document.getElementById(id);

/* ---------- icons (inline, Lucide-style) ---------- */
const ICONS = {
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  timeline:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h10M3 12h16M3 18h7"/><rect x="15" y="4" width="6" height="4" rx="1"/><rect x="12" y="16" width="9" height="4" rx="1"/></svg>',
  grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  sparkle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M4 5v14a2 2 0 0 0 2 2h14V7"/><path d="M16 13h4v4h-4a2 2 0 0 1 0-4z"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
  logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  chevL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>',
  chevR:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  chevD:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
  checkCircle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  login:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5M15 12H3"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-5-6.7"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6.2 6.2l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  moon2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
  note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M6 11l6 6 6-6"/><path d="M4 21h16"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17V5M6 9l6-6 6 6"/><path d="M4 21h16"/></svg>',
  message:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-4.5A8 8 0 1 1 21 12z"/></svg>',
  move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  more:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  broom:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m20 3-9 9"/><path d="M11 12 7.5 8.5a2 2 0 0 0-2.8 0L3 10.2a1 1 0 0 0 0 1.4L12.4 21a1 1 0 0 0 1.4 0l1.7-1.7a2 2 0 0 0 0-2.8z"/></svg>',
  file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>',
};
Object.assign(ICONS, {
  printer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2"/><path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2"/><path d="M6.6 6.6C3.8 8.6 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/></svg>',
  wifiOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 5.2-2.7"/><path d="M19 12.5a10 10 0 0 0-2.4-1.7"/><path d="M2 8.8a15 15 0 0 1 4.4-2.6"/><path d="M22 8.8a15 15 0 0 0-11.3-3.6"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>',
  keyboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6"/></svg>',
  whatsapp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.6-4.7A9 9 0 1 1 8 19.6L3 21z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-1.9-1-1 .8a4 4 0 0 1-2.2-2.2l.8-1-1-1.9L9 9.5z"/></svg>',
});
const ic = n => `<span class="ic">${ICONS[n]||''}</span>`;
function paintIcons(root){ (root||document).querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = ICONS[el.dataset.ic] || ''; el.removeAttribute('data-ic'); }); }

/* ---------- date helpers (ไทย) ---------- */
const TH_MON_AB = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const TH_MON = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_DOW_AB = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
const TH_DOW = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const EN_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const isYMD = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
const toD = ymd => { const [y,m,d] = ymd.split('-').map(Number); return new Date(y, m-1, d); };
const toYMD = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
const addDays = (ymd, n) => { const d = toD(ymd); d.setDate(d.getDate()+n); return toYMD(d); };
const diffDays = (a, b) => Math.round((toD(b) - toD(a)) / 86400000);
const dow = ymd => toD(ymd).getDay();
const beYear = ymd => Number(ymd.slice(0,4)) + 543;
const fmtD = ymd => { if(!isYMD(ymd)) return '—'; const d = toD(ymd); return `${d.getDate()} ${TH_MON_AB[d.getMonth()]}`; };
const fmtDY = ymd => { if(!isYMD(ymd)) return '—'; const d = toD(ymd); return `${d.getDate()} ${TH_MON_AB[d.getMonth()]} ${String(beYear(ymd)).slice(2)}`; };
const fmtLong = ymd => { if(!isYMD(ymd)) return '—'; const d = toD(ymd); return `${TH_DOW[d.getDay()]} ${d.getDate()} ${TH_MON[d.getMonth()]} ${beYear(ymd)}`; };
const fmtEN = ymd => isYMD(ymd) ? `${Number(ymd.slice(8,10))} ${EN_MONTHS[Number(ymd.slice(5,7))-1]} ${ymd.slice(0,4)}` : '—';
const fmtMonth = ym => { const [y,m] = ym.split('-').map(Number); return `${TH_MON[m-1]} ${y+543}`; };
const fmtMonthAb = ym => { const [y,m] = ym.split('-').map(Number); return `${TH_MON_AB[m-1]} ${String(y+543).slice(2)}`; };
const daysInMonth = ym => { const [y,m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bahtNum = v => Number(String(v == null ? '' : v).replace(/[^\d.]/g, '')) || 0;
const baht = n => (n === '' || n == null || isNaN(Number(n))) ? '—' : Number(n).toLocaleString('th-TH');
const hasAmt = b => bahtNum(b.amount) > 0;
const fmtRange = (ci, co) => { if(!isYMD(ci)) return '—'; if(!isYMD(co)) return `${fmtD(ci)} → ?`; const a = toD(ci), b2 = toD(co); return a.getMonth()===b2.getMonth() ? `${a.getDate()}–${b2.getDate()} ${TH_MON_AB[a.getMonth()]}` : `${fmtD(ci)}–${fmtD(co)}`; };

/* ---------- ข้อมูลจริงจาก /api/data ---------- */
let DATA = null;          // payload ดิบ
let TODAY = toYMD(new Date());
let BOOKINGS = [];        // อ้าง object เดียวกับ DATA.bookings (mutate ในโหมดตัวอย่างได้)
let ROOMS = [];           // [{no,label,type,twin,tag}]
let CLEAN = {};           // {no:'dirty'}
let ROOM_NOTES = {};      // {no: note}
let SYNC_AT = '';
let SYNC_TS = 0;          // เวลาซิงก์ล่าสุด (ms) — ใช้ตัดสินว่าข้อมูลเก่าพอจะดึงใหม่ไหม

function roomMeta(no){
  const twin = /twin$/i.test(no);
  const label = twin ? no.replace(/twin$/i, '') : (no === '714-จองตรง' ? '714' : no);
  const tag = no === '714-จองตรง' ? 'จองตรง' : (/^งิ้ว/.test(no) ? 'ตึกงิ้ว' : '');
  return { no, label, twin, tag, type: twin ? 'ทวิน' : 'ดับเบิล' };
}
function adopt(j){
  DATA = j;
  TODAY = j.today || toYMD(new Date());
  BOOKINGS = j.bookings || [];
  ROOMS = (j.rooms || []).map(r => roomMeta(String(r.room || '').trim())).filter(r => r.no);
  CLEAN = {}; ROOM_NOTES = {};
  (j.rooms || []).forEach(r => {
    const no = String(r.room || '').trim();
    if (String(r.clean || '') === 'รอทำความสะอาด') CLEAN[no] = 'dirty';
    if (String(r.note || '').trim()) ROOM_NOTES[no] = String(r.note).trim();
  });
  SYNC_AT = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  SYNC_TS = Date.now();
}

const relDay = ymd => { if(!isYMD(ymd)) return ''; const n = diffDays(TODAY, ymd); if(n===0) return 'วันนี้'; if(n===1) return 'พรุ่งนี้'; if(n===-1) return 'เมื่อวาน'; if(n>1) return `อีก ${n} วัน`; return `${-n} วันก่อน`; };

/* ---------- ตัวจำแนกสถานะ (regex แบบเดิม — ทนสตริงที่พิมพ์เพี้ยนในชีต) ---------- */
const isCancelled = b => /ยกเลิก|cancel/i.test(String(b.status||''));
const isCheckedOut = b => /เช็คเอาต์|checked.?out/i.test(String(b.status||''));
const isInhouse = b => /เข้าพัก/.test(String(b.status||''));
const needsFix = b => !isCancelled(b) && (!isYMD(b.checkin) || !isYMD(b.checkout) || !String(b.name||'').trim());
const isPending = b => !isCancelled(b) && !isInhouse(b) && !isCheckedOut(b) && !needsFix(b) && /รอ|pending/i.test(String(b.status||''));
const isConfirmedSt = b => !isCancelled(b) && !isInhouse(b) && !isCheckedOut(b) && !needsFix(b) && !isPending(b);
const active = b => !isCancelled(b);
const isDirect = b => !/booking\.com/i.test(String(b.source||''));
const guestReqOf = b => { const m = String(b.note||'').match(/คำขอแขก:\s*([^|]*)/); return m ? m[1].trim() : ''; };
const noteWithoutReq = b => String(b.note||'').split('|').map(s=>s.trim()).filter(s=>s && s.indexOf('คำขอแขก:')!==0).join(' | ');

/* ---------- derived ---------- */
const roomOf = no => ROOMS.find(r => r.no===no);
const roomLabel = no => { const r = roomOf(no); return r ? r.label : (no || '—'); };
const effCheckout = b => isYMD(b.checkout) ? b.checkout : (isYMD(b.checkin) ? addDays(b.checkin, 1) : '');
const nightsOf = b => (isYMD(b.checkin) && effCheckout(b)) ? Math.max(1, diffDays(b.checkin, effCheckout(b))) : 1;
const bookingById = id => BOOKINGS.find(b => String(b.id)===String(id));
const displayName = b => String(b.name||'').trim() || `ไม่มีชื่อ · ${b.id}`;
const roomsCount = b => { const n = Number(b.rooms); return Number.isFinite(n) && n > 1 ? Math.floor(n) : 1; };
/* คืนที่มีแขกนอนจริง: รายการเช็คเอาต์แล้วยังนับคืนที่ผ่านมา (ประวัติ) แต่ไม่นับจากวันนี้ไป */
const coversNight = (b, ymd) => active(b) && isYMD(b.checkin) && b.checkin <= ymd && effCheckout(b) > ymd && !(isCheckedOut(b) && ymd >= TODAY);
const stayingOn = ymd => BOOKINGS.filter(b => coversNight(b, ymd));
const occupiedOn = ymd => stayingOn(ymd).reduce((s,b) => s + roomsCount(b), 0);
const overlaps = (b, ci, co) => isYMD(b.checkin) && b.checkin < co && effCheckout(b) > ci;
function roomBookings(no){ return BOOKINGS.filter(b => String(b.room_no||'')===no && active(b)); }
function roomFreeFor(no, ci, co, excludeId){
  return !roomBookings(no).some(b => String(b.id)!==String(excludeId) && !isCheckedOut(b) && overlaps(b, ci, co));
}
function roomState(no){
  const bs = roomBookings(no);
  const inHouse = bs.find(b => isInhouse(b) && isYMD(b.checkin) && b.checkin <= TODAY && effCheckout(b) >= TODAY);
  const arriving = bs.find(b => !isInhouse(b) && !isCheckedOut(b) && b.checkin===TODAY);
  const next = bs.filter(b => !isInhouse(b) && !isCheckedOut(b) && isYMD(b.checkin) && b.checkin > TODAY).sort((a,b)=>a.checkin<b.checkin?-1:1)[0];
  const dirty = CLEAN[no]==='dirty';
  let st = 'free';
  if(inHouse && effCheckout(inHouse)===TODAY) st = 'dep';
  else if(inHouse) st = 'occ';
  else if(arriving) st = 'arr';
  else if(dirty) st = 'dirty';
  return { state: st, inHouse, arriving, next, dirty };
}
const ST_LABEL = { free:'ว่าง', occ:'เข้าพักอยู่', arr:'เช็คอินวันนี้', dep:'เช็คเอาต์วันนี้', dirty:'รอทำความสะอาด' };
function statusPill(st){
  const s = String(st||'').trim();
  let cls = 'done', lbl = s || '—';
  if (/ยกเลิก|cancel/i.test(s)) { cls='cancel'; lbl='ยกเลิก'; }
  else if (/เข้าพัก/.test(s)) { cls='occ'; lbl='เข้าพักอยู่'; }
  else if (/เช็คเอาต์|checked.?out/i.test(s)) { cls='done'; lbl='เช็คเอาต์แล้ว'; }
  else if (/รอเติม/.test(s)) { cls='info'; lbl='รอเติมข้อมูล'; }
  else if (/รอ|pending/i.test(s)) { cls='pend'; lbl='รอยืนยัน'; }
  else if (/ยืนยัน/.test(s)) { cls='arr'; lbl='ยืนยันแล้ว'; }
  return `<span class="pill ${cls}">${esc(lbl)}</span>`;
}
function srcMark(b){ return isDirect(b) ? `<span class="src direct">${/เว็บไซต์/.test(String(b.source||''))?'เว็บไซต์':esc(b.source||'จองตรง')}</span>` : `<span class="src bdc">B.com</span>`; }
const reqBadge = b => { const r = guestReqOf(b); return r ? `<span class="req" title="${esc(r)}">⚠ ${esc(r.length>36?r.slice(0,36)+'…':r)}</span>` : ''; };
function todayQueue(){
  const arrivals = BOOKINGS.filter(b => active(b) && !isInhouse(b) && !isCheckedOut(b) && b.checkin===TODAY);
  const departures = BOOKINGS.filter(b => isInhouse(b) && effCheckout(b)===TODAY);
  const pending = BOOKINGS.filter(b => isPending(b));
  const needsInfo = BOOKINGS.filter(b => !isCancelled(b) && needsFix(b));
  const unassignedAll = BOOKINGS.filter(b => isConfirmedSt(b) && !String(b.room_no||'').trim() && effCheckout(b) > TODAY).sort((a,b)=>a.checkin<b.checkin?-1:1);
  const unassigned = unassignedAll.filter(b => b.checkin !== TODAY);
  const dirty = ROOMS.filter(r => CLEAN[r.no]==='dirty');
  const overdue = BOOKINGS.filter(b => isInhouse(b) && effCheckout(b) && effCheckout(b) < TODAY);
  return { arrivals, departures, pending, needsInfo, unassigned, unassignedAll, dirty, overdue };
}
function monthStats(ym){
  const dim = daysInMonth(ym), y = ym.slice(0,4), m = ym.slice(5,7);
  let nights = 0; const perDay = [];
  for(let d=1; d<=dim; d++){ const ymd = `${y}-${m}-${String(d).padStart(2,'0')}`; const n = occupiedOn(ymd); perDay.push(n); nights += n; }
  const count = BOOKINGS.filter(b => active(b) && String(b.checkin||'').startsWith(ym)).length;
  const income = BOOKINGS.filter(b => active(b) && String(b.checkin||'').startsWith(ym)).reduce((s,b)=>s+bahtNum(b.amount),0);
  const totalRooms = ROOMS.length || 1;
  return { nights, occ: Math.round(nights/(totalRooms*dim)*100), count, perDay, income };
}

/* ---------- state ---------- */
const state = {
  view:'today', q:'',
  tlStart: null, tlDays:14, tlCompact:false, trayOpen: (typeof innerWidth==='number' ? innerWidth >= 900 : true),
  assign:null, roomFilter:'all',
  calMonth: null, calDay: null,
  bkStatus:'all', bkSource:'', bkRange:'upcoming', bkCancel:false,
  expMonth: null,
};
const role = () => (DATA && DATA.role) || 'admin';
const isStaff = () => role() === 'staff';

/* ---------- toast & sheet ---------- */
let toastT;
function toast(msg, err){ const t = $('toast'); t.className = 'toast on' + (err?' err':''); t.innerHTML = ic(err?'alert':'checkCircle') + esc(msg); clearTimeout(toastT); toastT = setTimeout(()=> t.classList.remove('on'), 2800); }
function openSheet({title, sub, body, foot}){
  $('sheetTitle').innerHTML = title; $('sheetSub').innerHTML = sub||'';
  $('sheetBody').innerHTML = body; $('sheetFoot').innerHTML = foot || `<button class="btn" data-act="close-sheet">ปิด</button>`;
  $('sheet').classList.add('on'); $('backdrop').classList.add('on');
  $('sheetBody').scrollTop = 0;
  paintIcons($('sheet'));
}
function closeSheet(){ $('sheet').classList.remove('on'); $('backdrop').classList.remove('on'); }

/* ---------- api ---------- */
async function apiUpdate(body){
  const key = sessionStorage.getItem(KEY_STORE) || '';
  if (navigator.onLine === false) { toast('ออฟไลน์อยู่ — บันทึกไม่ได้ รอเน็ตกลับมาแล้วลองใหม่', true); return null; }
  try {
    const r = await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { toast(j.error || 'บันทึกไม่สำเร็จ', true); return null; }
    return j;
  } catch {
    toast('เชื่อมต่อไม่ได้', true); return null;
  }
}
// โหมดตัวอย่าง: แก้ในเครื่องให้เห็นผลทันที / โหมดจริง: ดึงข้อมูลใหม่จากชีต
async function afterAction(localMutate, msg){
  if (DATA.demo) {
    localMutate();
    render();
    toast(msg ? msg + ' (โหมดตัวอย่าง — ไม่ได้บันทึกจริง)' : 'โหมดตัวอย่าง — เห็นผลชั่วคราว ไม่ได้บันทึกจริง');
  } else {
    await reload();
    toast(msg || 'บันทึกแล้ว');
  }
}

/* ---------- navigation ---------- */
const VIEWS = { today:['วันนี้',''], timeline:['ไทม์ไลน์','ผังการเข้าพักรายห้อง'], rooms:['ผังห้อง','สถานะห้องตอนนี้ · แตะห้องเพื่อจัดการ'], clean:['แม่บ้าน','คิวทำความสะอาดวันนี้'], calendar:['ปฏิทิน','ความหนาแน่นผู้เข้าพักรายเดือน'], bookings:['รายการจอง',''], money:['รายรับ-รายจ่าย','เฉพาะเจ้าของ'] };
function go(v){ if(v==='money' && isStaff()) v='today'; state.view = v; try { if(location.hash !== '#'+v) history.replaceState(null,'','#'+v); } catch(e){} render(); window.scrollTo({top:0}); }
function renderNav(){
  const q = todayQueue();
  document.querySelectorAll('.nav a, .tabbar button').forEach(a => a.classList.toggle('on', a.dataset.view===state.view));
  document.body.classList.toggle('staff-mode', isStaff());
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hide', isStaff()));
  const tasks = q.arrivals.length + q.departures.length + q.pending.length + q.needsInfo.length + q.dirty.length + q.overdue.length;
  const set = (id, n, hot) => { const el = $(id); if(!el) return; el.textContent = n||''; el.classList.toggle('hot', !!hot && !!n); };
  set('navTodayCnt', tasks, true);
  set('navCleanCnt', q.dirty.length, q.dirty.some(r => roomState(r.no).arriving));
  set('navBookCnt', q.pending.length + q.needsInfo.length, false);
  const freeN = ROOMS.length - Math.min(ROOMS.length, occupiedOn(TODAY));
  set('navRoomsCnt', `${freeN} ว่าง`, false);
  const tb = $('tabTodayB'); tb.textContent = tasks; tb.classList.toggle('hide', !tasks);
  const cb = $('tabCleanB'); cb.textContent = q.dirty.length; cb.classList.toggle('hide', !q.dirty.length);
  $('userRole').textContent = isStaff() ? 'พนักงาน · ไม่เห็นการเงิน' : 'เจ้าของ · เห็นทุกเมนู';
  $('userAvatar').textContent = isStaff() ? 'S' : 'H';
  const dark = document.documentElement.dataset.theme==='dark';
  $('themeLbl').textContent = dark ? 'สว่าง' : 'มืด';
  $('themeBtn').querySelector('.ic').innerHTML = ICONS[dark?'sun':'moon'];
}
function lastImportLabel(){
  const d = localStorage.getItem(LAST_IMPORT);
  if (!isYMD(d)) return 'ยังไม่เคยนำเข้า';
  const n = diffDays(d, TODAY);
  return n <= 0 ? 'นำเข้า Booking วันนี้' : `นำเข้า Booking ${n} วันก่อน`;
}
function renderHead(){
  const [t, c] = VIEWS[state.view];
  $('vTitle').textContent = t;
  let ctx = c;
  if(state.view==='today') ctx = `${fmtLong(TODAY)}<span class="sync"> · <i></i>ซิงก์ล่าสุด ${esc(SYNC_AT)} · ${esc(lastImportLabel())}</span>`;
  if(state.view==='bookings') ctx = `${BOOKINGS.filter(active).length} รายการที่ไม่ยกเลิก · ${BOOKINGS.filter(b=>!active(b)).length} ยกเลิก`;
  $('vCtx').innerHTML = ctx;
  const chip = $('syncChip'); if(chip){ chip.innerHTML = `<i></i>${esc(SYNC_AT||'—')}`; chip.title = `ซิงก์ล่าสุด ${SYNC_AT} · แตะเพื่อรีเฟรช`; }
}
function render(){
  if (!DATA) return;
  renderNav(); renderHead();
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id==='view-'+state.view));
  ({ today:renderToday, timeline:renderTimeline, rooms:renderRooms, clean:renderClean, calendar:renderCalendar, bookings:renderBookings, money:renderMoney })[state.view]();
  paintIcons($('appView'));
}

/* ---------- TODAY ---------- */
function bookingRow(b, acts, opts={}){
  const r = String(b.room_no||'').trim() ? roomOf(b.room_no) : null;
  const roomCell = String(b.room_no||'').trim() ? `<div class="q-room ${r&&r.twin?'twin':''}">${esc(roomLabel(b.room_no))}</div>` : `<div class="q-room none">ยังไม่<br>จัดห้อง</div>`;
  const meta = [];
  meta.push(`<span>${ic('calendar')}${fmtD(b.checkin)} – ${fmtD(effCheckout(b))} · ${isYMD(b.checkout)?nightsOf(b)+' คืน':'ไม่ทราบวันออก'}</span>`);
  if(String(b.guests||'').trim()) meta.push(`<span>${ic('users')}${esc(b.guests)} คน</span>`);
  if(roomsCount(b) > 1) meta.push(`<span>× ${roomsCount(b)} ห้อง</span>`);
  if(String(b.phone||'').trim()) meta.push(`<span>${ic('phone')}${esc(b.phone)}</span>`);
  if(opts.amount && hasAmt(b) && !isStaff()) meta.push(`<span class="num">฿${baht(bahtNum(b.amount))}</span>`);
  const req = guestReqOf(b);
  if(req) meta.push(reqBadge(b));
  const nt = noteWithoutReq(b);
  if(nt && opts.note) meta.push(`<span title="${esc(nt)}">${ic('note')}${esc(nt.length>44?nt.slice(0,44)+'…':nt)}</span>`);
  return `<div class="q-row" data-act="open-booking" data-id="${esc(b.id)}">
    ${roomCell}
    <div style="min-width:0"><div class="q-name"><span class="nm">${esc(displayName(b))}</span>${srcMark(b)}${opts.pill?statusPill(b.status):''}</div><div class="q-meta">${meta.join('')}</div></div>
    <div class="q-acts">${acts}</div></div>`;
}
function renderToday(){
  const q = todayQueue();
  const tonight = Math.min(ROOMS.length, occupiedOn(TODAY)), free = ROOMS.length - tonight;
  const tiles = [
    ['arr','เช็คอินวันนี้', q.arrivals.length, q.arrivals.filter(b=>!String(b.room_no||'').trim()).length ? `${q.arrivals.filter(b=>!String(b.room_no||'').trim()).length} ยังไม่จัดห้อง` : (q.arrivals.length?'จัดห้องครบแล้ว':'ไม่มีแขกเข้า'), '#g-arr'],
    ['dep','เช็คเอาต์วันนี้', q.departures.length, q.departures.length ? 'ห้องจะเข้าคิวทำความสะอาด' : 'ไม่มีแขกออก', '#g-dep'],
    ['pend','จองตรงรอยืนยัน', q.pending.length, q.pending.length ? `ใกล้สุด ${relDay(q.pending.map(b=>b.checkin).filter(isYMD).sort()[0]) || '—'}` : 'ไม่มีค้าง', '#g-pend'],
    ['info','รอเติมข้อมูล / รอจัดห้อง', q.needsInfo.length + q.unassigned.length, q.needsInfo.length ? `${q.needsInfo.length} รอเติมจาก Pulse` : (q.unassigned.length?`ใกล้สุด ${relDay(q.unassigned[0].checkin)}`:'ครบแล้ว'), q.needsInfo.length ? '#g-info' : '#g-un'],
    ['dirty','รอทำความสะอาด', q.dirty.length, q.dirty.some(r=>roomState(r.no).arriving) ? 'มีห้องที่แขกจะเข้าวันนี้' : (q.dirty.length?'ยังไม่ด่วน':'สะอาดหมด'), '#g-dirty'],
  ];
  $('tiles').innerHTML = tiles.map(([cls,lbl,n,hint,anchor]) => `<button class="tile ${n?'hot':'zero'}" data-act="scroll" data-to="${anchor}"><span class="lbl"><i class="dot ${cls}"></i>${lbl}</span><span class="val">${n}</span><span class="hint">${hint}</span><span class="go">${ic('arrow')}</span></button>`).join('');

  // แบนเนอร์สั้น ๆ: โหมดตัวอย่าง / เตือนนำเข้าไฟล์ Booking รายสัปดาห์
  const notes = [];
  if (DATA.demo) notes.push(`<div class="notebox2">โหมดตัวอย่าง — ข้อมูลจำลอง แก้อะไรจะเห็นผลชั่วคราวแต่ไม่บันทึกจริง</div>`);
  const li = localStorage.getItem(LAST_IMPORT);
  if (!DATA.demo && (!isYMD(li) || diffDays(li, TODAY) >= 7)) notes.push(`<div class="notebox2 plain">📄 ${esc(lastImportLabel())} — แนะนำนำเข้าไฟล์จาก Booking.com Extranet สัปดาห์ละครั้ง เพื่อเติมชื่อ/วันที่/ยอดที่อีเมลไม่บอก <button data-act="open-import">นำเข้าเลย</button></div>`);
  if (DATA.sources && DATA.sources.sheet === false) notes.push(`<div class="notebox2">เชื่อมต่อชีตไม่ได้ (${esc(DATA.sources.sheetError||'')}) — ข้อมูลที่เห็นอาจไม่ใช่ล่าสุด</div>`);
  $('todayNotes').innerHTML = notes.join('');

  const groups = [];
  const g = (id, title, items, empty) => groups.push(`<div class="q-group" id="${id}"><div class="q-head">${title}<span class="n">${items.length}</span></div>${items.length ? items.join('') : `<div class="q-empty">${ic('checkCircle')}${empty}</div>`}</div>`);
  if(q.overdue.length) g('g-over','เลยวันเช็คเอาต์ — ยังไม่ได้กดเช็คเอาต์', q.overdue.map(b => bookingRow(b, `<button class="btn sm primary" data-act="checkout" data-id="${esc(b.id)}">เช็คเอาต์</button>`)), '');
  g('g-arr','มาถึงวันนี้', q.arrivals.map(b => bookingRow(b, String(b.room_no||'').trim()
      ? (CLEAN[b.room_no]==='dirty' ? `<span class="pill dirty">ห้องยังไม่สะอาด</span><button class="btn sm" data-act="checkin" data-id="${esc(b.id)}">เช็คอิน</button>` : `<button class="btn sm primary" data-act="checkin" data-id="${esc(b.id)}">${ic('login')}เช็คอิน</button>`)
      : `<button class="btn sm warn" data-act="assign" data-id="${esc(b.id)}">${ic('move')}จัดห้อง</button>`, {note:true})), 'ไม่มีแขกเข้าวันนี้');
  g('g-dep','ออกวันนี้', q.departures.map(b => bookingRow(b, `<button class="btn sm primary" data-act="checkout" data-id="${esc(b.id)}">เช็คเอาต์</button>`, {note:true})), 'ไม่มีแขกออกวันนี้');
  g('g-pend','จองตรงรอยืนยัน', q.pending.slice().sort((a,b)=>String(a.checkin)<String(b.checkin)?-1:1).map(b => bookingRow(b, `<button class="btn sm ghost" data-act="msg" data-id="${esc(b.id)}" aria-label="ข้อความยืนยัน">${ic('message')}</button><button class="btn sm good" data-act="confirm-open" data-id="${esc(b.id)}">${ic('check')}ยืนยัน</button>`, {amount:true, note:true})), 'ไม่มีรายการรอยืนยัน');
  g('g-un','รอจัดห้อง (ยืนยันแล้ว · วันถัดไป)', q.unassigned.map(b => bookingRow(b, `<span class="faint" style="font-size:12px">${relDay(b.checkin)}</span><button class="btn sm" data-act="assign" data-id="${esc(b.id)}">${ic('move')}จัดห้อง</button>`)), 'จัดห้องครบทุกรายการ');
  g('g-info','รอเติมข้อมูลจาก Pulse', q.needsInfo.map(b => bookingRow(b, `<button class="btn sm soft" data-act="edit" data-id="${esc(b.id)}">${ic('edit')}เติมข้อมูล</button>`, {note:true, pill:true})), 'ข้อมูลครบทุกรายการ');
  g('g-dirty','รอทำความสะอาด', q.dirty.slice().sort((a,b)=> (roomState(b.no).arriving?1:0) - (roomState(a.no).arriving?1:0)).map(r => { const rs = roomState(r.no); return `<div class="q-row" data-act="open-room" data-no="${esc(r.no)}"><div class="q-room">${esc(roomLabel(r.no))}</div><div><div class="q-name">${rs.arriving ? `<span class="pill dirty">ด่วน — แขกเข้าวันนี้</span>` : `<span class="pill dirty">รอทำความสะอาด</span>`}</div><div class="q-meta">${rs.arriving ? `<span>${esc(displayName(rs.arriving))} เช็คอินวันนี้</span>` : (rs.next ? `<span>แขกถัดไป ${fmtD(rs.next.checkin)} (${relDay(rs.next.checkin)})</span>` : '<span>ยังไม่มีแขกถัดไป</span>')}</div></div><div class="q-acts"><button class="btn sm good" data-act="clean-done" data-no="${esc(r.no)}">${ic('check')}สะอาดแล้ว</button></div></div>`; }), 'ทุกห้องสะอาดแล้ว');
  $('queue').innerHTML = `<div class="card-h" style="padding-bottom:6px"><h2>คิวงานวันนี้</h2><span class="sub">เรียงตามความเร่งด่วน</span><span class="grow"></span><button class="btn ghost sm" data-act="summary" title="สรุปงานวันนี้เป็นข้อความ — คัดลอกไปวางในกลุ่ม LINE ทีมงาน">${ic('copy')}สรุปส่ง LINE</button></div>` + groups.join('');

  // สถานะบ้าน
  const counts = { free:0, occ:0, arr:0, dep:0, dirty:0 }; ROOMS.forEach(r => counts[roomState(r.no).state]++);
  $('houseSub').textContent = `พักคืนนี้ ${tonight} · ว่างคืนนี้ ${free} จาก ${ROOMS.length} ห้อง`;
  const order = ['occ','dep','arr','dirty','free'];
  $('house').innerHTML = `<div class="house-bar">${order.filter(k=>counts[k]).map(k => `<i style="flex:${counts[k]};background:var(--${k})" title="${ST_LABEL[k]} ${counts[k]}"></i>`).join('')}</div>
    <div class="house-legend">${order.map(k => `<span><i class="dot ${k}"></i>${ST_LABEL[k]}<b>${counts[k]}</b></span>`).join('')}</div>
    <div class="mini-grid">${ROOMS.map(r => `<button class="${roomState(r.no).state}" data-act="open-room" data-no="${esc(r.no)}" title="${esc(roomLabel(r.no))} · ${ST_LABEL[roomState(r.no).state]}">${esc(roomLabel(r.no))}</button>`).join('')}</div>`;

  // 7 วันข้างหน้า
  const days = Array.from({length:7}, (_,i) => addDays(TODAY, i));
  $('week').innerHTML = `<div class="week">${days.map(d => { const ins = BOOKINGS.filter(b => active(b) && !isCheckedOut(b) && b.checkin===d).length; const outs = BOOKINGS.filter(b => active(b) && !isCheckedOut(b) && effCheckout(b)===d).length; const oc = occupiedOn(d); return `<button data-act="cal-day" data-d="${d}" class="${d===TODAY?'today':''}"><div class="d">${TH_DOW_AB[dow(d)]}</div><div class="dd">${toD(d).getDate()}</div><div class="oc">${oc}/${ROOMS.length}</div><div class="io"><span class="in">↓${ins}</span><span class="out">↑${outs}</span></div></button>`; }).join('')}</div>`;

  // เดือนนี้ + sparkline
  const ms = monthStats(TODAY.slice(0,7));
  $('mstatTitle').textContent = fmtMonth(TODAY.slice(0,7));
  $('mstatSub').textContent = 'ทั้งเดือน (รวมที่จองล่วงหน้า)';
  const dim = ms.perDay.length, todayIdx = Number(TODAY.slice(8,10))-1, max = Math.max(ROOMS.length, ...ms.perDay, 1);
  $('mstat').innerHTML = `<div class="mstat"><div><div class="v">${ms.nights}</div><div class="l">คืนที่ขายได้</div></div><div><div class="v">${ms.occ}%</div><div class="l">อัตราเข้าพัก</div></div><div><div class="v">${ms.count}</div><div class="l">การจอง (เข้าพักเดือนนี้)</div></div></div>
    <div class="spark">${ms.perDay.map((n,i) => `<i style="height:${Math.max(3, n/max*100)}%" class="${i===todayIdx?'today':(i>todayIdx?'future':'')}" data-t="${i+1} ${TH_MON_AB[Number(TODAY.slice(5,7))-1]} · ${n} ห้อง"></i>`).join('')}</div>
    <div class="spark-axis"><span>1 ${TH_MON_AB[Number(TODAY.slice(5,7))-1]}</span><span>ห้องที่มีแขกพัก / คืน</span><span>${dim}</span></div>`;
}

/* ---------- TIMELINE ---------- */
function renderTimeline(){
  if (!state.tlStart) state.tlStart = addDays(TODAY, -1);
  const days = Array.from({length: state.tlDays}, (_,i) => addDays(state.tlStart, i));
  const end = addDays(state.tlStart, state.tlDays);
  $('tlRange').textContent = `${fmtDY(days[0])} – ${fmtDY(days[days.length-1])}`;
  document.querySelectorAll('.seg [data-days]').forEach(b => b.classList.toggle('on', Number(b.dataset.days)===state.tlDays));
  // ถาดรอจัดห้อง
  const q = todayQueue();
  const tray = $('tlTray');
  tray.classList.toggle('open', state.trayOpen);
  const un = q.unassignedAll;
  tray.innerHTML = `<div class="tray-h" data-act="toggle-tray"><h3>${ic('move')}รอจัดห้อง <span class="n">${un.length}</span></h3><span class="hint">เลือกชื่อ แล้วแตะช่วงเส้นประในห้องที่ว่าง</span><span class="caret">${ic('chevD')}</span></div>
    <div class="tray-b">${un.length ? un.map(b => `<button class="ub ${state.assign===b.id?'on':''}" data-act="assign" data-id="${esc(b.id)}"><span class="dt">${fmtRange(b.checkin, effCheckout(b))}</span><span class="nm">${esc(displayName(b))}</span>${srcMark(b)}</button>`).join('') : `<span class="faint">ทุกการจองมีห้องแล้ว</span>`}</div>`;
  // ตาราง
  const cell = state.tlCompact ? 56 : (innerWidth < 900 ? 72 : 96);
  const wrap = $('tl');
  wrap.classList.toggle('compact', state.tlCompact);
  wrap.style.setProperty('--cell', cell+'px');
  const assignB = state.assign && bookingById(state.assign);
  const head = `<div class="tl-head"><div class="tl-corner">ห้อง</div><div class="tl-days">${days.map(d => `<div class="tl-day ${d===TODAY?'today':''} ${dow(d)===0||dow(d)===6?'we':''}"><div class="dn">${toD(d).getDate()} ${TH_MON_AB[toD(d).getMonth()]}</div><div class="dw">${TH_DOW_AB[dow(d)]}</div><div class="oc">${occupiedOn(d)} พัก</div></div>`).join('')}</div></div>`;
  const rows = ROOMS.map(r => {
    const rs = roomState(r.no);
    const bars = roomBookings(r.no).filter(b => overlaps(b, state.tlStart, end)).map(b => {
      const s = Math.max(0, diffDays(state.tlStart, b.checkin)), e = Math.min(state.tlDays, diffDays(state.tlStart, effCheckout(b)));
      const contL = b.checkin < state.tlStart, contR = effCheckout(b) > end;
      const left = s*cell + (contL?0:cell*0.5), width = (e-s)*cell - (contL?0:cell*0.5) - (contR?0:cell*0.5) - 2;
      const cls = isInhouse(b) ? 'occ' : isCheckedOut(b) ? 'done' : isPending(b) ? 'pend' : 'arr';
      const w = Math.max(width, 28);
      const req = guestReqOf(b);
      const label = w < 56 ? '' : (w < 120 ? esc(displayName(b).split(' ')[0]) : (req?'⚠ ':'')+esc(displayName(b)));
      return `<button class="bar ${cls} ${contL?'cont-l':''} ${contR?'cont-r':''}" style="left:${left}px;width:${w}px" data-act="open-booking" data-id="${esc(b.id)}" title="${esc(displayName(b))} · ${fmtD(b.checkin)}–${fmtD(effCheckout(b))} · ${esc(b.status||'')}${req?' · ⚠ '+esc(req):''}" aria-label="${esc(displayName(b))}"><span class="nm">${label}</span>${w >= 150 ? `<span class="nt">${nightsOf(b)} คืน</span>` : ''}</button>`;
    }).join('');
    let ghost = '';
    if(assignB && isYMD(assignB.checkin) && roomFreeFor(r.no, assignB.checkin, effCheckout(assignB), assignB.id) && overlaps(assignB, state.tlStart, end)){
      const s = Math.max(0, diffDays(state.tlStart, assignB.checkin)), e = Math.min(state.tlDays, diffDays(state.tlStart, effCheckout(assignB)));
      ghost = `<button class="tl-ghost" style="left:${s*cell+cell*0.5}px;width:${Math.max((e-s)*cell-2, 60)}px" data-act="assign-to" data-no="${esc(r.no)}">${ic('plus')}จัดเข้าห้องนี้</button>`;
    }
    const cells = assignB ? '' : days.map((d,i) => `<button class="tl-cellbtn" style="left:${i*cell}px" data-act="new-at" data-no="${esc(r.no)}" data-d="${d}" aria-label="จองห้อง ${esc(roomLabel(r.no))} วันที่ ${fmtD(d)}"></button>`).join('');
    const we = days.map((d,i) => (dow(d)===0||dow(d)===6) ? `<div class="we" style="left:${i*cell}px;width:${cell}px"></div>` : '').join('');
    const ti = days.indexOf(TODAY);
    const todayline = ti>=0 ? `<div class="todayline" style="left:${ti*cell+cell*0.5}px"></div>` : '';
    return `<div class="tl-row" data-rowno="${esc(r.no)}"><div class="tl-roomcell" data-act="open-room" data-no="${esc(r.no)}" style="cursor:pointer"><i class="dot ${rs.state}" title="${ST_LABEL[rs.state]}"></i>${esc(roomLabel(r.no))}${r.twin?'<span class="tag">TWIN</span>':''}${r.tag?`<span class="tag">${esc(r.tag)}</span>`:''}</div><div class="tl-track" style="width:${state.tlDays*cell}px">${we}${todayline}${cells}${bars}${ghost}</div></div>`;
  }).join('');
  wrap.innerHTML = head + rows;
  wrap.dataset.cell = cell;
}

/* ---------- ROOMS ---------- */
function renderRooms(){
  const states = ROOMS.map(r => ({r, rs: roomState(r.no)}));
  const counts = { all: ROOMS.length }; states.forEach(({rs}) => counts[rs.state] = (counts[rs.state]||0)+1);
  const filters = [['all','ทั้งหมด'],['free','ว่าง'],['occ','เข้าพักอยู่'],['arr','เช็คอินวันนี้'],['dep','เช็คเอาต์วันนี้'],['dirty','รอทำความสะอาด']];
  $('roomFilters').innerHTML = filters.map(([k,l]) => `<button class="chip ${state.roomFilter===k?'on':''}" data-act="room-filter" data-k="${k}">${k!=='all'?`<i class="dot ${k}"></i>`:''}${l}<span class="n">${counts[k]||0}</span></button>`).join('');
  const assignB = state.assign && bookingById(state.assign);
  $('roomGrid').innerHTML = states.filter(({rs}) => state.roomFilter==='all' || rs.state===state.roomFilter).map(({r, rs}) => {
    const assignable = assignB && isYMD(assignB.checkin) && roomFreeFor(r.no, assignB.checkin, effCheckout(assignB), assignB.id);
    const cls = assignB ? (assignable ? 'assignable' : 'dim') : rs.state;
    let body = '';
    if(rs.inHouse){ const b = rs.inHouse; const night = diffDays(b.checkin, TODAY)+1; body = `<div class="room-guest">${esc(displayName(b))}</div><div class="room-sub">${ic('moon2')}<span>คืนที่ ${Math.min(night, nightsOf(b))}/${nightsOf(b)} · ออก ${fmtD(effCheckout(b))}${effCheckout(b)===TODAY?' (วันนี้)':''}</span></div>${String(b.guests||'').trim()?`<div class="room-sub">${ic('users')}<span>${esc(b.guests)} คน ${srcMark(b)}</span></div>`:''}`; }
    else if(rs.arriving){ const b = rs.arriving; const nt = noteWithoutReq(b) || guestReqOf(b); body = `<div class="room-guest">${esc(displayName(b))}</div><div class="room-sub">${ic('login')}<span>เข้าวันนี้ · ${nightsOf(b)} คืน ${srcMark(b)}</span></div>${nt?`<div class="room-sub" title="${esc(nt)}">${ic('note')}<span>${esc(nt.slice(0,28))}${nt.length>28?'…':''}</span></div>`:''}`; }
    else { body = `<div class="room-guest faint" style="font-weight:500">ว่าง${rs.next?` ถึง ${fmtD(rs.next.checkin)}`:''}</div>${rs.next?`<div class="room-sub">${ic('clock')}<span>ถัดไป ${esc(displayName(rs.next))} · ${relDay(rs.next.checkin)}</span></div>`:`<div class="room-sub">${ic('clock')}<span>ยังไม่มีการจองถัดไป</span></div>`}`; }
    const flag = rs.dirty && rs.state!=='dirty' ? `<div class="room-flag">${ic('broom')}รอทำความสะอาด${rs.arriving?' — ด่วน':''}</div>` : (rs.state==='dep' && rs.next && rs.next.checkin===TODAY ? `<div class="room-flag">${ic('alert')}แขกใหม่เข้าวันนี้ต่อ</div>` : (ROOM_NOTES[r.no] ? `<div class="room-flag next">${ic('note')}${esc(ROOM_NOTES[r.no])}</div>` : ''));
    return `<button class="room ${cls}" data-act="${assignB?'assign-to':'open-room'}" data-no="${esc(r.no)}"><div class="room-top"><span class="st">${assignB ? (assignable?'ว่างช่วงนี้ — แตะเพื่อจัด':'ไม่ว่าง') : ST_LABEL[rs.state]}</span>${r.twin?'<span>TWIN</span>':(r.tag?`<span>${esc(r.tag)}</span>`:'')}</div><div class="room-body"><div class="room-no">${esc(roomLabel(r.no))}<small>${esc(r.type)}</small></div>${body}${flag}</div></button>`;
  }).join('') || `<div class="empty">${ic('checkCircle')}<b>ไม่มีห้องในสถานะนี้</b></div>`;
  const un = todayQueue().unassignedAll;
  $('unassignedSub').textContent = un.length ? `${un.length} รายการ · เลือกชื่อแล้วแตะห้อง` : 'ครบทุกรายการ';
  $('unassignedList').innerHTML = un.length ? `<div class="ub-list">${un.map(b => `<button class="ub ${state.assign===b.id?'on':''}" data-act="assign" data-id="${esc(b.id)}"><span class="dt">${fmtRange(b.checkin, effCheckout(b))}</span><span class="nm">${esc(displayName(b))}${b.checkin===TODAY?' <span class="pill arr plain" style="height:18px">วันนี้</span>':''}</span>${srcMark(b)}</button>`).join('')}</div>` : `<div class="empty" style="padding:12px">${ic('checkCircle')}<b>ทุกการจองมีห้องแล้ว</b></div>`;
  $('roomLegend').innerHTML = ['free','occ','arr','dep','dirty'].map(k => `<span><i class="dot ${k}"></i>${ST_LABEL[k]}<b>${counts[k]||0}</b></span>`).join('');
}

/* ---------- CLEAN ---------- */
function renderClean(){
  const dirty = ROOMS.filter(r => CLEAN[r.no]==='dirty').map(r => ({r, rs: roomState(r.no)})).sort((a,b) => (b.rs.arriving?2:b.rs.next?1:0) - (a.rs.arriving?2:a.rs.next?1:0));
  $('dirtySub').textContent = dirty.length ? `${dirty.length} ห้อง · ห้องที่แขกจะเข้าวันนี้ขึ้นก่อน` : 'ไม่มีห้องค้าง';
  $('dirtyList').innerHTML = dirty.length ? dirty.map(({r, rs}) => `<div class="hk-card ${rs.arriving?'urgent':''}"><div class="hk-no">${esc(roomLabel(r.no))}</div><div><div class="hk-title">${rs.arriving ? `ด่วน — ${esc(displayName(rs.arriving))} เช็คอินวันนี้` : (rs.next ? `แขกถัดไป ${fmtD(rs.next.checkin)} (${relDay(rs.next.checkin)})` : 'ยังไม่มีแขกถัดไป')}</div><div class="hk-sub">${esc(r.type)}${r.twin?' · 2 เตียง':''} · แขกก่อนหน้าออก ${(() => { const last = roomBookings(r.no).filter(b => isCheckedOut(b) && isYMD(b.checkout)).sort((a,b)=>a.checkout<b.checkout?1:-1)[0]; return last ? (relDay(last.checkout)||fmtD(last.checkout)) : '—'; })()}${rs.arriving && guestReqOf(rs.arriving) ? ` · <b>⚠ ${esc(guestReqOf(rs.arriving))}</b>`:''}</div></div><button class="btn good lg" data-act="clean-done" data-no="${esc(r.no)}">${ic('check')}สะอาดแล้ว</button></div>`).join('') : `<div class="empty">${ic('checkCircle')}<b>ทุกห้องสะอาดแล้ว</b><span>เมื่อแขกเช็คเอาต์ ห้องจะเข้าคิวที่นี่อัตโนมัติ</span></div>`;
  const q = todayQueue();
  $('departList').innerHTML = q.departures.length ? q.departures.map(b => `<div><span class="rm">${esc(roomLabel(b.room_no))}</span><span>${esc(displayName(b))}</span>${statusPill(b.status)}<span class="tm">${/สาย|late/i.test(String(b.note||'')) ? 'ขอออกสาย' : 'ออกก่อน 12:00'}</span></div>`).join('') : `<div class="faint" style="padding:10px 16px 14px;font-size:13px">ไม่มีแขกเช็คเอาต์วันนี้</div>`;
  $('cleanGrid').innerHTML = ROOMS.filter(r => CLEAN[r.no]!=='dirty').map(r => { const rs = roomState(r.no); return `<button class="${rs.inHouse?'occ-now':''}" data-act="clean-flag" data-no="${esc(r.no)}">${esc(roomLabel(r.no))}<small>${rs.inHouse ? 'มีแขกพัก' : rs.arriving ? 'เข้าวันนี้' : 'ว่าง'}</small></button>`; }).join('');
}

/* ---------- CALENDAR ---------- */
function renderCalendar(){
  if (!state.calMonth) { state.calMonth = TODAY.slice(0,7); state.calDay = TODAY; }
  const ym = state.calMonth, dim = daysInMonth(ym), first = dow(ym+'-01');
  $('calTitle').textContent = fmtMonth(ym);
  const cells = ['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => `<div class="dow">${d}</div>`);
  for(let i=0;i<first;i++) cells.push('<div class="day pad"></div>');
  const totalRooms = ROOMS.length || 1;
  for(let d=1; d<=dim; d++){
    const ymd = `${ym}-${String(d).padStart(2,'0')}`; const oc = occupiedOn(ymd);
    const ins = BOOKINGS.filter(b => active(b) && b.checkin===ymd).length, outs = BOOKINGS.filter(b => active(b) && effCheckout(b)===ymd).length;
    const pct = Math.min(100, oc/totalRooms*100);
    cells.push(`<button class="day ${ymd===TODAY?'today':''} ${ymd===state.calDay?'on':''} ${dow(ymd)===0||dow(ymd)===6?'we':''}" data-act="cal-day" data-d="${ymd}"><span class="dn">${d}</span><span class="oc"><b>${oc}</b>/${totalRooms}</span><span class="io">${ins?`<span class="in">↓${ins}</span>`:''}${outs?`<span class="out">↑${outs}</span>`:''}</span><span class="meter"><i class="${pct>=75?'hi':''}" style="width:${pct}%"></i></span></button>`);
  }
  $('cal').innerHTML = cells.join('');
  const d = state.calDay;
  $('dayTitle').textContent = `${fmtLong(d)}${relDay(d)?' · '+relDay(d):''}`;
  const ins = BOOKINGS.filter(b => active(b) && b.checkin===d), outs = BOOKINGS.filter(b => active(b) && effCheckout(b)===d), stay = stayingOn(d).filter(b => b.checkin!==d);
  const row = b => `<div class="row" data-act="open-booking" data-id="${esc(b.id)}" style="cursor:pointer"><span class="rm ${String(b.room_no||'').trim()?'':'none'}">${String(b.room_no||'').trim()?esc(roomLabel(b.room_no)):'ไม่มีห้อง'}</span><span><b style="font-weight:600">${esc(displayName(b))}</b> <span class="faint">· ${nightsOf(b)} คืน</span> ${statusPill(b.status)}</span></div>`;
  $('dayDetail').innerHTML = `<h4>เข้า (${ins.length})</h4>${ins.map(row).join('')||'<div class="faint" style="font-size:13px">—</div>'}<h4>ออก (${outs.length})</h4>${outs.map(row).join('')||'<div class="faint" style="font-size:13px">—</div>'}<h4>พักต่อเนื่อง (${stay.length})</h4>${stay.map(row).join('')||'<div class="faint" style="font-size:13px">—</div>'}`;
}

/* ---------- BOOKINGS ---------- */
function stKey(b){
  if (isCancelled(b)) return 'cancel';
  if (isInhouse(b)) return 'inhouse';
  if (isCheckedOut(b)) return 'out';
  if (needsFix(b)) return 'needsinfo';
  if (isPending(b)) return 'pending';
  return 'confirmed';
}
function bkFiltered(){
  const q = state.q.trim().toLowerCase();
  return BOOKINGS.filter(b => {
    if(!state.bkCancel && !active(b) && !q) return false;
    if(state.bkSource==='Booking.com' && isDirect(b)) return false;
    if(state.bkSource==='direct' && !isDirect(b)) return false;
    if(!q){
      if(state.bkRange==='upcoming' && !(needsFix(b) || effCheckout(b) >= TODAY || isInhouse(b))) return false;
      if(state.bkRange==='past' && !(effCheckout(b) && effCheckout(b) < TODAY)) return false;
    }
    if(q && ![b.name, b.phone, b.id, b.room_no, roomLabel(b.room_no), b.note, b.source].some(v => String(v||'').toLowerCase().includes(q))) return false;
    return true;
  });
}
function renderBookings(){
  const base = bkFiltered();
  const stats = [['all','ทั้งหมด',''],['pending','รอยืนยัน','pend'],['needsinfo','รอเติมข้อมูล','pend'],['confirmed','ยืนยันแล้ว','arr'],['inhouse','เข้าพักอยู่','occ'],['out','เช็คเอาต์แล้ว','']];
  $('bkStatusChips').innerHTML = stats.map(([k,l,dot]) => { const n = k==='all' ? base.length : base.filter(b=>stKey(b)===k).length; return `<button class="chip ${state.bkStatus===k?'on':''}" data-act="bk-status" data-s="${k}">${dot?`<i class="dot ${dot}"></i>`:''}${l}<span class="n">${n}</span></button>`; }).join('');
  let rows = state.bkStatus==='all' ? base : base.filter(b => stKey(b)===state.bkStatus);
  const GROUPS = ['รอเติมข้อมูล','กำลังพักอยู่','วันนี้','7 วันข้างหน้า','ถัดไป','ที่ผ่านมา'];
  const groupOf = b => needsFix(b) ? 'รอเติมข้อมูล' : isInhouse(b) ? 'กำลังพักอยู่' : b.checkin===TODAY ? 'วันนี้' : b.checkin > TODAY ? (b.checkin <= addDays(TODAY,7) ? '7 วันข้างหน้า' : 'ถัดไป') : 'ที่ผ่านมา';
  rows = rows.slice().sort((a,b) => { const ga = GROUPS.indexOf(groupOf(a)), gb = GROUPS.indexOf(groupOf(b)); if(ga!==gb) return ga-gb; if(ga===5) return String(a.checkin)<String(b.checkin)?1:-1; return String(a.checkin)<String(b.checkin)?-1:String(a.checkin)>String(b.checkin)?1:0; });
  $('bkCount').textContent = `${rows.length} รายการ`;
  $('bkSource').value = state.bkSource; $('bkRange').value = state.bkRange; $('bkCancel').checked = state.bkCancel;
  let lastSep = null; const out = [];
  rows.forEach(b => {
    const sep = groupOf(b);
    if(sep!==lastSep){ out.push(`<div class="bk-daysep">${sep}</div>`); lastSep = sep; }
    const nt = noteWithoutReq(b);
    const nameCell = `<div class="bk-namewrap" style="min-width:0"><div class="bk-name"><span class="nm">${esc(displayName(b))}</span>${srcMark(b)}</div><div class="bk-sub"><span class="ref">#${esc(b.id)}</span>${String(b.phone||'').trim()?`<span>${esc(b.phone)}</span>`:''}${String(b.guests||'').trim()?`<span>${esc(b.guests)} คน</span>`:''}${roomsCount(b)>1?`<span>× ${roomsCount(b)} ห้อง</span>`:''}${reqBadge(b)}${nt?`<span class="note" title="${esc(nt)}">${ic('note')}${esc(nt)}</span>`:''}</div></div>`;
    out.push(`<button class="bk-row ${active(b)?'':'cancel'}" data-act="open-booking" data-id="${esc(b.id)}">
      <div class="bk-date"><span class="d">${fmtD(b.checkin)} → ${isYMD(b.checkout)?fmtD(b.checkout):'?'}</span><br><span class="n">${isYMD(b.checkout)?nightsOf(b)+' คืน':'ไม่ทราบวันออก'}${relDay(b.checkin)?' · '+relDay(b.checkin):''}</span></div>
      ${nameCell}
      <div class="bk-room ${String(b.room_no||'').trim()?'':'none'}">${String(b.room_no||'').trim()?esc(roomLabel(b.room_no)):(active(b)&&!isCheckedOut(b)?'ยังไม่จัดห้อง':'—')}</div>
      <div class="bk-amt ${hasAmt(b)?'':'none'}">${hasAmt(b)?baht(bahtNum(b.amount)):'—'}</div>
      <div class="bk-status">${statusPill(b.status)}</div>
      <div class="bk-more">${ic('chevR')}</div></button>`);
  });
  $('bkList').innerHTML = out.join('') || `<div class="empty">${ic('search')}<b>ไม่พบรายการ</b><span>ลองเปลี่ยนตัวกรองหรือคำค้น</span></div>`;
  // ปฏิทิน iCal จาก Booking.com (ถ้าตั้งค่าไว้)
  const ical = DATA.ical || [];
  $('icalCard').innerHTML = ical.length ? `<div class="card" style="margin-top:16px"><div class="card-h"><h2>ปฏิทิน iCal (Booking.com)</h2><span class="sub">${ical.length} ช่วงวันที่ถูกกันไว้</span></div><div class="card-b">${ical.slice(0,30).map(e => `<div class="ical-row"><span class="mono">${fmtD(e.start)} – ${fmtD(e.end)}</span><span class="muted">${esc(e.summary || e.room || '')}</span></div>`).join('')}</div></div>` : '';
}

/* ---------- MONEY ---------- */
function monthlySeries(){
  // 6 เดือนล่าสุดจากข้อมูลจริง: รายรับ = ยอดจองตามเดือนเช็คอิน · รายจ่าย = ตามวันที่จ่าย
  const months = [];
  const [y0, m0] = TODAY.slice(0,7).split('-').map(Number);
  for(let i=5;i>=0;i--){ const d = new Date(y0, m0-1-i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }
  return months.map(m => ({
    m,
    income: BOOKINGS.filter(b => active(b) && String(b.checkin||'').startsWith(m)).reduce((s,b)=>s+bahtNum(b.amount),0),
    expense: (DATA.expenses||[]).filter(e => String(e.date||'').startsWith(m)).reduce((s,e)=>s+bahtNum(e.amount),0),
  }));
}
function renderMoney(){
  if (isStaff()) { go('today'); return; }
  if (!state.expMonth) state.expMonth = TODAY.slice(0,7);
  const ym = state.expMonth;
  $('expMonthLbl').textContent = fmtMonth(ym);
  const exp = (DATA.expenses||[]).filter(e => String(e.date||'').startsWith(ym));
  const expSum = exp.reduce((s,e)=>s+bahtNum(e.amount),0);
  const income = BOOKINGS.filter(b => active(b) && String(b.checkin||'').startsWith(ym)).reduce((s,b)=>s+bahtNum(b.amount),0);
  $('moneyTiles').innerHTML = [
    ['รายรับ', income, `${fmtMonth(ym)} · จากการจองที่บันทึกยอด (ตามเดือนเช็คอิน)`],
    ['รายจ่าย', expSum, `${exp.length} รายการ`],
    ['คงเหลือ', income-expSum, `กำไรขั้นต้น ${income?Math.round((income-expSum)/income*100):0}%`],
  ].map(([l,v,h]) => `<div class="tile"><span class="lbl">${l}</span><span class="val num">฿${baht(v)}</span><span class="hint">${h}</span></div>`).join('');
  // กราฟแท่งคู่ 6 เดือน (SVG ล้วน ไม่ใช้ไลบรารี)
  const MONTHLY = monthlySeries();
  const W = 560, H = 220, padL = 44, padB = 28, padT = 14;
  const maxRaw = Math.max(...MONTHLY.flatMap(m=>[m.income,m.expense]), 1);
  const max = Math.max(20000, Math.ceil(maxRaw/20000)*20000);
  const gw = (W-padL-8)/MONTHLY.length, bw = Math.min(22, gw*0.28);
  const y = v => padT + (H-padT-padB) * (1 - v/max);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="รายรับและรายจ่ายรายเดือน 6 เดือนล่าสุด">`;
  [0, max/2, max].forEach(t => { svg += `<line x1="${padL}" x2="${W-8}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line-soft)" stroke-width="1"/><text x="${padL-6}" y="${y(t)+4}" text-anchor="end" font-size="10.5" fill="var(--ink-3)">${t>=1000?Math.round(t/1000)+'k':t}</text>`; });
  MONTHLY.forEach((m,i) => {
    const x0 = padL + i*gw + gw/2;
    [[m.income,'var(--s-income)',x0-bw-1,'รายรับ'],[m.expense,'var(--s-expense)',x0+1,'รายจ่าย']].forEach(([v,c,x,l]) => { const top = y(v), h = Math.max(0, y(0)-top); svg += `<g><title>${fmtMonthAb(m.m)} · ${l} ฿${baht(v)}</title><rect x="${x}" y="${top}" width="${bw}" height="${h}" fill="${c}" rx="4" ry="4"/><rect x="${x}" y="${y(0)-4}" width="${bw}" height="4" fill="${c}"/></g>`; });
    svg += `<text x="${x0}" y="${H-8}" text-anchor="middle" font-size="11" fill="${m.m===ym?'var(--ink)':'var(--ink-3)'}" font-weight="${m.m===ym?'600':'400'}">${fmtMonthAb(m.m)}</text>`;
    if(i===MONTHLY.length-1 && m.income) svg += `<text x="${x0-bw-1+bw/2}" y="${y(m.income)-5}" text-anchor="middle" font-size="10.5" fill="var(--ink-2)">${baht(m.income)}</text>`;
  });
  svg += `<line x1="${padL}" x2="${W-8}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line-2)" stroke-width="1"/></svg>`;
  $('moneyChart').innerHTML = svg + `<div class="chart-legend"><span><i style="background:var(--s-income)"></i>รายรับ</span><span><i style="background:var(--s-expense)"></i>รายจ่าย</span><span class="faint" style="margin-left:auto">ชี้ที่แท่งเพื่อดูตัวเลข</span></div>`;
  $('expTitle').textContent = `รายจ่าย ${fmtMonth(ym)}`;
  $('expList').innerHTML = exp.length ? exp.slice().sort((a,b)=>String(a.date)<String(b.date)?1:-1).map(e => `<div class="exp-row"><span class="d">${fmtD(e.date)}</span><span class="c">${esc(e.category||'อื่นๆ')}<small>${esc(e.vendor||'—')}${e.note?' · '+esc(e.note):''} · ${esc(e.method||'')}</small></span><span class="a">${baht(bahtNum(e.amount))} <button class="btn ghost icon sm" data-act="exp-del" data-id="${esc(e.id||'')}" data-label="ลบ" aria-label="ลบรายจ่าย">${ic('x')}</button></span></div>`).join('') + `<div class="exp-row" style="border-top:1px solid var(--line);margin-top:4px"><span></span><span class="c">รวม</span><span class="a" style="font-weight:600">${baht(expSum)}</span></div>` : `<div class="empty">${ic('wallet')}<b>ยังไม่มีรายจ่ายเดือนนี้</b></div>`;
}

/* ---------- actions (ยิง /api/update ด้วย payload เดิมทุกประการ) ---------- */
async function doCheckIn(id){
  const b = bookingById(id); if(!b) return;
  if(!String(b.room_no||'').trim()){ startAssign(id); toast('จัดห้องก่อน แล้วค่อยเช็คอิน', true); return; }
  if(CLEAN[b.room_no]==='dirty'){ toast(`ห้อง ${roomLabel(b.room_no)} ยังรอทำความสะอาด — ทำความสะอาดก่อนเช็คอิน`, true); return; }
  const r1 = await apiUpdate({ action: 'update', id: b.id, fields: { status: 'เข้าพักอยู่' } });
  if(!r1) return;
  closeSheet();
  await afterAction(() => { b.status = 'เข้าพักอยู่'; }, `เช็คอิน ${displayName(b)} เข้าห้อง ${roomLabel(b.room_no)} แล้ว`);
}
async function doCheckOut(id){
  const b = bookingById(id); if(!b) return;
  const room = String(b.room_no||'').trim();
  const r1 = await apiUpdate({ action: 'update', id: b.id, fields: { status: 'เช็คเอาต์แล้ว' } });
  if(!r1) return;
  if(room) await apiUpdate({ action: 'roomclean', room: b.room_no, clean: 'รอทำความสะอาด' });
  closeSheet();
  await afterAction(() => { b.status = 'เช็คเอาต์แล้ว'; if(room) CLEAN[b.room_no] = 'dirty'; }, `เช็คเอาต์ ${displayName(b)} แล้ว${room?` · ห้อง ${roomLabel(b.room_no)} เข้าคิวทำความสะอาด`:''}`);
}
async function doCancel(id){
  const b = bookingById(id); if(!b) return;
  const wasIn = isInhouse(b), room = String(b.room_no||'').trim();
  const r1 = await apiUpdate({ action: 'update', id: b.id, fields: { status: 'ยกเลิก' } });
  if(!r1) return;
  if(wasIn && room) await apiUpdate({ action: 'roomclean', room: b.room_no, clean: 'รอทำความสะอาด' });
  closeSheet();
  await afterAction(() => { b.status = 'ยกเลิก'; if(wasIn && room) CLEAN[room] = 'dirty'; }, `ยกเลิกการจอง ${b.id} แล้ว`);
}
async function doRestore(id){
  const b = bookingById(id); if(!b) return;
  const r1 = await apiUpdate({ action: 'update', id: b.id, fields: { status: 'ยืนยันแล้ว' } });
  if(!r1) return;
  closeSheet();
  await afterAction(() => { b.status = 'ยืนยันแล้ว'; }, 'กู้คืนการจองแล้ว');
}
async function doExtend(id){
  const b = bookingById(id); if(!b) return;
  const nco = addDays(effCheckout(b), 1);
  if(String(b.room_no||'').trim() && !roomFreeFor(b.room_no, effCheckout(b), nco, b.id)){ toast(`ห้อง ${roomLabel(b.room_no)} มีแขกจองต่อ ต่อคืนไม่ได้`, true); return; }
  const r1 = await apiUpdate({ action: 'update', id: b.id, fields: { checkout: nco } });
  if(!r1) return;
  await afterAction(() => { b.checkout = nco; }, `ต่อคืน ${displayName(b)} ถึง ${fmtDY(nco)}`);
  openBooking(id);
}
async function setClean(no, dirty){
  const r1 = await apiUpdate({ action: 'roomclean', room: no, clean: dirty ? 'รอทำความสะอาด' : 'สะอาด' });
  if(!r1) return;
  await afterAction(() => { if(dirty) CLEAN[no]='dirty'; else delete CLEAN[no]; const rr = (DATA.rooms||[]).find(x=>String(x.room||'').trim()===no); if(rr) rr.clean = dirty?'รอทำความสะอาด':'สะอาด'; },
    dirty ? `แจ้งทำความสะอาดห้อง ${roomLabel(no)} แล้ว` : `ห้อง ${roomLabel(no)} สะอาดแล้ว ✓`);
}
function startAssign(id){ state.assign = id; const b = bookingById(id); closeSheet(); if(state.view!=='rooms' && state.view!=='timeline') go('rooms'); else render(); renderAssignBar(); if(b) toast(`เลือกห้องให้ ${displayName(b)} (${fmtD(b.checkin)}–${fmtD(effCheckout(b))})`); }
function cancelAssign(){ state.assign = null; renderAssignBar(); render(); }
async function doAssign(no){
  const b = bookingById(state.assign); if(!b) return;
  if(!roomFreeFor(no, b.checkin, effCheckout(b), b.id)){ toast(`ห้อง ${roomLabel(no)} ไม่ว่างช่วง ${fmtD(b.checkin)}–${fmtD(effCheckout(b))}`, true); return; }
  const from = String(b.room_no||'').trim();
  const r1 = await apiUpdate({ action: 'update', id: b.id, fields: { room_no: no } });
  if(!r1) return;
  // ย้ายแขกที่พักอยู่ = ห้องเดิมต้องเข้าคิวทำความสะอาด
  if(from && isInhouse(b)) await apiUpdate({ action: 'roomclean', room: from, clean: 'รอทำความสะอาด' });
  state.assign = null; renderAssignBar();
  await afterAction(() => { b.room_no = no; if(from && isInhouse(b)) CLEAN[from] = 'dirty'; },
    from ? `ย้าย ${displayName(b)} จากห้อง ${roomLabel(from)} ไป ${roomLabel(no)} แล้ว` : `จัด ${displayName(b)} เข้าห้อง ${roomLabel(no)} แล้ว`);
}
function renderAssignBar(){ const bar = $('assignBar'); const b = state.assign && bookingById(state.assign); if(!b){ bar.classList.remove('on'); bar.innerHTML=''; return; } bar.innerHTML = `${ic('move')}<span>กำลังจัดห้องให้ <b>${esc(displayName(b))}</b> · ${fmtD(b.checkin)}–${fmtD(effCheckout(b))} (${nightsOf(b)} คืน) — แตะห้องที่ขึ้นเส้นประ</span><button class="btn sm" data-act="cancel-assign">ยกเลิก</button>`; bar.classList.add('on'); paintIcons(bar); }

/* ---------- sheets ---------- */
function openBooking(id){
  const b = bookingById(id); if(!b) return;
  const r = String(b.room_no||'').trim() ? roomOf(b.room_no) : null;
  const acts = [];
  const A = (act, label, cls='', icon='') => acts.push(`<button class="btn ${cls}" data-act="${act}" data-id="${esc(b.id)}" data-label="${esc(label)}">${icon?ic(icon):''}${label}</button>`);
  const k = stKey(b);
  if(k==='confirmed'){ if(b.checkin<=TODAY) A('checkin','เช็คอิน','primary','login'); A('assign', String(b.room_no||'').trim()?'ย้ายห้อง':'จัดห้อง', String(b.room_no||'').trim()?'':'warn','move'); A('msg','ข้อความยืนยัน','','message'); A('edit','แก้ไข','','edit'); A('cancel','ยกเลิกการจอง','danger'); }
  else if(k==='inhouse'){ A('checkout','เช็คเอาต์','primary','logout'); A('extend','ต่ออีก 1 คืน','','plus'); A('assign','ย้ายห้อง','','move'); A('edit','แก้ไข','','edit'); }
  else if(k==='pending'){ A('confirm-open','ยืนยันการจอง','good','check'); A('msg','ส่งข้อความ','','message'); A('edit','แก้ไข','','edit'); A('cancel','ปฏิเสธ/ยกเลิก','danger'); }
  else if(k==='needsinfo'){ A('edit','เติมข้อมูลจาก Pulse','primary','edit'); A('cancel','ยกเลิกการจอง','danger'); }
  else { A('edit','แก้ไข','','edit'); if(k==='cancel') A('restore','กู้คืนเป็นยืนยันแล้ว','soft'); }
  const log = [`<div><b>สร้างรายการ</b> ${isDirect(b)?'จองตรง / เว็บไซต์ / LINE':'นำเข้าจากอีเมล Booking.com'}${b.created?`<div class="t">${esc(String(b.created).slice(0,16))}</div>`:''}</div>`];
  if(k==='inhouse'||k==='out') log.push(`<div><b>เช็คอิน</b> ห้อง ${esc(roomLabel(b.room_no))}<div class="t">${fmtDY(b.checkin)}</div></div>`);
  if(k==='out') log.push(`<div><b>เช็คเอาต์</b><div class="t">${fmtDY(effCheckout(b))}</div></div>`);
  if(k==='cancel') log.push(`<div><b>ยกเลิก</b><div class="t">${esc(noteWithoutReq(b))}</div></div>`);
  const req = guestReqOf(b), nt = noteWithoutReq(b);
  openSheet({
    title: esc(displayName(b)),
    sub: `${srcMark(b)} <span class="mono">#${esc(b.id)}</span> ${statusPill(b.status)}`,
    body: `<div class="stay"><div><div class="l">เช็คอิน</div><div class="v">${fmtDY(b.checkin)}</div><div class="faint" style="font-size:12px">${isYMD(b.checkin)?TH_DOW[dow(b.checkin)]+(relDay(b.checkin)?' · '+relDay(b.checkin):''):'ต้องเติมข้อมูล'}</div></div><div class="arrow"><b>${isYMD(b.checkout)?nightsOf(b):'?'}</b>คืน</div><div style="text-align:right"><div class="l">เช็คเอาต์</div><div class="v">${isYMD(b.checkout)?fmtDY(b.checkout):'ไม่ทราบ'}</div><div class="faint" style="font-size:12px">${isYMD(b.checkout)?TH_DOW[dow(b.checkout)]+(relDay(b.checkout)?' · '+relDay(b.checkout):''):'ต้องเติมข้อมูล'}</div></div></div>
      <dl class="kv"><dt>ห้อง</dt><dd>${String(b.room_no||'').trim() ? `${esc(roomLabel(b.room_no))} <span class="faint" style="font-weight:400">· ${esc(r?r.type:'')}${CLEAN[b.room_no]==='dirty'?' · <span class="pill dirty">รอทำความสะอาด</span>':''}</span>` : (active(b)&&!isCheckedOut(b)?`<span class="pill arr">ยังไม่จัดห้อง</span>`:'—')}</dd>
      <dt>ผู้เข้าพัก</dt><dd>${String(b.guests||'').trim()?esc(b.guests)+' คน':'<span class="faint">ไม่ระบุ</span>'}${roomsCount(b)>1?` · ${roomsCount(b)} ห้อง`:''}</dd>
      <dt>เบอร์โทร</dt><dd>${String(b.phone||'').trim()?`<a href="tel:${esc(b.phone)}" class="mono">${esc(b.phone)}</a><div class="contact-row"><a class="btn sm" href="tel:${esc(b.phone)}">${ic('phone')}โทร</a><a class="btn sm wa" href="https://wa.me/${waNum(b.phone)}" target="_blank" rel="noopener">${ic('whatsapp')}WhatsApp</a><button class="btn sm ghost" data-act="copy-text" data-text="${esc(b.phone)}">${ic('copy')}คัดลอกเบอร์</button></div>`:'<span class="faint">—</span>'}</dd>
      ${isStaff()?'':`<dt>ยอด</dt><dd class="num">${hasAmt(b)?'฿'+baht(bahtNum(b.amount))+(isYMD(b.checkout)?` <span class="faint">(฿${baht(Math.round(bahtNum(b.amount)/nightsOf(b)))}/คืน)</span>`:''):'<span class="faint">ไม่ระบุ</span>'}</dd>`}
      <dt>ช่องทาง</dt><dd>${esc(b.source||'—')}</dd></dl>
      ${req?`<div class="notebox" style="border-color:var(--arr-line);background:var(--arr-bg);color:var(--arr-ink)">⚠ คำขอแขก: ${esc(req)}</div>`:''}
      ${nt?`<div class="notebox" style="margin-top:${req?'8px':'0'}">${esc(nt)}</div>`:''}
      <div class="acts-grid">${acts.join('')}</div>
      <div class="timeline-log">${log.join('')}</div>`,
  });
}
function openRoom(no){
  const r = roomOf(no); if(!r) return; const rs = roomState(no);
  const upcoming = roomBookings(no).filter(b => !isCheckedOut(b) && !isInhouse(b) && effCheckout(b) > TODAY).sort((a,b)=>String(a.checkin)<String(b.checkin)?-1:1).slice(0,4);
  const acts = [];
  if(rs.inHouse) acts.push(`<button class="btn primary" data-act="checkout" data-id="${esc(rs.inHouse.id)}">${ic('logout')}เช็คเอาต์ ${esc(displayName(rs.inHouse).split(' ')[0])}</button>`);
  if(rs.arriving) acts.push(`<button class="btn ${rs.dirty?'':'primary'}" data-act="checkin" data-id="${esc(rs.arriving.id)}">${ic('login')}เช็คอิน ${esc(displayName(rs.arriving).split(' ')[0])}</button>`);
  acts.push(rs.dirty ? `<button class="btn good" data-act="clean-done" data-no="${esc(no)}">${ic('check')}สะอาดแล้ว</button>` : `<button class="btn" data-act="clean-flag" data-no="${esc(no)}">${ic('broom')}แจ้งทำความสะอาด</button>`);
  if(!rs.inHouse) acts.push(`<button class="btn soft" data-act="new-at" data-no="${esc(no)}" data-d="${TODAY}">${ic('plus')}จองห้องนี้</button>`);
  openSheet({
    title: `ห้อง ${esc(roomLabel(no))} <small class="faint" style="font-size:13px;font-weight:400">${esc(r.type)}${r.twin?' · 2 เตียง':''}${r.tag?' · '+esc(r.tag):''}</small>`,
    sub: `<span class="pill ${rs.state}">${ST_LABEL[rs.state]}</span>${rs.dirty&&rs.state!=='dirty'?'<span class="pill dirty">รอทำความสะอาด</span>':''}`,
    body: `${rs.inHouse ? `<div class="card" style="padding:12px 14px;margin-bottom:12px;box-shadow:none"><div class="faint" style="font-size:12px;letter-spacing:.04em">แขกในห้องตอนนี้</div><div style="display:flex;align-items:center;gap:8px;margin-top:4px"><b style="font-size:16px">${esc(displayName(rs.inHouse))}</b>${srcMark(rs.inHouse)}</div><div class="muted" style="font-size:13px;margin-top:3px">${fmtD(rs.inHouse.checkin)} → ${fmtD(effCheckout(rs.inHouse))} · คืนที่ ${Math.min(diffDays(rs.inHouse.checkin,TODAY)+1, nightsOf(rs.inHouse))}/${nightsOf(rs.inHouse)}${String(rs.inHouse.guests||'').trim()?' · '+esc(rs.inHouse.guests)+' คน':''}</div>${rs.inHouse.note?`<div class="notebox" style="margin-top:8px">${esc(rs.inHouse.note)}</div>`:''}<div style="margin-top:10px"><button class="btn sm ghost" data-act="open-booking" data-id="${esc(rs.inHouse.id)}">ดูการจอง ${ic('arrow')}</button></div></div>` : ''}
      ${rs.arriving ? `<div class="card" style="padding:12px 14px;margin-bottom:12px;box-shadow:none;border-color:var(--arr-line);background:var(--arr-bg)"><div style="font-size:12px;letter-spacing:.04em;color:var(--arr-ink)">เช็คอินวันนี้</div><div style="display:flex;align-items:center;gap:8px;margin-top:4px"><b style="font-size:16px">${esc(displayName(rs.arriving))}</b>${srcMark(rs.arriving)}</div><div class="muted" style="font-size:13px;margin-top:3px">${nightsOf(rs.arriving)} คืน · ออก ${fmtD(effCheckout(rs.arriving))}${rs.arriving.note?' · '+esc(rs.arriving.note):''}</div></div>` : ''}
      <div class="acts-grid" style="margin-top:0">${acts.join('')}</div>
      <h4 style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:18px 0 6px">การจองถัดไป</h4>
      ${upcoming.length ? upcoming.map(b => `<div data-act="open-booking" data-id="${esc(b.id)}" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line-soft);cursor:pointer;font-size:13px"><span class="mono" style="color:var(--ink-2)">${fmtD(b.checkin)}–${fmtD(effCheckout(b))}</span><b style="font-weight:600">${esc(displayName(b))}</b><span style="margin-left:auto">${statusPill(b.status)}</span></div>`).join('') : '<div class="faint" style="font-size:13px">ยังไม่มีการจองถัดไป</div>'}
      <div class="f" style="margin-top:18px"><label for="roomNote">บันทึกของห้อง</label><textarea id="roomNote" placeholder="เช่น แอร์เสียงดัง / ก๊อกน้ำรั่ว">${esc(ROOM_NOTES[no]||'')}</textarea></div>`,
    foot: `<button class="btn primary" data-act="save-room-note" data-no="${esc(no)}">บันทึก</button><button class="btn" data-act="close-sheet">ปิด</button>`,
  });
}
async function saveRoomNote(no){
  const note = $('roomNote').value.trim();
  const r1 = await apiUpdate({ action: 'roomclean', room: no, clean: CLEAN[no]==='dirty' ? 'รอทำความสะอาด' : 'สะอาด', note });
  if(!r1) return;
  closeSheet();
  await afterAction(() => { if(note) ROOM_NOTES[no] = note; else delete ROOM_NOTES[no]; const rr = (DATA.rooms||[]).find(x=>String(x.room||'').trim()===no); if(rr) rr.note = note; }, 'บันทึกโน้ตห้องแล้ว');
}
function formHTML(b){
  const roomOpts = [`<option value="">— ยังไม่จัดห้อง —</option>`].concat(ROOMS.map(r => `<option value="${esc(r.no)}" ${String(b.room_no||'')===r.no?'selected':''}>${esc(r.label)} · ${esc(r.type)}${r.tag?' · '+esc(r.tag):''}</option>`)).join('');
  return `<div class="f-stack">
    <div class="f"><label for="fName">ชื่อผู้เข้าพัก</label><input id="fName" value="${esc(b.name||'')}" placeholder="ตามที่ปรากฏใน Pulse / เว็บไซต์"></div>
    <div class="f-grid"><div class="f"><label for="fIn">เช็คอิน</label><input id="fIn" type="date" value="${esc(b.checkin||'')}"></div><div class="f"><label for="fOut">เช็คเอาต์</label><input id="fOut" type="date" value="${esc(b.checkout||'')}"></div></div>
    <div class="f"><label for="fRoom">ห้อง</label><select id="fRoom">${roomOpts}</select><span class="help">ระบบจะเตือนถ้าห้องไม่ว่างในช่วงวันที่เลือก</span></div>
    <div class="f-grid"><div class="f"><label for="fGuests">จำนวนผู้เข้าพัก</label><input id="fGuests" inputmode="numeric" value="${esc(b.guests||'')}" placeholder="2"></div>${isStaff()?'<div></div>':`<div class="f"><label for="fAmt">ยอด (฿)</label><input id="fAmt" inputmode="decimal" value="${esc(b.amount||'')}" placeholder="เช่น 2,700"></div>`}</div>
    <div class="f"><label for="fPhone">เบอร์โทร</label><input id="fPhone" value="${esc(b.phone||'')}" placeholder="ถ้ามี"></div>
    <div class="f"><label for="fNote">หมายเหตุ</label><textarea id="fNote" placeholder="คำขอพิเศษ เวลาถึง ฯลฯ">${esc(b.note||'')}</textarea></div></div>`;
}
function openEdit(id){
  const b = bookingById(id); if(!b) return;
  openSheet({ title: needsFix(b) ? 'เติมข้อมูลจาก Pulse' : 'แก้ไขการจอง', sub: `${srcMark(b)} <span class="mono">#${esc(b.id)}</span>${needsFix(b)?' <span class="faint">เปิดแอป Pulse → ค้นเลขจองนี้ → คัดลอกชื่อและวันจริงมาใส่</span>':''}`, body: formHTML(b), foot: `<button class="btn primary" data-act="save-edit" data-id="${esc(b.id)}">บันทึก</button><button class="btn" data-act="close-sheet">ยกเลิก</button>` });
}
function readForm(){ const v = id => { const el = $(id); return el ? el.value.trim() : ''; }; return { name:v('fName'), checkin:v('fIn'), checkout:v('fOut'), room_no:v('fRoom'), guests:v('fGuests'), amount:v('fAmt'), phone:v('fPhone'), note:v('fNote') }; }
function validateForm(f, excludeId){
  if(!f.checkin) return 'กรุณาใส่วันเช็คอิน';
  if(f.checkout && f.checkout <= f.checkin) return 'วันเช็คเอาต์ต้องหลังวันเช็คอิน';
  if(f.room_no && f.checkout && !roomFreeFor(f.room_no, f.checkin, f.checkout, excludeId)) return `ห้อง ${roomLabel(f.room_no)} ไม่ว่างช่วง ${fmtD(f.checkin)}–${fmtD(f.checkout)}`;
  return '';
}
async function saveEdit(id){
  const b = bookingById(id); if(!b) return;
  const f = readForm(); const err = validateForm(f, id); if(err){ toast(err, true); return; }
  const fields = { name: f.name, checkin: f.checkin, checkout: f.checkout, room_no: f.room_no, phone: f.phone, guests: f.guests, note: f.note };
  if(!isStaff()) fields.amount = f.amount;
  // เติมครบแล้ว: ล้างโน้ตเตือนของตัวแกะอีเมล + เปลี่ยนสถานะจาก "รอเติมชื่อ" เป็นยืนยันแล้ว
  if(fields.name && f.checkin && f.checkout && /อ่านวันที่จากอีเมลไม่ได้|รอเติมชื่อจาก Pulse|ยืนยันวันจริง|เปิดแอป Pulse/.test(String(b.note||''))) fields.note = '';
  if(needsFix(b) && fields.name && f.checkin && f.checkout && /รอเติม/.test(String(b.status||''))) fields.status = 'ยืนยันแล้ว';
  // ส่งเฉพาะช่องที่เปลี่ยนจริง — กันเผลอลบค่าเดิมด้วยค่าว่าง
  Object.keys(fields).forEach(k => { if(String(fields[k]) === String(b[k] == null ? '' : b[k])) delete fields[k]; });
  if(!Object.keys(fields).length){ closeSheet(); return; }
  const r1 = await apiUpdate({ action: 'update', id: b.id, fields });
  if(!r1) return;
  closeSheet();
  await afterAction(() => Object.assign(b, fields), 'บันทึกแล้ว');
}
function openNew(no, d){
  const b = { name:'', checkin: d||TODAY, checkout: addDays(d||TODAY, 1), room_no: no||'', guests:'', amount:'', phone:'', note:'' };
  openSheet({ title:'จองใหม่ (จองตรง)', sub:`<span class="faint">สำหรับ walk-in / LINE / โทรจอง — การจองจาก Booking.com ให้ใช้ "นำเข้าไฟล์"</span>`,
    body: `<div class="f-grid" style="margin-bottom:12px"><div class="f"><label for="fSrc">ช่องทาง</label><select id="fSrc"><option>จองตรง</option><option>Walk-in</option><option>โทรจอง</option><option>เว็บไซต์ (จองตรง)</option><option>Booking.com</option><option>Agoda</option></select></div><div class="f"><label for="fStatus">สถานะ</label><select id="fStatus"><option>ยืนยันแล้ว</option><option>รอยืนยัน</option><option>เข้าพักอยู่</option></select></div></div>` + formHTML(b),
    foot:`<button class="btn primary" data-act="save-new">สร้างการจอง</button><button class="btn" data-act="close-sheet">ยกเลิก</button>` });
  if((d||TODAY) === TODAY) $('fStatus').value = 'เข้าพักอยู่'; // แตะช่องวันนี้ = มักเป็น walk-in
}
async function saveNew(){
  const f = readForm();
  if(!f.name){ toast('กรุณาใส่ชื่อผู้เข้าพัก', true); return; }
  if(!f.checkout){ toast('กรุณาใส่วันเช็คเอาต์', true); return; }
  const err = validateForm(f); if(err){ toast(err, true); return; }
  const body = { action: 'add', name: f.name, checkin: f.checkin, checkout: f.checkout, room_no: f.room_no,
    phone: f.phone, guests: f.guests, source: $('fSrc').value, status: $('fStatus').value,
    amount: isStaff() ? '' : f.amount, note: f.note };
  const r1 = await apiUpdate(body);
  if(!r1) return;
  closeSheet();
  await afterAction(() => { BOOKINGS.push({ ...body, id: r1.id || ('LOCAL-' + f.name), rooms: 1, created: '' }); }, `สร้างการจอง ${f.name} แล้ว`);
}
/* ยืนยันคำขอจองตรง: จัดห้อง + เปลี่ยนสถานะ แล้วเปิดข้อความส่งลูกค้าต่อทันที */
function openConfirm(id){
  const b = bookingById(id); if(!b) return;
  const roomOpts = [`<option value="">— ยังไม่จัดห้อง —</option>`].concat(ROOMS.map(r => `<option value="${esc(r.no)}" ${String(b.room_no||'')===r.no?'selected':''}>${esc(r.label)} · ${esc(r.type)}</option>`)).join('');
  openSheet({
    title: 'ยืนยันคำขอจองตรง',
    sub: `${srcMark(b)} <span class="mono">#${esc(b.id)}</span>`,
    body: `<div class="stay"><div><div class="l">เช็คอิน</div><div class="v">${fmtDY(b.checkin)}</div></div><div class="arrow"><b>${isYMD(b.checkout)?nightsOf(b):'?'}</b>คืน</div><div style="text-align:right"><div class="l">เช็คเอาต์</div><div class="v">${fmtDY(b.checkout)}</div></div></div>
      <dl class="kv"><dt>ผู้จอง</dt><dd>${esc(displayName(b))}${String(b.phone||'').trim()?` · <a href="tel:${esc(b.phone)}" class="mono">${esc(b.phone)}</a>`:''}</dd>
      ${isStaff()||!hasAmt(b)?'':`<dt>ยอด</dt><dd class="num">฿${baht(bahtNum(b.amount))}</dd>`}</dl>
      ${b.note?`<div class="notebox">${esc(b.note)}</div>`:''}
      <div class="f" style="margin-top:14px"><label for="cfRoom">จัดห้องให้ (เลือกภายหลังได้)</label><select id="cfRoom">${roomOpts}</select></div>`,
    foot: `<button class="btn good" data-act="confirm-save" data-id="${esc(b.id)}">${ic('check')}ยืนยันการจอง</button><button class="btn danger" data-act="cancel" data-id="${esc(b.id)}" data-label="ปฏิเสธ/ยกเลิก">ปฏิเสธ/ยกเลิก</button><button class="btn" data-act="close-sheet">ปิด</button>`,
  });
}
async function saveConfirm(id){
  const b = bookingById(id); if(!b) return;
  const room = $('cfRoom').value;
  const fields = { status: 'ยืนยันแล้ว' };
  if(String(room) !== String(b.room_no||'')) fields.room_no = room;
  const snap = { ...b, status: 'ยืนยันแล้ว', room_no: room || b.room_no || '' };
  const r1 = await apiUpdate({ action: 'update', id: b.id, fields });
  if(!r1) return;
  closeSheet();
  await afterAction(() => Object.assign(b, fields), `ยืนยันการจองของ ${displayName(b)} แล้ว`);
  openMsg(null, snap); // ยืนยันในระบบแล้ว ลูกค้ายังไม่รู้ — เปิดข้อความให้คัดลอกไปตอบทันที
}
/* ข้อความยืนยันส่งลูกค้า (TH/EN + ช่องลิงก์จ่ายเงิน) — logic เดิมจากเวอร์ชันก่อน */
function buildConfirmMsg(b, lang, payLink){
  const nights = nightsOf(b);
  const amt = bahtNum(b.amount);
  const gs = String(b.guests||'').trim();
  const lines = lang === 'en' ? [
    `Hello ${b.name || ''}! Your booking at House of Happiness is confirmed 🏡`,
    ``,
    `📅 Check-in: ${fmtEN(b.checkin)} (from 14:00 — staff until 18:00, self check-in after)`,
    `📅 Check-out: ${fmtEN(b.checkout)} (by 12:00)`,
    `🛏 ${nights || '-'} night(s)${String(b.room_no||'').trim() ? ` · Room ${roomLabel(b.room_no)}` : ''}${gs ? ` · ${gs} guest(s)` : ''}`,
  ] : [
    `สวัสดีค่ะ คุณ${b.name || ''} 🙏 ขอยืนยันการจองที่ House of Happiness ค่ะ`,
    ``,
    `📅 เช็คอิน: ${fmtD(b.checkin)} (14:00 เป็นต้นไป — พนักงานอยู่ถึง 18:00 หลังจากนั้นเช็คอินด้วยตัวเอง)`,
    `📅 เช็คเอาต์: ${fmtD(b.checkout)} (ภายใน 12:00)`,
    `🛏 ${nights || '-'} คืน${String(b.room_no||'').trim() ? ` · ห้อง ${roomLabel(b.room_no)}` : ''}${gs ? ` · ผู้เข้าพัก ${gs} ท่าน` : ''}`,
  ];
  if (amt) lines.push(lang === 'en'
    ? `💰 Total: ฿${amt.toLocaleString()}${payLink ? '' : ' — pay at the hotel (cash / bank transfer / PromptPay)'}`
    : `💰 ยอดชำระ: ฿${amt.toLocaleString()}${payLink ? '' : ' — ชำระที่โรงแรม (เงินสด / โอน / พร้อมเพย์)'}`);
  if (payLink) lines.push(lang === 'en' ? `💳 Pay online: ${payLink}` : `💳 ชำระออนไลน์ได้ที่: ${payLink}`);
  lines.push(
    lang === 'en' ? `🔖 Booking no.: ${b.id || '-'}` : `🔖 หมายเลขการจอง: ${b.id || '-'}`,
    `📍 ${lang === 'en' ? 'Map' : 'แผนที่'}: ${MAP_LINK}`,
    ``,
    lang === 'en'
      ? `A refundable ฿1,000 key deposit is collected at check-in. Please let us know your arrival time. See you soon! 😊`
      : `มีมัดจำกุญแจ 1,000 บาท (คืนตอนเช็คเอาต์) รบกวนแจ้งเวลาที่จะมาถึงล่วงหน้านะคะ แล้วเจอกันค่ะ 😊`);
  return lines.join('\n');
}
let msgCtx = null;
/* ---------- ติดต่อแขก / คัดลอก ---------- */
// เบอร์ไทย 08x → 668x สำหรับลิงก์ wa.me (ตัดทุกอย่างที่ไม่ใช่ตัวเลข)
function waNum(p){ let d = String(p||'').replace(/\D/g,''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = '66' + d.slice(1); return d; }
function copyText(t, okMsg, fallbackEl){
  return (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
    .then(() => toast(okMsg || 'คัดลอกแล้ว'))
    .catch(() => { try { if (fallbackEl) { fallbackEl.select(); document.execCommand('copy'); toast(okMsg || 'คัดลอกแล้ว'); } else throw 0; } catch(_) { toast('คัดลอกไม่ได้ — เลือกข้อความแล้วคัดลอกเอง', true); } });
}

/* ---------- สรุปงานวันนี้ (ส่งกลุ่ม LINE ทีมงาน/แม่บ้าน) ---------- */
function buildDailySummary(){
  const q = todayQueue();
  const tonight = Math.min(ROOMS.length, occupiedOn(TODAY)), free = ROOMS.length - tonight;
  const L = [`🏠 House of Happiness — สรุปงาน ${fmtLong(TODAY)}`, ''];
  const row = b => { const rm = String(b.room_no||'').trim() ? `ห้อง ${roomLabel(b.room_no)}` : 'ยังไม่จัดห้อง'; const req = guestReqOf(b); return `• ${rm} — ${displayName(b)} (${isYMD(b.checkout)?nightsOf(b):'?'} คืน · ${isDirect(b)?'จองตรง':'Booking.com'})${req?` ⚠ ${req}`:''}`; };
  const sec = (title, items, mapFn, empty) => { L.push(`${title} ${items.length}`); if (items.length) items.forEach(x => L.push(mapFn(x))); else if (empty) L.push(`• ${empty}`); L.push(''); };
  if (q.overdue.length) sec('🔴 เลยวันเช็คเอาต์ ยังไม่ได้กดออก', q.overdue, row);
  sec('📥 เช็คอินวันนี้', q.arrivals, row, 'ไม่มีแขกเข้า');
  sec('📤 เช็คเอาต์วันนี้', q.departures, row, 'ไม่มีแขกออก');
  sec('🧹 รอทำความสะอาด', q.dirty, r => `• ห้อง ${roomLabel(r.no)}${roomState(r.no).arriving ? ' — ด่วน แขกเข้าวันนี้' : ''}`, 'สะอาดหมดทุกห้อง');
  if (q.pending.length) sec('⏳ จองตรงรอยืนยัน', q.pending, b => `• ${displayName(b)} — ${fmtRange(b.checkin, b.checkout)}${String(b.phone||'').trim()?` · ${b.phone}`:''}`);
  if (q.unassigned.length) sec('🗂 รอจัดห้อง (วันถัดไป)', q.unassigned, b => `• ${displayName(b)} — เข้า ${fmtDY(b.checkin)} (${relDay(b.checkin)})`);
  L.push(`🛏 พักคืนนี้ ${tonight}/${ROOMS.length} ห้อง · ว่าง ${free}`);
  return L.join('\n');
}
function openSummary(){
  const t = buildDailySummary();
  openSheet({
    title: 'สรุปงานวันนี้',
    sub: '<span class="faint">คัดลอกไปวางในกลุ่ม LINE ทีมงาน / แม่บ้าน — แก้ข้อความก่อนส่งได้</span>',
    body: `<div class="f"><textarea id="sumBox" rows="14" style="min-height:280px;font-family:var(--mono);font-size:12.5px;line-height:1.5">${esc(t)}</textarea></div>`,
    foot: `<button class="btn primary" data-act="copy-sum">${ic('copy')}คัดลอก</button>${navigator.share ? `<button class="btn" data-act="share-sum">${ic('share')}แชร์</button>` : ''}<button class="btn" data-act="print-today">${ic('printer')}พิมพ์</button><button class="btn" data-act="close-sheet">ปิด</button>`,
  });
}

/* ---------- คีย์ลัด (คอม) ---------- */
const SHORTCUTS = [['/', 'ค้นหา'], ['N', 'จองใหม่'], ['T', 'ไปหน้า "วันนี้"'], ['R', 'รีเฟรชข้อมูล'], ['[  ]', 'เลื่อนช่วงก่อนหน้า / ถัดไป (ไทม์ไลน์ · ปฏิทิน · รายรับ-รายจ่าย)'], ['Esc', 'ปิดแผง / ยกเลิกโหมดจัดห้อง'], ['?', 'เปิดรายการคีย์ลัดนี้']];
function openShortcuts(){
  openSheet({ title: 'คีย์ลัด', sub: '<span class="faint">ใช้ได้เมื่อไม่ได้พิมพ์อยู่ในช่องกรอก</span>',
    body: `<div class="kbd-list">${SHORTCUTS.map(([k, d]) => `<div><kbd>${esc(k)}</kbd><span>${esc(d)}</span></div>`).join('')}</div>`,
    foot: `<button class="btn" data-act="close-sheet">ปิด</button>` });
}

function openMsg(id, snap){
  const b = snap || bookingById(id); if(!b) return;
  msgCtx = { b, lang: 'th' };
  openSheet({
    title: 'ข้อความยืนยันส่งลูกค้า',
    sub: `<span class="faint">ระบบไม่ได้ส่งเอง — คัดลอกไปวางในแชท LINE / WhatsApp ที่ลูกค้าทักมา${String(b.phone||'').trim()?` (โทร ${esc(b.phone)})`:''}</span>`,
    body: `<div class="seg" style="margin-bottom:12px"><button class="on" data-act="msg-lang" data-l="th">ภาษาไทย</button><button data-act="msg-lang" data-l="en">English</button></div>
      <div class="f" style="margin-bottom:10px"><label for="msgPay">ลิงก์จ่ายเงิน (ถ้ามี — วางแล้วข้อความจะแทรกให้)</label><input id="msgPay" placeholder="https://… (เว้นว่าง = ชำระที่โรงแรม)"></div>
      <div class="f"><label for="msgBox">ข้อความ (แก้ก่อนคัดลอกได้)</label><textarea id="msgBox" rows="13" style="min-height:250px;font-family:var(--mono);font-size:12.5px"></textarea></div>`,
    foot: `<button class="btn primary" data-act="copy-msg">${ic('copy')}คัดลอกข้อความ</button><button class="btn" data-act="close-sheet">ปิด</button>`,
  });
  const refresh = () => { $('msgBox').value = buildConfirmMsg(msgCtx.b, msgCtx.lang, $('msgPay').value.trim()); };
  $('msgPay').oninput = refresh;
  refresh();
  msgCtx.refresh = refresh;
}
function openExpense(){
  openSheet({ title:'บันทึกรายจ่าย', sub:`<span class="faint">${fmtMonth(state.expMonth || TODAY.slice(0,7))}</span>`,
    body:`<div class="f-stack"><div class="f-grid"><div class="f"><label for="eDate">วันที่</label><input id="eDate" type="date" value="${TODAY}"></div><div class="f"><label for="eCat">หมวด</label><select id="eCat">${EXP_CATS.map(c=>`<option>${c}</option>`).join('')}</select></div></div><div class="f-grid"><div class="f"><label for="eAmt">จำนวนเงิน (฿)</label><input id="eAmt" inputmode="decimal" placeholder="0"></div><div class="f"><label for="ePay">วิธีจ่าย</label><select id="ePay"><option>เงินสด</option><option>โอน</option><option>บัตร</option></select></div></div><div class="f"><label for="eTo">จ่ายให้ (ร้าน/คน)</label><input id="eTo" placeholder="เช่น Makro"></div><div class="f"><label for="eNote">หมายเหตุ</label><input id="eNote" placeholder="ถ้ามี"></div></div>`,
    foot:`<button class="btn primary" data-act="save-expense">บันทึก</button><button class="btn" data-act="close-sheet">ยกเลิก</button>` });
}
async function saveExpense(){
  const date = $('eDate').value, amount = $('eAmt').value.trim();
  if(!date || !bahtNum(amount)){ toast('ใส่วันที่และจำนวนเงินก่อน', true); return; }
  const body = { action: 'expadd', date, amount, category: $('eCat').value, method: $('ePay').value, vendor: $('eTo').value.trim(), note: $('eNote').value.trim() };
  const r1 = await apiUpdate(body);
  if(!r1) return;
  closeSheet();
  state.expMonth = date.slice(0,7);
  await afterAction(() => { (DATA.expenses = DATA.expenses || []).push({ ...body, id: r1.id || ('LOCAL-' + Math.random().toString(36).slice(2,8)) }); }, 'บันทึกรายจ่ายแล้ว');
}
async function deleteExpense(id){
  const r1 = await apiUpdate({ action: 'expdel', id });
  if(!r1) return;
  await afterAction(() => { DATA.expenses = (DATA.expenses||[]).filter(x => x.id !== id); }, 'ลบรายจ่ายแล้ว');
}
function openMore(){
  const items = [['calendar','ปฏิทิน','calendar'],['bookings','รายการจอง','list']].concat(isStaff()?[]:[['money','รายรับ-รายจ่าย','wallet']]);
  openSheet({ title:'เพิ่มเติม', body:`<div class="more-menu" style="display:block">${items.map(([v,l,i]) => `<button class="item" data-act="go" data-v="${v}">${ic(i)}${l}${ic('chevR')}</button>`).join('')}<button class="item" data-act="summary">${ic('copy')}สรุปงานวันนี้ (ส่ง LINE)</button><button class="item" data-act="theme">${ic('moon')}สลับโหมดสว่าง/มืด</button><button class="item" data-act="refresh">${ic('refresh')}รีเฟรชข้อมูล</button><button class="item" data-act="logout">${ic('logout')}ออกจากระบบ</button></div>` });
}

/* ---------- Export CSV (มี BOM เปิดใน Excel ภาษาไทยไม่เพี้ยน + กัน formula injection) ---------- */
function safeCsvCell(v){
  let s = String(v == null ? '' : v);
  if (/^[\t\r ]*[=+\-@]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function dlCSV(name, header, lines){
  const csv = '\uFEFF' + [header].concat(lines).map(row => row.map(safeCsvCell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
function exportBookingsCSV(){
  const rows = bkFiltered();
  if(!rows.length){ toast('ไม่มีรายการให้ดาวน์โหลด', true); return; }
  dlCSV(`bookings-${TODAY}.csv`,
    ['เช็คอิน','เช็คเอาต์','คืน','ห้อง','ชื่อผู้เข้าพัก','เบอร์โทร','ช่องทาง','หมายเลขจอง','ยอด(บาท)','สถานะ','หมายเหตุ'],
    rows.map(b => [b.checkin||'', b.checkout||'', isYMD(b.checkout)?nightsOf(b):'', b.room_no||'', b.name||'', b.phone||'', b.source||'', b.id||'', String(b.amount||'').replace(/,/g,''), b.status||'', b.note||'']));
  toast(`ดาวน์โหลด ${rows.length} รายการแล้ว`);
}
function exportExpensesCSV(){
  const ym = state.expMonth || TODAY.slice(0,7);
  const exps = (DATA.expenses||[]).filter(x => String(x.date||'').startsWith(ym)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(!exps.length){ toast('เดือนนี้ยังไม่มีรายจ่าย', true); return; }
  dlCSV(`expenses-${ym}.csv`, ['วันที่','หมวด','จ่ายให้','วิธีจ่าย','จำนวน(บาท)','หมายเหตุ'],
    exps.map(x => [x.date||'', x.category||'', x.vendor||'', x.method||'', String(x.amount||'').replace(/,/g,''), x.note||'']));
  toast(`ดาวน์โหลดรายจ่าย ${exps.length} รายการแล้ว`);
}
function exportSummaryCSV(){
  const ym = state.expMonth || TODAY.slice(0,7);
  const bookings = BOOKINGS.filter(b => active(b) && String(b.checkin||'').startsWith(ym));
  const exps = (DATA.expenses||[]).filter(x => String(x.date||'').startsWith(ym));
  const revenue = bookings.reduce((s,b)=>s+bahtNum(b.amount),0);
  const expenseTotal = exps.reduce((s,x)=>s+bahtNum(x.amount),0);
  const nights = bookings.reduce((s,b)=>s+(isYMD(b.checkout)?nightsOf(b):0),0);
  const byCategory = {};
  exps.forEach(x => { const c = x.category || 'อื่นๆ'; byCategory[c] = (byCategory[c]||0) + bahtNum(x.amount); });
  dlCSV(`monthly-summary-${ym}.csv`, ['รายการ','จำนวน','ยอด(บาท)'], [
    ['เดือน', fmtMonth(ym), ''],
    ['จำนวนการจอง', bookings.length, ''],
    ['จำนวนคืนรวม', nights, ''],
    ['รายรับ', '', revenue],
    ['รายจ่าย', '', expenseTotal],
    ['กำไรสุทธิ', '', revenue - expenseTotal],
    ...Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([c,a]) => [`รายจ่าย: ${c}`, '', a]),
  ]);
  toast('ดาวน์โหลดสรุปเดือนแล้ว');
}

/* ---------- นำเข้าไฟล์ Booking.com Extranet (.xlsx/.csv) — logic เดิม ---------- */
function parseCSV(text){
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.slice(0, text.indexOf('\n') + 1 || text.length);
  const delim = [',', ';', '\t'].map(d => [d, (firstLine.match(new RegExp('\\' + d, 'g')) || []).length]).sort((a,b) => b[1]-a[1])[0][0];
  const rows = [];
  let cur = [''], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { cur[cur.length-1] += '"'; i++; } else inQ = false; }
      else cur[cur.length-1] += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) cur.push('');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i+1] === '\n') i++;
      if (cur.length > 1 || cur[0] !== '') rows.push(cur);
      cur = [''];
    } else cur[cur.length-1] += c;
  }
  if (cur.length > 1 || cur[0] !== '') rows.push(cur);
  return rows;
}
function normDate(s){
  s = String(s||'').trim().split(' ')[0];
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return '';
}
const digitsOf = v => String(v||'').replace(/\D/g, '');
function findImportCols(header){
  const H = header.map(h => String(h||'').toLowerCase());
  const find = re => H.findIndex(h => re.test(h));
  return {
    resno:    find(/book.?number|reservation.?number|เลขที่การจอง|หมายเลขการจอง|หมายเลขที่พัก|เลขอ้างอิง/),
    checkin:  find(/check.?-?in|arrival|เช็ค.?อิน|วันเข้าพัก/),
    checkout: find(/check.?-?out|departure|เช็ค.?เอ|วันออก/),
    name:     find(/guest.?name|booker|ชื่อผู้เข้าพัก|ชื่อลูกค้า|^ชื่อ/),
    status:   find(/^status|สถานะ/),
    price:    find(/^price|total.?(price|amount)|ราคา|ยอดรวม/),
  };
}
let _xlsxPromise = null;
function loadXLSX(){
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/assets/xlsx.core.min.js';
    s.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('โหลดตัวอ่าน Excel ไม่สำเร็จ'));
    s.onerror = () => { _xlsxPromise = null; reject(new Error('โหลดตัวอ่าน Excel ไม่ได้ — ตรวจอินเทอร์เน็ต')); };
    document.head.appendChild(s);
  });
  return _xlsxPromise;
}
async function readSpreadsheet(file){
  const XLSX = await loadXLSX();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: false });
}
function openImport(){
  const li = localStorage.getItem(LAST_IMPORT);
  openSheet({ title:'นำเข้าไฟล์ Booking.com', sub:`<span class="faint">Extranet → Reservations → Download (.xlsx / .csv)</span>`,
    body:`<button class="dropzone" data-act="pick-file" style="width:100%">${ic('file')}<div style="margin-top:6px;font-weight:500;color:var(--ink)">แตะเพื่อเลือกไฟล์ หรือลากมาวาง</div><div style="font-size:12px;margin-top:2px">รองรับ .xlsx และ .csv</div></button>
    <h4 style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:18px 0 6px">ระบบจะทำอะไรบ้าง</h4>
    <div class="timeline-log" style="margin-top:0"><div><b>จับคู่เลขจอง</b> รายการที่มีอยู่แล้วจะอัปเดตชื่อ/วัน/ยอด ไม่สร้างซ้ำ</div><div><b>เติมข้อมูลที่ขาด</b> รายการ "รอเติมชื่อจาก Pulse" ที่เลขตรงกันจะถูกเติมให้อัตโนมัติ</div><div><b>รายงานก่อนบันทึก</b> แสดงจำนวนที่จะอัปเดตให้ตรวจก่อนกดยืนยัน</div></div>
    <div class="notebox" style="margin-top:14px">นำเข้าครั้งล่าสุด: ${isYMD(li) ? fmtDY(li) + (relDay(li)?` (${relDay(li)})`:'') : 'ยังไม่เคยนำเข้า'}</div>
    <div class="import-progress" id="importProgress"></div>`,
    foot:`<button class="btn primary" data-act="pick-file">เลือกไฟล์…</button><button class="btn" data-act="close-sheet">ปิด</button>` });
}
let importJobs = null;
async function handleImportFile(file){
  if (!file || !DATA) return;
  if (DATA.demo) { toast('โหมดตัวอย่าง — เชื่อมชีตจริงก่อนจึงนำเข้าได้', true); return; }
  let rows;
  try {
    if (/\.xlsx?$/i.test(file.name)) { toast('กำลังอ่านไฟล์ Excel…'); rows = await readSpreadsheet(file); }
    else rows = parseCSV(await file.text());
  } catch (e) { toast('อ่านไฟล์ไม่สำเร็จ: ' + ((e && e.message) || e), true); return; }
  if (!rows || rows.length < 2) { toast('อ่านไฟล์ไม่ได้ — ต้องเป็นไฟล์รายการจองจาก Extranet', true); return; }
  const cols = findImportCols(rows[0]);
  if (cols.resno < 0 || cols.checkin < 0 || cols.checkout < 0) { toast('ไม่รู้จักหัวตารางของไฟล์นี้ — ส่งไฟล์ให้ผู้ดูแลระบบปรับตัวอ่านได้', true); return; }
  const byDigits = {};
  BOOKINGS.forEach(b => { const d = digitsOf(b.id); if (d.length >= 6) byDigits[d] = b; });
  const jobs = [];
  let unmatched = 0;
  for (const r of rows.slice(1)) {
    const resno = digitsOf(r[cols.resno]);
    if (resno.length < 6) continue;
    const b = byDigits[resno];
    if (!b) { unmatched++; continue; }
    const fields = {};
    const ci = normDate(r[cols.checkin]), co = normDate(r[cols.checkout]);
    if (ci && b.checkin !== ci) fields.checkin = ci;
    if (co && b.checkout !== co) fields.checkout = co;
    if (cols.name >= 0) { const nm = String(r[cols.name]||'').trim(); if (nm && !String(b.name||'').trim()) fields.name = nm; }
    if (cols.price >= 0 && !isStaff()) {
      const amt = String(r[cols.price]||'').replace(/[^\d.]/g, '');
      if (amt && !String(b.amount||'').trim()) fields.amount = Math.round(Number(amt)).toLocaleString();
    }
    if (cols.status >= 0 && /cancel|ยกเลิก/i.test(String(r[cols.status]||'')) && !isCancelled(b)) fields.status = 'ยกเลิก';
    const willHaveDates = (fields.checkin || b.checkin) && (fields.checkout || b.checkout);
    if (willHaveDates && /อ่านวันที่จากอีเมลไม่ได้/.test(String(b.note||''))) fields.note = '';
    if (Object.keys(fields).length) jobs.push({ id: b.id, fields });
  }
  if (!jobs.length) {
    localStorage.setItem(LAST_IMPORT, TODAY);
    render();
    toast(unmatched ? `ข้อมูลตรงกันหมดแล้ว (ในไฟล์มี ${unmatched} รายการที่ไม่อยู่ในระบบ)` : 'ข้อมูลตรงกันหมดแล้ว ไม่มีอะไรต้องอัปเดต');
    return;
  }
  importJobs = jobs;
  const p = $('importProgress');
  if (p) p.innerHTML = `<div class="notebox2">พบข้อมูลที่จะอัปเดต <b>${jobs.length}</b> รายการ${unmatched?` (ข้าม ${unmatched} รายการที่ไม่อยู่ในระบบ)`:''} · ใช้เวลาประมาณ ${Math.ceil(jobs.length*1.5)} วินาที<div style="margin-top:8px"><button class="btn primary sm" data-act="run-import">เริ่มนำเข้า ${jobs.length} รายการ</button></div></div>`;
  else toast(`พบ ${jobs.length} รายการที่จะอัปเดต — เปิดหน้านำเข้าเพื่อยืนยัน`, true);
}
async function runImport(){
  const jobs = importJobs || [];
  if (!jobs.length) return;
  importJobs = null;
  const p = $('importProgress');
  let done = 0, fail = 0;
  for (const j of jobs) {
    const r1 = await apiUpdate({ action: 'update', id: j.id, fields: j.fields });
    r1 ? done++ : fail++;
    if (p) p.innerHTML = `<div class="notebox2 plain">กำลังนำเข้า… ${done+fail}/${jobs.length}</div>`;
  }
  if (done) localStorage.setItem(LAST_IMPORT, TODAY);
  closeSheet();
  await reload();
  toast(`นำเข้าเสร็จ: อัปเดต ${done} รายการ` + (fail ? ` · ล้มเหลว ${fail}` : ''));
}

/* ---------- ลากแถบบนไทม์ไลน์ (desktop): ขึ้น-ลง = ย้ายห้อง · ขอบขวา = เลื่อนวันออก ---------- */
let tlDrag = null, suppressTlClick = false;
const dragTag = document.createElement('div');
dragTag.className = 'drag-tag';
document.body.appendChild(dragTag);
function clearDropRows(){ document.querySelectorAll('.tl-row.droptarget').forEach(el => el.classList.remove('droptarget')); }
function endTlDrag(e, cancelled){
  if (!tlDrag) return;
  const d = tlDrag;
  tlDrag = null;
  d.bar.classList.remove('dragging');
  d.bar.style.pointerEvents = '';
  dragTag.style.display = 'none';
  clearDropRows();
  if (!d.moved || cancelled) return;
  suppressTlClick = true;
  setTimeout(() => { suppressTlClick = false; }, 250);
  if (!d.target) return;
  if (d.mode === 'move') {
    if (String(d.target) === String(d.b.room_no||'')) return;
    if (!roomFreeFor(d.target, d.b.checkin, effCheckout(d.b), d.b.id)) { toast(`ห้อง ${roomLabel(d.target)} ไม่ว่างช่วงนั้น`, true); return; }
    state.assign = d.b.id;
    doAssign(d.target); // ใช้เส้นทางเดียวกับโหมดจัดห้อง (payload + roomclean ห้องเดิม)
  } else {
    const co = d.target;
    if (!(co > d.b.checkin)) { toast('วันออกต้องอยู่หลังวันเช็คอิน', true); return; }
    if (String(d.b.room_no||'').trim() && !roomFreeFor(d.b.room_no, d.b.checkin, co, d.b.id)) { toast(`ห้อง ${roomLabel(d.b.room_no)} มีแขกจองต่อช่วงนั้น`, true); return; }
    (async () => {
      const r1 = await apiUpdate({ action: 'update', id: d.b.id, fields: { checkout: co } });
      if (r1) await afterAction(() => { d.b.checkout = co; }, `เลื่อนวันออกของ ${displayName(d.b)} เป็น ${fmtDY(co)}`);
    })();
  }
}
function initTlDrag(){
  const wrap = $('tl');
  wrap.addEventListener('pointerdown', e => {
    if (innerWidth < 900 || e.button !== 0) return;
    const bar = e.target.closest('.bar');
    if (!bar) return;
    const b = bookingById(bar.dataset.id);
    if (!b || isCheckedOut(b)) return;
    const r = bar.getBoundingClientRect();
    tlDrag = { bar, b, mode: e.clientX > r.right - 14 ? 'resize' : 'move', x0: e.clientX, y0: e.clientY, moved: false, target: null };
    try { bar.setPointerCapture(e.pointerId); } catch(_){}
  });
  wrap.addEventListener('pointermove', e => {
    if (!tlDrag) {
      if (innerWidth < 900) return;
      const bar = e.target.closest('.bar');
      if (bar) { const r = bar.getBoundingClientRect(); bar.style.cursor = e.clientX > r.right - 14 ? 'ew-resize' : 'grab'; }
      return;
    }
    if (!tlDrag.moved) {
      if (Math.hypot(e.clientX - tlDrag.x0, e.clientY - tlDrag.y0) < 6) return;
      tlDrag.moved = true;
      tlDrag.bar.classList.add('dragging');
      tlDrag.bar.style.pointerEvents = 'none'; // ให้ elementFromPoint ทะลุไปเจอแถวข้างใต้
    }
    dragTag.style.display = 'block';
    dragTag.style.left = (e.clientX + 14) + 'px';
    dragTag.style.top = (e.clientY + 16) + 'px';
    clearDropRows();
    if (tlDrag.mode === 'move') {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el && el.closest ? el.closest('.tl-row') : null;
      if (!row || !row.dataset.rowno) { tlDrag.target = null; dragTag.textContent = '—'; return; }
      tlDrag.target = row.dataset.rowno;
      row.classList.add('droptarget');
      dragTag.textContent = 'ย้ายไปห้อง ' + roomLabel(tlDrag.target);
    } else {
      const track = tlDrag.bar.parentElement;
      const cell = Number($('tl').dataset.cell) || 96;
      const x = e.clientX - track.getBoundingClientRect().left;
      const idx = Math.max(0, Math.min(state.tlDays - 1, Math.floor(x / cell)));
      const co = addDays(state.tlStart, idx + 1); // ปล่อยบนคืนสุดท้าย → เช็คเอาต์เช้าวันถัดไป
      if (co > tlDrag.b.checkin) { tlDrag.target = co; const n = diffDays(tlDrag.b.checkin, co); dragTag.textContent = `ออก ${fmtDY(co)} (${n} คืน)`; }
      else { tlDrag.target = null; dragTag.textContent = 'ต้องอยู่หลังวันเช็คอิน'; }
    }
  });
  wrap.addEventListener('pointerup', e => endTlDrag(e, false));
  wrap.addEventListener('pointercancel', e => endTlDrag(e, true));
}

/* ---------- events (delegation แบบต้นแบบ) ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if(!el) return;
  const act = el.dataset.act, id = el.dataset.id, no = el.dataset.no;
  if(act==='open-booking'){ if(suppressTlClick) return; e.stopPropagation(); openBooking(id); }
  else if(act==='open-room'){ e.stopPropagation(); openRoom(no); }
  else if(act==='checkin') doCheckIn(id);
  else if(act==='checkout') doCheckOut(id);
  else if(act==='confirm-open'){ e.stopPropagation(); openConfirm(id); }
  else if(act==='confirm-save') saveConfirm(id);
  else if(act==='cancel'){ if(el.dataset.armed){ doCancel(id); } else { el.dataset.armed='1'; el.textContent='แตะอีกครั้งเพื่อยืนยันการยกเลิก'; el.classList.add('primary'); setTimeout(()=>{ if(el.isConnected){ delete el.dataset.armed; el.textContent = el.dataset.label || 'ยกเลิกการจอง'; el.classList.remove('primary'); } }, 4000); } }
  else if(act==='restore') doRestore(id);
  else if(act==='extend') doExtend(id);
  else if(act==='assign'){ e.stopPropagation(); if(state.assign===id) cancelAssign(); else startAssign(id); }
  else if(act==='assign-to'){ e.stopPropagation(); doAssign(no); }
  else if(act==='cancel-assign') cancelAssign();
  else if(act==='clean-done'){ e.stopPropagation(); if(el.disabled) return; el.disabled = true; setClean(no, false); }
  else if(act==='clean-flag'){ e.stopPropagation(); if(el.dataset.armed){ setClean(no, true); } else { const old = el.innerHTML; el.dataset.armed='1'; el.innerHTML = `${esc(roomLabel(no))}<small>แตะอีกครั้งเพื่อยืนยัน</small>`; setTimeout(()=>{ if(el.isConnected){ delete el.dataset.armed; el.innerHTML = old; } }, 3000); } }
  else if(act==='edit') openEdit(id);
  else if(act==='save-edit') saveEdit(id);
  else if(act==='new-at'){ e.stopPropagation(); openNew(no, el.dataset.d); }
  else if(act==='save-new') saveNew();
  else if(act==='msg'){ e.stopPropagation(); openMsg(id); }
  else if(act==='msg-lang'){ document.querySelectorAll('[data-act="msg-lang"]').forEach(b => b.classList.toggle('on', b===el)); if(msgCtx){ msgCtx.lang = el.dataset.l; msgCtx.refresh(); } }
  else if(act==='copy-msg'){ const t = $('msgBox').value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(()=>toast('คัดลอกแล้ว — ไปวางในแชทลูกค้าได้เลย')).catch(()=>{ try { $('msgBox').select(); document.execCommand('copy'); toast('คัดลอกแล้ว'); } catch(_) { toast('คัดลอกไม่ได้ — เลือกข้อความแล้วคัดลอกเอง', true); } }); }
  else if(act==='close-sheet') closeSheet();
  else if(act==='summary'){ e.stopPropagation(); openSummary(); }
  else if(act==='copy-sum'){ copyText($('sumBox').value, 'คัดลอกแล้ว — ไปวางในกลุ่ม LINE ได้เลย', $('sumBox')); }
  else if(act==='share-sum'){ const t = $('sumBox').value; if(navigator.share) navigator.share({ text: t }).catch(()=>{}); else copyText(t, null, $('sumBox')); }
  else if(act==='print-today'){ closeSheet(); if(state.view!=='today') go('today'); setTimeout(() => window.print(), 150); }
  else if(act==='copy-text'){ e.stopPropagation(); copyText(el.dataset.text || ''); }
  else if(act==='shortcuts'){ openShortcuts(); }
  else if(act==='save-room-note') saveRoomNote(no);
  else if(act==='scroll'){ const t = document.querySelector(el.dataset.to); if(t){ t.scrollIntoView({behavior:'smooth', block:'start'}); t.style.background='var(--brand-tint)'; setTimeout(()=>t.style.background='',900); } }
  else if(act==='toggle-tray'){ state.trayOpen = !state.trayOpen; renderTimeline(); paintIcons($('view-timeline')); }
  else if(act==='room-filter'){ state.roomFilter = el.dataset.k; renderRooms(); paintIcons($('view-rooms')); }
  else if(act==='cal-day'){ state.calDay = el.dataset.d; state.calMonth = el.dataset.d.slice(0,7); if(state.view!=='calendar') go('calendar'); else { renderCalendar(); paintIcons($('view-calendar')); } }
  else if(act==='bk-status'){ state.bkStatus = el.dataset.s; renderBookings(); paintIcons($('view-bookings')); }
  else if(act==='go'){ closeSheet(); go(el.dataset.v); }
  else if(act==='theme'){ toggleTheme(); }
  else if(act==='refresh'){ closeSheet(); doRefresh(); }
  else if(act==='logout'){ closeSheet(); logout(); }
  else if(act==='open-import'){ go('bookings'); openImport(); }
  else if(act==='pick-file'){ $('importFile').click(); }
  else if(act==='run-import') runImport();
  else if(act==='save-expense') saveExpense();
  else if(act==='exp-del'){ e.stopPropagation(); if(el.dataset.armed){ deleteExpense(id); } else { el.dataset.armed='1'; el.style.color='var(--dirty)'; toast('แตะอีกครั้งเพื่อลบรายจ่ายนี้', true); setTimeout(()=>{ if(el.isConnected){ delete el.dataset.armed; el.style.color=''; } }, 3000); } }
});
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.view); }));
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => b.dataset.view==='more' ? openMore() : go(b.dataset.view)));
$('sheetClose').addEventListener('click', closeSheet);
$('backdrop').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => {
  if(e.key==='Escape'){ if($('sheet').classList.contains('on')) closeSheet(); else if(state.assign) cancelAssign(); }
  const typing = /input|textarea|select/i.test(document.activeElement.tagName);
  if(e.key==='/' && DATA && !typing){ e.preventDefault(); $('q').focus(); }
  if(!DATA || typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if($('sheet').classList.contains('on') && e.key!=='?') return;
  const k = e.key.toLowerCase();
  if(k==='n'){ e.preventDefault(); openNew('', TODAY); }
  else if(k==='t'){ e.preventDefault(); go('today'); }
  else if(k==='r'){ e.preventDefault(); doRefresh(); }
  else if(e.key==='?'){ e.preventDefault(); if($('sheet').classList.contains('on')) closeSheet(); else openShortcuts(); }
  else if(e.key==='[' || e.key===']'){
    const dir = e.key==='[' ? 'Prev' : 'Next';
    const btn = { timeline:'tl', calendar:'cal', money:'exp' }[state.view];
    if(btn){ e.preventDefault(); $(btn+dir).click(); }
  }
});
$('shortcutsBtn') && $('shortcutsBtn').addEventListener('click', openShortcuts);
$('syncChip') && $('syncChip').addEventListener('click', doRefresh);
$('pwEye') && $('pwEye').addEventListener('click', () => {
  const p = $('passInput'), show = p.type === 'password';
  p.type = show ? 'text' : 'password';
  $('pwEye').innerHTML = ICONS[show ? 'eyeOff' : 'eye'];
  $('pwEye').setAttribute('aria-label', show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
  p.focus();
});

/* ---------- ข้อมูลสดอัตโนมัติ + สถานะออฟไลน์ ----------
   หลังบ้านมักเปิดค้างบนแท็บเล็ตหน้าเคาน์เตอร์ทั้งวัน — กลับมาดูทีไรต้องเป็นข้อมูลล่าสุด */
const STALE_MS = 90 * 1000, AUTO_MS = 5 * 60 * 1000;
function maybeReload(force){
  if (!DATA || !sessionStorage.getItem(KEY_STORE) || document.hidden || navigator.onLine === false) return;
  if (force || Date.now() - SYNC_TS > STALE_MS) reload();
}
function paintOnline(){ const off = navigator.onLine === false; document.body.classList.toggle('offline', off); const bar = $('offlineBar'); if (bar) bar.hidden = !off; }
document.addEventListener('visibilitychange', () => { if (!document.hidden) maybeReload(false); });
setInterval(() => maybeReload(false), AUTO_MS);
window.addEventListener('online', () => { paintOnline(); if (DATA) { toast('กลับมาออนไลน์ — กำลังดึงข้อมูลล่าสุด'); maybeReload(true); } });
window.addEventListener('offline', paintOnline);
paintOnline();
$('q').addEventListener('input', e => { state.q = e.target.value; if(state.view!=='bookings' && state.q.trim()){ go('bookings'); } else if(state.view==='bookings'){ renderBookings(); paintIcons($('view-bookings')); } });
$('newBtn').addEventListener('click', () => openNew('', TODAY));
$('refreshBtn').addEventListener('click', doRefresh);
$('logoutBtn').addEventListener('click', logout);
$('themeBtn').addEventListener('click', () => toggleTheme());
$('tlPrev').addEventListener('click', () => { state.tlStart = addDays(state.tlStart || addDays(TODAY,-1), -state.tlDays); renderTimeline(); paintIcons($('view-timeline')); });
$('tlNext').addEventListener('click', () => { state.tlStart = addDays(state.tlStart || addDays(TODAY,-1), state.tlDays); renderTimeline(); paintIcons($('view-timeline')); });
$('tlToday').addEventListener('click', () => { state.tlStart = addDays(TODAY, -1); renderTimeline(); paintIcons($('view-timeline')); });
document.querySelectorAll('.seg [data-days]').forEach(b => b.addEventListener('click', () => { state.tlDays = Number(b.dataset.days); state.tlCompact = state.tlDays >= 28; renderTimeline(); paintIcons($('view-timeline')); }));
$('calPrev').addEventListener('click', () => { const [y,m] = state.calMonth.split('-').map(Number); const d = new Date(y, m-2, 1); state.calMonth = toYMD(d).slice(0,7); state.calDay = state.calMonth+'-01'; renderCalendar(); paintIcons($('view-calendar')); });
$('calNext').addEventListener('click', () => { const [y,m] = state.calMonth.split('-').map(Number); const d = new Date(y, m, 1); state.calMonth = toYMD(d).slice(0,7); state.calDay = state.calMonth+'-01'; renderCalendar(); paintIcons($('view-calendar')); });
$('bkSource').addEventListener('change', e => { state.bkSource = e.target.value; renderBookings(); paintIcons($('view-bookings')); });
$('bkRange').addEventListener('change', e => { state.bkRange = e.target.value; renderBookings(); paintIcons($('view-bookings')); });
$('bkCancel').addEventListener('change', e => { state.bkCancel = e.target.checked; renderBookings(); paintIcons($('view-bookings')); });
$('exportBtn').addEventListener('click', exportBookingsCSV);
$('importBtn').addEventListener('click', openImport);
$('importFile').addEventListener('change', async ev => { const f = ev.target.files[0]; ev.target.value = ''; await handleImportFile(f); });
$('expAdd').addEventListener('click', openExpense);
$('expCsv').addEventListener('click', exportExpensesCSV);
$('sumCsv').addEventListener('click', exportSummaryCSV);
$('expPrev').addEventListener('click', () => { const [y,m] = (state.expMonth||TODAY.slice(0,7)).split('-').map(Number); const d = new Date(y, m-2, 1); state.expMonth = toYMD(d).slice(0,7); renderMoney(); paintIcons($('view-money')); });
$('expNext').addEventListener('click', () => { const [y,m] = (state.expMonth||TODAY.slice(0,7)).split('-').map(Number); const d = new Date(y, m, 1); state.expMonth = toYMD(d).slice(0,7); renderMoney(); paintIcons($('view-money')); });
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if(VIEWS[v] && v!==state.view && DATA) go(v); });
let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if(state.view==='timeline' && DATA){ renderTimeline(); paintIcons($('view-timeline')); } }, 150); });
initTlDrag();

/* ---------- ธีม ---------- */
function applyTheme(t, save){
  document.documentElement.setAttribute('data-theme', t);
  if (save) { try { localStorage.setItem(THEME_KEY, t); } catch(_){} }
  if (DATA) renderNav();
}
function toggleTheme(){ applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true); }
applyTheme(localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);

/* ---------- auth & init ---------- */
function showApp(){
  $('splash').style.display = 'none';
  $('loginView').style.display = 'none';
  $('appView').style.display = '';
  $('tabbar').style.display = '';
  const v = location.hash.slice(1);
  state.view = VIEWS[v] ? v : 'today';
  if (state.view==='money' && isStaff()) state.view = 'today';
  render();
}
function showLogin(){
  $('splash').style.display = 'none';
  $('appView').style.display = 'none';
  $('tabbar').style.display = 'none';
  $('loginView').style.display = '';
  probeDemoHint();
  setTimeout(() => { const p = $('passInput'); if(p) p.focus(); }, 50);
}
async function probeDemoHint(){
  try {
    const r = await fetch('/api/data', { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (j && j.demo) $('demoHint').classList.add('show');
  } catch(_){}
}
async function tryLogin(key, silent){
  try {
    const r = await fetch('/api/data', { headers: { 'x-admin-key': key }, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) {
      sessionStorage.setItem(KEY_STORE, key);
      adopt(j);
      try { sessionStorage.setItem(DATA_CACHE, JSON.stringify(j)); } catch(_){}
      showApp();
      return true;
    }
    if (j && j.demo) $('demoHint').classList.add('show');
    if (!silent) $('loginErr').textContent = r.status === 401 ? 'รหัสผ่านไม่ถูกต้อง' : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง';
  } catch(_) {
    if (!silent) $('loginErr').textContent = 'เชื่อมต่อไม่ได้ — ลองรีเฟรชหน้า';
  }
  return false;
}
async function reload(){
  const key = sessionStorage.getItem(KEY_STORE) || '';
  try {
    const r = await fetch('/api/data', { headers: { 'x-admin-key': key }, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) {
      adopt(j);
      try { sessionStorage.setItem(DATA_CACHE, JSON.stringify(j)); } catch(_){}
      render();
    } else if (r.status === 401) {
      logout(); // รหัสหมดอายุ/ถูกเปลี่ยน — อย่าปล่อยให้ดูข้อมูลค้าง
    }
  } catch(_){}
}
async function doRefresh(){ toast('กำลังรีเฟรช…'); await reload(); toast('อัปเดตแล้ว'); }
function logout(){
  sessionStorage.removeItem(KEY_STORE);
  sessionStorage.removeItem(DATA_CACHE);
  DATA = null;
  showLogin();
}
$('loginForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  $('loginErr').textContent = '';
  const key = $('passInput').value.trim();
  if (!key) return;
  const btn = $('loginBtn');
  btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ…';
  await tryLogin(key, false);
  btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
});
(async function init(){
  paintIcons(document.body);
  const key = sessionStorage.getItem(KEY_STORE);
  // เปิดจากแคชก่อน (เข้าได้ทันทีแม้เน็ตช้า) แล้วค่อยดึงข้อมูลสดมาทับ
  const cached = sessionStorage.getItem(DATA_CACHE);
  if (key && cached) {
    try { adopt(JSON.parse(cached)); showApp(); } catch(_){}
    reload();
    return;
  }
  if (key) { const ok = await tryLogin(key, true); if (ok) return; }
  showLogin();
})();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
