#!/usr/bin/env python3
"""사이드 패널 시계 아이콘 생성기 (외부 의존성 없음).

고해상도로 렌더링 후 축소(슈퍼샘플링)해 부드러운 안티에일리어싱 아이콘을 만듭니다.
사용법: python3 tools/make_icons.py
"""
import math
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")

# 색상
BG_TOP = (79, 70, 229)      # 인디고
BG_BOTTOM = (37, 99, 235)   # 블루
FACE = (255, 255, 255)
HAND = (30, 41, 59)         # 슬레이트
ACCENT = (239, 68, 68)      # 빨강 (초침)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


class Canvas:
    def __init__(self, size):
        self.size = size
        # RGBA float buffer
        self.px = [[0.0, 0.0, 0.0, 0.0] for _ in range(size * size)]

    def blend(self, x, y, color, alpha):
        if x < 0 or y < 0 or x >= self.size or y >= self.size or alpha <= 0:
            return
        i = y * self.size + x
        dst = self.px[i]
        da = dst[3] / 255.0
        sa = alpha
        out_a = sa + da * (1 - sa)
        if out_a <= 0:
            return
        for c in range(3):
            src = color[c]
            dc = dst[c]
            dst[c] = (src * sa + dc * da * (1 - sa)) / out_a
        dst[3] = out_a * 255.0

    def fill_rounded_rect(self, x0, y0, x1, y1, radius, color_fn):
        for y in range(int(y0), int(y1)):
            for x in range(int(x0), int(x1)):
                # 라운드 코너 마스크
                cx = min(max(x, x0 + radius), x1 - radius)
                cy = min(max(y, y0 + radius), y1 - radius)
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                a = 1.0 if d <= radius else 0.0
                if a:
                    self.blend(x, y, color_fn(x, y), 1.0)

    def fill_circle(self, cx, cy, r, color):
        for y in range(int(cy - r - 1), int(cy + r + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if d <= r:
                    self.blend(x, y, color, 1.0)

    def ring(self, cx, cy, r, width, color):
        for y in range(int(cy - r - 1), int(cy + r + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if r - width <= d <= r:
                    self.blend(x, y, color, 1.0)

    def thick_line(self, x0, y0, x1, y1, width, color):
        steps = int(math.hypot(x1 - x0, y1 - y0)) + 1
        half = width / 2.0
        for s in range(steps + 1):
            t = s / steps
            px = x0 + (x1 - x0) * t
            py = y0 + (y1 - y0) * t
            for dy in range(int(-half - 1), int(half + 2)):
                for dx in range(int(-half - 1), int(half + 2)):
                    if math.hypot(dx, dy) <= half:
                        self.blend(int(px) + dx, int(py) + dy, color, 1.0)


def render(size):
    SS = 4
    S = size * SS
    c = Canvas(S)

    def bg(x, y):
        return lerp(BG_TOP, BG_BOTTOM, y / S)

    margin = S * 0.06
    radius = S * 0.22
    c.fill_rounded_rect(margin, margin, S - margin, S - margin, radius, bg)

    cx = cy = S / 2
    face_r = S * 0.32
    c.fill_circle(cx, cy, face_r, FACE)

    # 시간 눈금 (12개)
    for i in range(12):
        ang = math.radians(i * 30)
        r_out = face_r * 0.88
        r_in = face_r * (0.72 if i % 3 == 0 else 0.80)
        w = S * (0.022 if i % 3 == 0 else 0.012)
        x0 = cx + r_in * math.sin(ang)
        y0 = cy - r_in * math.cos(ang)
        x1 = cx + r_out * math.sin(ang)
        y1 = cy - r_out * math.cos(ang)
        c.thick_line(x0, y0, x1, y1, w, HAND)

    # 시침 (10시 방향), 분침 (2시 방향)
    def hand(angle_deg, length, width, color):
        ang = math.radians(angle_deg)
        x1 = cx + length * math.sin(ang)
        y1 = cy - length * math.cos(ang)
        c.thick_line(cx, cy, x1, y1, width, color)

    hand(300, face_r * 0.45, S * 0.030, HAND)   # 시침
    hand(60, face_r * 0.68, S * 0.022, HAND)    # 분침
    hand(150, face_r * 0.72, S * 0.010, ACCENT) # 초침
    c.fill_circle(cx, cy, S * 0.028, ACCENT)

    # 다운샘플
    out = bytearray()
    for y in range(size):
        row = bytearray([0])  # filter type 0
        for x in range(size):
            r = g = b = a = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    p = c.px[(y * SS + sy) * S + (x * SS + sx)]
                    r += p[0]; g += p[1]; b += p[2]; a += p[3]
            n = SS * SS
            row += bytes([round(r / n), round(g / n), round(b / n), round(a / n)])
        out += row
    return bytes(out)


def write_png(path, size, raw):
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw, 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in (16, 32, 48, 128):
        raw = render(size)
        path = os.path.join(OUT_DIR, f"icon{size}.png")
        write_png(path, size, raw)
        print("wrote", path)


if __name__ == "__main__":
    main()
