"""Draw scales measured by head size (2026-11-18), applied by every importer last.

The importers derive a sheet's scale from the figure's standing height, which misses sheets
whose pose changes the height (crouched guards, leaning walks, raised arms). Guo saw the
heroes grow or shrink during fights (2026-11-18, lessons_learned.md B5). These sheets were
measured with tools/art/fit_head_scale.py (the head against idle cell 0) and checked by
eye in side-by-side strips beside idle; the value is the draw scale
that puts the head at the idle size. They are absolute values, so re-running an importer
never compounds them.

Not listed on purpose: walk and run sheets drawn in profile (the head reads small against
the three-quarter idle head, but the standing height matches), and sheets whose cells
differ from each other (one scale cannot fix them; they need a redraw, as Wind's and Fire's
lance-a got on 2026-11-19).
"""

from __future__ import annotations

SIZE_FIX: dict[str, float] = {
    # The lance-a redraw (RD02), fitted into its cells at 0.96 (repack_cells.py): was 0.92.
    "hero.fire.sheet.lance-a": 1.0,
    "hero.fire.pose.standing.forge-side-hook": 1.149,  # was 1.0, head 0.87 x idle
    "hero.fire.pose.standing.rising-brand": 1.136,  # was 1.0, head 0.88 x idle
    "hero.fire.pose.standing.spark-jab": 0.943,  # was 1.0, head 1.06 x idle
    "hero.fire.s3.pose.standing.forge-side-hook": 0.981,  # was 0.858, head 0.88 x idle
    "hero.fire.s3.pose.standing.rising-brand": 1.13,  # was 0.989, head 0.88 x idle
    "hero.fire.s3.sheet.exact-counter": 0.914,  # was 0.996, head 1.09 x idle
    "hero.fire.s3.sheet.guard": 0.918,  # was 0.991, head 1.08 x idle
    "hero.fire.s3.sheet.heavy": 0.839,  # was 0.914, head 1.09 x idle
    "hero.fire.sheet.exact-counter": 0.926,  # was 1.0, head 1.08 x idle
    "hero.fire.sheet.guard": 0.926,  # was 1.0, head 1.08 x idle
    "hero.fire.sheet.hammer": 1.105,  # was 1.0, head 0.91 x idle
    "hero.mountain.s3.sheet.breaker-pickup": 0.807,  # was 0.864, head 1.07 x idle
    "hero.mountain.s3.sheet.grab-throw": 0.854,  # was 0.905, head 1.06 x idle
    "hero.river.s3.sheet.guard": 0.857,  # was 0.926, head 1.08 x idle
    "hero.river.sheet.axe": 0.845,  # was 0.93, head 1.10 x idle
    "hero.river.sheet.guard": 0.87,  # was 0.94, head 1.08 x idle
    "hero.river.sheet.hike": 0.909,  # was 1.0, head 1.10 x idle
    "hero.wind.pose.dash.windline-entry": 1.124,  # was 1.0, head 0.89 x idle
    "hero.wind.pose.standing.windmark-jab": 0.943,  # was 1.0, head 1.06 x idle
    "hero.wind.s3.pose.standing.crossline-reverse": 0.955,  # was 0.879, head 0.92 x idle
    "hero.wind.s3.pose.standing.windmark-jab": 0.907,  # was 0.961, head 1.06 x idle
    # Stage 3 weapon walks: standing height 0.85 x idle as well as the head.
    "hero.wind.sheet.axe-walk": 0.988,  # was 0.84
    "hero.wind.sheet.hammer-walk": 0.988,  # was 0.84
    "hero.wind.sheet.hike-walk": 0.988,  # was 0.84
}


def apply(assets: dict) -> None:
    """Sets the measured scale on every listed sheet present in the manifest assets."""
    for key, scale in SIZE_FIX.items():
        sheet = assets.get(key, {}).get("sheet")
        if sheet is not None:
            sheet["scale"] = scale
