#!/usr/bin/env python3
"""Fits a 3 x 2 pose sheet whose poses cross the cell borders back into their cells (2026-11-19).

The lance-a redraws (RD01, RD02) keep one figure size in every cell, but the widest poses
(the long thrust and the throw) reach past the cell border, so a grid cut shows a stray foot
in the neighbouring cell and cuts the pose. This script:

  * finds every pose piece (connected components) and gives it to the cell holding its centre;
  * scales every pose by the same FACTOR about its own foot point (cell centre, lowest pixel),
    so the poses keep one size, and the sheet can come down to the idle size at the same time;
  * moves a pose sideways only as far as needed to keep MARGIN pixels from the cell border.

With `shift` instead of a factor, nothing is scaled: every pose moves sideways by the same
amount, the least that keeps all of them inside their cells (run cycles whose flight poses
reach back past the border; one shift for all cells keeps the motion between frames).

Usage (from the repository root; needs numpy, pillow and opencv-python-headless):

    python3 tools/art/repack_cells.py <in.png> <out.png> <factor | shift>
"""

from __future__ import annotations

import sys

import cv2
import numpy as np
from PIL import Image

MARGIN = 6


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    src, dst = sys.argv[1], sys.argv[2]
    shift = sys.argv[3] == "shift"
    factor = 1.0 if shift else float(sys.argv[3])
    im = np.array(Image.open(src).convert("RGBA"))
    h, w = im.shape[:2]
    cw, ch = w // 3, h // 2
    solid = (im[:, :, 3] > 10).astype(np.uint8)
    n, lab, stats, cen = cv2.connectedComponentsWithStats(cv2.dilate(solid, np.ones((5, 5), np.uint8)))
    owner = np.zeros(n, int) - 1
    for i in range(1, n):
        if stats[i][4] < 50:
            continue  # specks
        owner[i] = int(cen[i][1] // ch) * 3 + int(cen[i][0] // cw)
    out = np.zeros_like(im)
    dx = 0
    if shift:
        lo, hi = cw, -cw  # least room on the left, most overshoot on the right
        for c in range(6):
            ids = np.nonzero(owner == c)[0]
            if len(ids) == 0:
                continue
            xs = np.nonzero(np.isin(lab, ids) & (solid > 0))[1] - (c % 3) * cw
            lo, hi = min(lo, xs.min() - MARGIN), max(hi, xs.max() + 1 + MARGIN - cw)
        dx = -lo if lo < 0 else -hi if hi > 0 else 0
        if lo + dx < 0 or hi + dx > 0:
            raise SystemExit("no single shift keeps every pose inside its cell")
    for c in range(6):
        ids = np.nonzero(owner == c)[0]
        if len(ids) == 0:
            continue
        mask = np.isin(lab, ids) & (solid > 0)
        ys, xs = np.nonzero(mask)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        piece = im[y0:y1, x0:x1].copy()
        piece[~mask[y0:y1, x0:x1]] = 0
        ox, oy = (c % 3) * cw, (c // 3) * ch
        ax, ay = ox + cw / 2, y1  # foot point: cell centre, lowest pixel
        pw, ph = max(1, round((x1 - x0) * factor)), max(1, round((y1 - y0) * factor))
        piece = cv2.resize(piece, (pw, ph), interpolation=cv2.INTER_AREA)
        nx = round(ax + (x0 - ax) * factor) + dx
        ny = round(ay - ph)
        nx = min(max(nx, ox + MARGIN), ox + cw - MARGIN - pw)
        if pw > cw - 2 * MARGIN:
            raise SystemExit(f"cell {c + 1}: {pw} px wide after scaling, more than the cell")
        region = out[ny : ny + ph, nx : nx + pw]
        a = piece[:, :, 3:4] / 255.0
        region[:] = (piece * a + region * (1 - a)).astype(np.uint8)
        region[:, :, 3] = np.maximum(region[:, :, 3], piece[:, :, 3])
    Image.fromarray(out).save(dst)
    print(f"{dst}: " + (f"shift {dx} px" if shift else f"factor {factor}"))


if __name__ == "__main__":
    main()
