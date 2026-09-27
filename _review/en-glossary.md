# English glossary — House of Happiness

One term per thing across every English page (`en:` strings in each page and in `assets/i18n.js`).
Built on 27 Sep 2026 from what the site already used most; the counts are how often each form appeared before the clean-up.

| Thing | Use | Avoid | Notes |
|---|---|---|---|
| Ferry from our lane (Tha Din Daeng ↔ Ratchawong) | **cross-river ferry** on first mention, then **ferry** | river ferry, shuttle boat | 22 × "cross-river ferry", 108 × "ferry" |
| Chao Phraya Express Boat | **Chao Phraya Express Boat** on first mention, then **express boat** | Express Boat (capitalised mid-sentence) | |
| BTS Gold Line | **BTS Gold Line** on first mention, then **Gold Line** | Golden Line | |
| คลองสาน | **Khlong San** | Klong San, Khlongsan | 120 uses, already consistent |
| ท่าดินแดง | **Tha Din Daeng** (pier) | Thadindaeng | |
| ท่าราชวงศ์ | **Ratchawong** (pier) | Rajawongse | |
| เยาวราช | **Yaowarat**; say "Chinatown" once to explain it | Yaowaraj | Both appear on purpose: Yaowarat is the road, Chinatown the area |
| สำเพ็ง | **Sampeng** | Sampheng | |
| สวนลอยฟ้าเจ้าพระยา | **Chao Phraya Sky Park** first, then **Sky Park** | Skypark, SkyPark | |
| ICONSIAM | **ICONSIAM** | IconSiam, Iconsiam | |
| สะพานพระปกเกล้า | **Phra Pok Klao Bridge** | | |
| Money | **฿** before the number: ฿5, ฿350–450 | THB, "baht" after numbers | THB → ฿ fixed in 2 airport strings |
| Café | **café / cafés** | cafe / cafes | Fixed across 7 files |
| Our property | **the hotel** in running text, **House of Happiness** in headings and first mentions | | "our place" once is fine in chatty lines |
| Arrival | **self check-in** | self-check-in, self checkin | |
| Times | Route and walk times: **12-hour** (6:30 PM). Check-in, check-out and timetables: **24-hour** (14:00) | mixing both inside one sentence | Checked 27 Sep: pages already follow this |

## Thai names kept on purpose
Food names on `heritage-walk` and `yaowarat-night-walk` stay in Thai on the English pages so guests can show them to vendors.
They carry `lang="th"`, and each list starts with "Thai names are included so you can show them to the vendor."

## Page descriptions
English meta descriptions should be 120–158 characters, contain no Thai, and say what the page helps you do.
Hand-written ones live in `EN_DESC` in `scripts/build-en.mjs`; pages without an entry use the first sentences of their intro.
