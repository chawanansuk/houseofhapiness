#!/usr/bin/env python3
"""สร้างไฟล์ WebP + ขนาด 800px จากรูป .jpg ต้นฉบับใน images/ และ images/attractions/

ใช้: python3 tools/make-webp.py
- <name>.webp        = ขนาดเท่าต้นฉบับ (ใช้กับ hero)
- <name>-800.webp    = กว้าง 800px (ใช้กับการ์ดในหน้ารวม)
ไม่แตะไฟล์ .jpg เดิม เพราะยังต้องใช้เป็น fallback และเป็นรูปใน og:image
"""
import glob
import os
from PIL import Image

SRC_DIRS = ["images", "images/attractions"]
CARD_W = 800
QUALITY = 82
CAP_FULL_KB = 220   # hero ไม่ควรเกินเท่านี้ เน็ตมือถือไทยต่างจังหวัดยังช้า
CAP_CARD_KB = 130   # การ์ดในหน้ารวมมี 24 ใบ ต้องเบาเป็นพิเศษ


def save(im, path, cap_kb=None):
    """เซฟเป็น WebP ลดคุณภาพทีละขั้นจนไฟล์ไม่เกิน cap_kb (รูปใหญ่มากบางรูปที่ q82 ยังหนักเกิน)"""
    for q in (QUALITY, 74, 68, 62):
        im.save(path, format="WEBP", quality=q, method=6)
        size = os.path.getsize(path)
        if cap_kb is None or size <= cap_kb * 1024:
            return size, q
    return size, q


def main():
    total_before = total_after = 0
    jpgs = [f for d in SRC_DIRS for f in sorted(glob.glob(os.path.join(d, "*.jpg")))]
    for jpg in jpgs:
        base = jpg[:-4]
        im = Image.open(jpg).convert("RGB")
        w, h = im.size
        before = os.path.getsize(jpg)
        total_before += before

        full, fq = save(im, base + ".webp", cap_kb=CAP_FULL_KB)
        total_after += full
        line = f"{os.path.basename(jpg)} {w}x{h} {before // 1024}KB -> webp {full // 1024}KB q{fq}"

        if w > CARD_W:
            card = im.resize((CARD_W, round(h * CARD_W / w)), Image.LANCZOS)
            cs, cq = save(card, base + "-800.webp", cap_kb=CAP_CARD_KB)
            line += f" · 800px {cs // 1024}KB q{cq}"
        print(line)
    print(f"รวม jpg {total_before // 1024}KB -> webp {total_after // 1024}KB")


if __name__ == "__main__":
    main()
