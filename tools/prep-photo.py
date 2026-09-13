#!/usr/bin/env python3
"""เตรียมรูปที่โหลดมาให้พร้อมขึ้นเว็บ — ย่อ บีบ ลบ EXIF แล้ววางให้ถูกที่

ส่งไฟล์ต้นฉบับความละเอียดเต็มมาได้เลย ไม่ต้องย่อมาก่อน

    python3 tools/prep-photo.py ~/Downloads/ayutthaya-full.jpg ayutthaya
    python3 tools/prep-photo.py ~/Downloads/*.jpg --slug-from-name

ทำอะไรให้บ้าง
  - ย่อให้กว้าง 1600 px (ไม่ขยายถ้าต้นฉบับเล็กกว่า)
  - JPEG คุณภาพ 80 แบบ progressive ให้ค่อยๆ ชัดตอนโหลด
  - ลบ EXIF ทิ้ง — ไฟล์จากกล้องมือถือฝังพิกัด GPS มาด้วย ห้ามขึ้นเว็บ
  - หมุนภาพตามที่ EXIF บอกก่อนลบ ไม่งั้นรูปจากมือถือจะตะแคง
  - เตือนถ้ารูปเป็นแนวตั้ง เพราะกรอบการ์ดบนเว็บเป็นแนวนอน

ต้องมี Pillow:  pip install Pillow
เสร็จแล้วรัน:  node tools/sync-image-dims.js --write
"""
import sys, os
from PIL import Image, ImageOps

WIDTH, QUALITY = 1600, 80
DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "images", "attractions")


def prep(src, slug):
    im = Image.open(src)
    before = im.size
    im = ImageOps.exif_transpose(im)          # หมุนตาม EXIF ก่อน แล้วค่อยทิ้ง EXIF
    if im.mode != "RGB":
        im = im.convert("RGB")
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)

    clean = Image.new("RGB", im.size)          # ภาพใหม่ = ไม่มี metadata ติดมาเลย
    clean.paste(im)
    out = os.path.normpath(os.path.join(DEST, f"{slug}.jpg"))
    clean.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)

    kb = os.path.getsize(out) // 1024
    print(f"{os.path.basename(src)} {before[0]}x{before[1]} -> {slug}.jpg "
          f"{clean.width}x{clean.height} {kb} KB")
    if clean.height > clean.width:
        print(f"  ⚠️  {slug}.jpg เป็นแนวตั้ง — การ์ดบนเว็บเป็นกรอบแนวนอน "
              f"รูปจะถูกครอปหัวท้ายทิ้ง ควรหารูปแนวนอนแทน")
    if kb > 400:
        print(f"  ⚠️  {kb} KB ใหญ่กว่าเป้า 400 KB")
    return out


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    by_name = "--slug-from-name" in sys.argv
    if not args or (not by_name and len(args) != 2):
        sys.exit(__doc__)
    if by_name:
        for f in args:
            prep(f, os.path.splitext(os.path.basename(f))[0].lower())
    else:
        prep(args[0], args[1].lower().removesuffix(".jpg"))
    print("\nต่อไป: node tools/sync-image-dims.js --write")
