"""Generate WheelSync PWA icons (blue with a simple car shape) using only stdlib."""
import struct
import zlib
import os


def create_png(size, bg=(9, 132, 227)):
    r, g, b = bg
    w = h = size
    rows = []
    for y in range(h):
        row = bytearray()
        row.append(0)  # filter
        for x in range(w):
            pr, pg, pb = r, g, b
            # Car body (white rounded rectangle band in the middle)
            body_top = int(h * 0.42)
            body_bottom = int(h * 0.64)
            body_left = int(w * 0.16)
            body_right = int(w * 0.84)
            in_body = body_left <= x <= body_right and body_top <= y <= body_bottom
            # Roof (trapezoid) above body
            roof_top = int(h * 0.30)
            if body_top - 2 <= y <= body_top and int(w*0.28) <= x <= int(w*0.72):
                in_body = True
            if roof_top <= y < body_top:
                progress = (y - roof_top) / max(1, (body_top - roof_top))
                left = int(w*0.34 - progress * (w*0.06))
                right = int(w*0.66 + progress * (w*0.06))
                if left <= x <= right:
                    in_body = True
            if in_body:
                pr, pg, pb = 255, 255, 255
            # Wheels (two white circles)
            for wheel_cx in (int(w*0.33), int(w*0.67)):
                wheel_cy = int(h*0.66)
                dx, dy = x - wheel_cx, y - wheel_cy
                if dx*dx + dy*dy <= (w*0.09)**2:
                    pr, pg, pb = 255, 255, 255
                if dx*dx + dy*dy <= (w*0.04)**2:
                    pr, pg, pb = r, g, b
            row.extend((pr, pg, pb))
        rows.append(bytes(row))
    raw = b''.join(rows)
    compressed = zlib.compress(raw)

    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png


sizes = [72, 96, 128, 144, 152, 192, 384, 512]
d = os.path.dirname(os.path.abspath(__file__))
for s in sizes:
    with open(os.path.join(d, f'icon-{s}.png'), 'wb') as f:
        f.write(create_png(s))
    print(f'Created icon-{s}.png')
print('Done!')
