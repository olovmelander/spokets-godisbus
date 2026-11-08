"""Builds Olympia's two big things, for Aventyr 2's football ground in Bredbyn (docs/aventyr-2-overhaul.md):

  - olympia-hall: the wine-red hall under its wide, low barrel arch, with the white fascia that follows the curve,
    the ribbon of paired white windows high in the gable, the low block across its front with a grey flashing, the
    dark recessed porch with its white post, and the timber ramp with its tube rail;
  - olympia-stand: the long open stand of warm tan timber tiers under a thin dark roof on slender columns, the
    curved beam at its end, and the white tube rails of its stairs.

Interpreted from photographs, which are references and are never used as pictures here. Olov asked for the hall's
name in white letters over its windows (4 November 2026), set in Playpen Sans, the game's own hand, and not the
club's lettering. No other letter, crest or sponsor's board is on it: plain walls stand where those are.

Run headless:
    blender -b --factory-startup --python art/blender/olympia.py -- [preview.png]
It empties the scene, builds both, bakes the shade of their corners and creases, and writes
art/baked/aventyr2/olympia.glb through scripts/bake/export.py.

Units: 1 Blender unit is 1 EL (15 cm); Z is up, and a thing's front faces -Y, towards the camera in the game. Its foot
is at Z 0. Nothing here has a texture: colours are on the corners (the colour attribute "Color"), in one material.

Nothing in this model comes from anyone else. Keep this file in plain ASCII.
"""
import math
import os
import sys

import bpy


def linear(text):
    """A colour from sRGB hex to the linear numbers Blender keeps."""
    out = []
    for i in (1, 3, 5):
        v = int(text[i:i + 2], 16) / 255
        out.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


RED = linear('#74222a')
RED_DARK = linear('#5f1a22')
WHITE = linear('#e6e4dc')
ROOF = linear('#3c4046')
ROOF_RIB = linear('#33373c')
FLASH = linear('#8c9094')
CONCRETE = linear('#83847e')
WOOD = linear('#7a5a3c')
TUBE = linear('#5a4632')
DARK = linear('#1a1718')
PANE = linear('#141e2a')
TAN = linear('#b08c60')
TAN_SEAT = linear('#c8a472')
TAN_DARK = linear('#8c6c48')
BANK = linear('#3c5233')
STEEL = linear('#7a8088')
RAIL = linear('#dfe2de')
ROOF_DARK = linear('#2a2d32')
BIN = linear('#2a5a9a')
GUTTER = linear('#6e7276')
GUTTER_DARK = linear('#4a4e52')
DOOR = linear('#2a3038')
SKY = linear('#56626e')
STEP = linear('#6e6f6a')


def rnd(a, b=0.0):
    """A fixed number from 0 to 1 for a pair of numbers: the same hall every time it is built."""
    v = math.sin(a * 12.9898 + b * 78.233) * 43758.5453
    return v - math.floor(v)


def shade(colour, k):
    return (colour[0] * k, colour[1] * k, colour[2] * k, 1.0)


def mix(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 1.0)


class Part:
    """One object's corners and faces, each face in one colour."""

    def __init__(self):
        self.verts = []
        self.faces = []
        self.colours = []

    def face(self, points, colour):
        """A face in one colour, or with a colour for each of its corners (a list of them)."""
        first = len(self.verts)
        self.verts.extend(points)
        self.faces.append(list(range(first, first + len(points))))
        self.colours.append(colour)

    def box(self, lo, hi, colour, bottom=False):
        (x0, y0, z0), (x1, y1, z1) = lo, hi
        self.face([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], colour)  # front
        self.face([(x1, y1, z0), (x0, y1, z0), (x0, y1, z1), (x1, y1, z1)], colour)  # back
        self.face([(x0, y1, z0), (x0, y0, z0), (x0, y0, z1), (x0, y1, z1)], colour)  # left
        self.face([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], colour)  # right
        self.face([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], colour)  # top
        if bottom:
            self.face([(x0, y1, z0), (x1, y1, z0), (x1, y0, z0), (x0, y0, z0)], colour)

    def board(self, lo, hi, foot, top):
        """A box whose front goes from one colour at its foot to another at its top: a painted board, weathered."""
        (x0, y0, z0), (x1, y1, z1) = lo, hi
        middle = mix(foot, top, 0.5)
        self.face([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], [foot, foot, top, top])
        self.face([(x0, y1, z0), (x0, y0, z0), (x0, y0, z1), (x0, y1, z1)], [shade(foot, 0.9), shade(foot, 0.9), shade(top, 0.9), shade(top, 0.9)])
        self.face([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], [shade(foot, 0.9), shade(foot, 0.9), shade(top, 0.9), shade(top, 0.9)])
        self.face([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], shade(middle, 1.08))

    def window(self, x0, x1, z0, z1, wall, panes, sill=True):
        """A window set into a wall whose face is at y `wall`: a white frame standing out from it, bars between its
        panes, the glass set back, pale with the sky at its top and dark below, and a sloping sill under it."""
        rim = 0.28
        out = wall - 0.3
        self.box((x0, out, z1 - rim), (x1, wall, z1), WHITE)
        self.box((x0, out, z0), (x1, wall, z0 + rim), WHITE)
        self.box((x0, out, z0 + rim), (x0 + rim, wall, z1 - rim), WHITE)
        self.box((x1 - rim, out, z0 + rim), (x1, wall, z1 - rim), WHITE)
        inner = x1 - x0 - 2 * rim
        for k in range(1, panes):
            x = x0 + rim + inner * k / panes
            self.box((x - 0.1, out + 0.06, z0 + rim), (x + 0.1, wall, z1 - rim), WHITE)
        glass = wall - 0.05
        low, high = mix(PANE, SKY, 0.15), mix(PANE, SKY, 0.85)
        self.face([(x0 + rim, glass, z0 + rim), (x1 - rim, glass, z0 + rim), (x1 - rim, glass, z1 - rim), (x0 + rim, glass, z1 - rim)],
                  [low, low, high, mix(high, SKY, 0.3)])
        if sill:
            # The sill: sheet metal sloping out and down, with a lip that the rain drips from.
            self.face([(x0 - 0.15, wall - 0.55, z0 - 0.02), (x1 + 0.15, wall - 0.55, z0 - 0.02), (x1 + 0.15, out, z0 + 0.12), (x0 - 0.15, out, z0 + 0.12)], FLASH)
            self.face([(x0 - 0.15, wall - 0.55, z0 - 0.22), (x1 + 0.15, wall - 0.55, z0 - 0.22), (x1 + 0.15, wall - 0.55, z0 - 0.02), (x0 - 0.15, wall - 0.55, z0 - 0.02)],
                      shade(FLASH, 0.8))

    def tube(self, a, b, radius, colour, sides=6):
        """A round bar from a to b."""
        ax, ay, az = a
        bx, by, bz = b
        dx, dy, dz = bx - ax, by - ay, bz - az
        long = math.sqrt(dx * dx + dy * dy + dz * dz)
        ux, uy, uz = dx / long, dy / long, dz / long
        # Two directions across it.
        px, py, pz = (0.0, 0.0, 1.0) if abs(uz) < 0.9 else (1.0, 0.0, 0.0)
        cx, cy, cz = uy * pz - uz * py, uz * px - ux * pz, ux * py - uy * px
        l = math.sqrt(cx * cx + cy * cy + cz * cz)
        cx, cy, cz = cx / l, cy / l, cz / l
        vx, vy, vz = uy * cz - uz * cy, uz * cx - ux * cz, ux * cy - uy * cx
        ring = []
        for i in range(sides):
            t = i / sides * math.tau
            c, s = math.cos(t) * radius, math.sin(t) * radius
            ring.append((cx * c + vx * s, cy * c + vy * s, cz * c + vz * s))
        for i in range(sides):
            p, q = ring[i], ring[(i + 1) % sides]
            self.face([(ax + p[0], ay + p[1], az + p[2]), (ax + q[0], ay + q[1], az + q[2]),
                       (bx + q[0], by + q[1], bz + q[2]), (bx + p[0], by + p[1], bz + p[2])], colour)

    def finish(self, name, material):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.verts, [], self.faces)
        mesh.update()
        colour = mesh.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
        for poly, value in zip(mesh.polygons, self.colours):
            for k, loop in enumerate(poly.loop_indices):
                colour.data[loop].color = value[k] if isinstance(value, list) else value
        mesh.materials.append(material)
        thing = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(thing)
        return thing


# --- the hall ---------------------------------------------------------------------------------------------------

HALF = 25.0
SPRING = 11.0
RISE = 8.6
DEEP = 44.0
LOW = 10.2
LOW_OUT = -6.5


def arch(x):
    """The gable's top at x: a low circular arc over the span."""
    k = max(-1.0, min(1.0, x / HALF))
    radius = (HALF * HALF + RISE * RISE) / (2 * RISE)
    return SPRING + RISE - radius + math.sqrt(max(0.0, radius * radius - (k * HALF) ** 2))


def hall():
    p = Part()
    steps = 28
    xs = [-HALF + 2 * HALF * i / steps for i in range(steps + 1)]
    # The gable, the wall behind it and the barrel roof.
    p.face([(x, 0.0, arch(x)) for x in reversed(xs)] + [(-HALF, 0.0, 0.0), (HALF, 0.0, 0.0)], RED)
    p.face([(x, DEEP, arch(x)) for x in xs] + [(HALF, DEEP, 0.0), (-HALF, DEEP, 0.0)], RED)
    p.box((-HALF, 0.2, 0.0), (-HALF + 0.1, DEEP, SPRING), RED)
    p.box((HALF - 0.1, 0.2, 0.0), (HALF, DEEP, SPRING), RED)
    for i in range(steps):
        a, b = xs[i], xs[i + 1]
        over = 0.9
        p.face([(a, -over, arch(a) + 0.12), (b, -over, arch(b) + 0.12), (b, DEEP + 0.5, arch(b) + 0.12), (a, DEEP + 0.5, arch(a) + 0.12)], ROOF if i % 2 else ROOF_RIB)
    # The roof's eaves: it comes down over both sides.
    p.face([(-HALF - 0.7, -0.9, SPRING - 0.1), (-HALF, -0.9, SPRING + 0.12), (-HALF, DEEP + 0.5, SPRING + 0.12), (-HALF - 0.7, DEEP + 0.5, SPRING - 0.1)], ROOF)
    p.face([(HALF, -0.9, SPRING + 0.12), (HALF + 0.7, -0.9, SPRING - 0.1), (HALF + 0.7, DEEP + 0.5, SPRING - 0.1), (HALF, DEEP + 0.5, SPRING + 0.12)], ROOF)
    # The upright boards of the gable, each its own, cut by the arch: each board its own tone, paler where the sun has
    # faded it at its top, and a batten over each joint standing out from them, with its own thin shadow.
    x = -HALF + 0.3
    n = 0
    while x < HALF - 0.4:
        n += 1
        top = arch(x + 0.31) - 1.25
        if top > LOW + 0.5:
            tint = 0.88 + 0.22 * rnd(n, 1.0)
            p.board((x + 0.02, -0.06, LOW), (x + 0.6, 0.0, top), shade(RED, tint * 0.94), shade(mix(RED, WHITE, 0.08), tint))
            p.board((x - 0.09, -0.11, LOW), (x + 0.09, -0.06, top - 0.05), shade(RED_DARK, 1.05), shade(RED, 1.02))
        x += 0.62
    # The white fascia, following the curve: broad, and standing out from the gable.
    for i in range(steps):
        a, b = xs[i], xs[i + 1]
        p.face([(a, -1.0, arch(a) + 0.1), (a, -1.0, arch(a) - 1.15), (b, -1.0, arch(b) - 1.15), (b, -1.0, arch(b) + 0.1)][::-1], WHITE)
        p.face([(a, -1.0, arch(a) - 1.15), (a, -0.1, arch(a) - 1.15), (b, -0.1, arch(b) - 1.15), (b, -1.0, arch(b) - 1.15)][::-1], WHITE)
    # The ribbon of paired white windows, high under the arch: their frames and the bars between them standing out, the
    # glass set back, and a sill under it.
    pairs = 5
    wide = 5.1
    bottom, top = 12.4, 15.0
    left = -(pairs * wide) / 2
    p.window(left - 0.35, left + pairs * wide + 0.35, bottom - 0.35, top + 0.35, -0.06, pairs * 2)
    # The low block across the front, in boards and battens of wine-red paint. Each board is its own tone, darker at its
    # foot where the rain splashes up and paler at its top, and under each window's sill dark where the rain runs off it;
    # the battens over the joints stand out and throw thin shadows. The flashing over it, its gutter and downpipes, and
    # the plinth, darker at its foot.
    p.box((-34.0, LOW_OUT, 0.0), (29.0, 0.1, LOW), RED)
    WINDOWS = ((-16.0, -8.0, 3.5, 8.3, 2), (12.0, 28.2, 5.7, 8.9, 4))
    x = -33.95
    n = 0
    while x < 28.9:
        n += 1
        wide = min(0.62, 29.0 - x)
        middle = x + wide / 2
        if not 1.8 < middle < 8.8:
            spans = [(1.2, LOW - 0.5, False)]
            for x0, x1, z0, z1, _ in WINDOWS:
                if x0 - 0.2 < middle < x1 + 0.2:
                    spans = [(1.2, z0 - 0.24, True), (z1, LOW - 0.5, False)]
            tint = 0.86 + 0.22 * rnd(n, 2.0)
            run = 0.45 + 0.4 * rnd(n, 3.0)
            for low, high, under in spans:
                foot = shade(RED, tint * (0.72 if low < 1.5 else 0.92))
                top = shade(RED_DARK, tint * run) if under else shade(mix(RED, WHITE, 0.07), tint)
                p.board((x + 0.02, LOW_OUT - 0.05, low), (x + wide - 0.02, LOW_OUT, high), foot, top)
                p.board((x - 0.09, LOW_OUT - 0.13, low), (x + 0.09, LOW_OUT - 0.05, high), shade(foot, 0.95), shade(top, 0.98))
        x += wide
    p.box((-34.5, LOW_OUT - 0.5, LOW - 0.35), (29.5, 0.2, LOW + 0.5), FLASH)
    p.board((-34.2, LOW_OUT - 0.25, 0.0), (29.2, LOW_OUT + 0.4, 1.2), shade(CONCRETE, 0.62), CONCRETE)
    # The gutter along the flashing's edge, and the downpipes from it down the wall to the ground, held by brackets.
    gy = LOW_OUT - 0.78
    p.tube((-34.4, gy, LOW + 0.2), (29.4, gy, LOW + 0.2), 0.26, GUTTER, 8)
    for x in (-33.2, -17.6, 10.8, 28.5):
        p.tube((x, gy, LOW + 0.1), (x, gy + 0.32, LOW - 0.7), 0.15, GUTTER, 8)
        p.tube((x, gy + 0.32, LOW - 0.7), (x, gy + 0.32, 1.0), 0.15, GUTTER, 8)
        p.tube((x, gy + 0.32, 1.0), (x, gy - 0.2, 0.35), 0.15, GUTTER, 8)
        for z in (2.6, 5.2, 7.8):
            p.box((x - 0.18, gy + 0.32, z), (x + 0.18, LOW_OUT - 0.05, z + 0.12), GUTTER_DARK)
    # The dark recessed porch, its white post and thin roof; at its back the double doors in their white frame, a glass
    # panel in each, and their handles.
    p.box((2.0, LOW_OUT - 0.14, 1.2), (8.6, LOW_OUT - 0.02, LOW - 0.4), DARK)
    p.box((8.3, LOW_OUT - 0.9, 0.0), (8.9, LOW_OUT - 0.1, LOW), WHITE)
    p.box((1.4, LOW_OUT - 1.6, LOW + 0.1), (9.6, LOW_OUT, LOW + 0.7), FLASH)
    p.box((2.9, LOW_OUT - 0.3, 1.7), (3.2, LOW_OUT - 0.14, 7.9), WHITE)
    p.box((7.2, LOW_OUT - 0.3, 1.7), (7.5, LOW_OUT - 0.14, 7.9), WHITE)
    p.box((2.9, LOW_OUT - 0.3, 7.6), (7.5, LOW_OUT - 0.14, 7.9), WHITE)
    for x0 in (3.2, 5.37):
        p.box((x0 + 0.02, LOW_OUT - 0.2, 1.7), (x0 + 2.11, LOW_OUT - 0.14, 7.6), DOOR)
        p.face([(x0 + 0.42, LOW_OUT - 0.21, 4.2), (x0 + 1.71, LOW_OUT - 0.21, 4.2), (x0 + 1.71, LOW_OUT - 0.21, 7.1), (x0 + 0.42, LOW_OUT - 0.21, 7.1)],
               [mix(PANE, SKY, 0.1), mix(PANE, SKY, 0.1), mix(PANE, SKY, 0.6), mix(PANE, SKY, 0.6)])
        hand = x0 + (1.85 if x0 < 5.0 else 0.28)
        p.box((hand - 0.06, LOW_OUT - 0.34, 3.6), (hand + 0.06, LOW_OUT - 0.2, 4.6), STEEL)
    # White-framed windows set into the block: a pair to the left, a band of four to the right.
    for x0, x1, z0, z1, panes in WINDOWS:
        p.window(x0, x1, z0, z1, LOW_OUT - 0.05, panes)
    # The timber ramp along the front, with its tube rail.
    y0, y1 = LOW_OUT - 5.2, LOW_OUT - 2.2
    ramp = 14
    for i in range(ramp):
        a = -26.0 + i * 2.0
        b = a + 2.0
        low, high = 0.3 + i * 0.1, 0.3 + (i + 1) * 0.1
        p.face([(a, y0, low), (b, y0, high), (b, y1, high), (a, y1, low)], WOOD)
        p.face([(a, y0, 0.0), (b, y0, 0.0), (b, y0, high), (a, y0, low)], TUBE)
    p.box((2.0, y0, 0.0), (9.2, LOW_OUT - 0.2, 1.7), WOOD)
    for i in range(ramp + 1):
        a = -26.0 + i * 2.0
        p.tube((a, y0 + 0.1, 0.3 + i * 0.1), (a, y0 + 0.1, 3.4 + i * 0.1), 0.09, TUBE)
    p.tube((-26.0, y0 + 0.1, 3.4), (2.0, y0 + 0.1, 4.8), 0.11, TUBE)
    p.tube((-26.0, y0 + 0.1, 2.2), (2.0, y0 + 0.1, 3.6), 0.09, TUBE)
    return p


# --- the stand --------------------------------------------------------------------------------------------------

STAND_HALF = 40.0
TIERS = 7
TREAD = 1.9
RAISE = 1.0
ROOF_Z = 15.5


def stand():
    p = Part()
    # The low bank it stands on, and the tiers: a pale seat on each dark riser.
    p.box((-STAND_HALF - 1, -1.2, 0.0), (STAND_HALF + 1, TIERS * TREAD + 1.5, 0.6), BANK)
    for i in range(TIERS):
        y0 = i * TREAD
        z = 0.6 + (i + 1) * RAISE
        p.box((-STAND_HALF, y0, 0.6), (STAND_HALF, y0 + TREAD, z - 0.22), TAN_DARK)
        p.box((-STAND_HALF, y0 - 0.12, z - 0.22), (STAND_HALF, y0 + TREAD, z), TAN_SEAT)
        # The boards along the riser.
        p.box((-STAND_HALF, y0 - 0.03, z - 0.62), (STAND_HALF, y0, z - 0.5), TAN)
    back = TIERS * TREAD
    p.box((-STAND_HALF, back, 0.6), (STAND_HALF, back + 0.4, 0.6 + TIERS * RAISE + 2.2), TAN_DARK)
    # Three stairs through the tiers, and the white tube rails either side of them.
    for x in (-24.0, 0.0, 24.0):
        for i in range(TIERS * 2):
            y0 = i * TREAD / 2
            z = 0.6 + (i + 1) * RAISE / 2
            p.box((x - 1.5, y0 - 0.06, 0.6), (x + 1.5, y0 + TREAD / 2, z + 0.03), CONCRETE)
        for side in (-1.6, 1.6):
            low = (x + side, -0.1, 1.0)
            high = (x + side, back, 0.6 + TIERS * RAISE + 0.5)
            p.tube((low[0], low[1], low[2] + 2.4), (high[0], high[1], high[2] + 2.4), 0.1, RAIL)
            for i in range(4):
                k = i / 3
                y = low[1] + (high[1] - low[1]) * k
                z = low[2] + (high[2] - low[2]) * k
                p.tube((low[0], y, z), (low[0], y, z + 2.4), 0.08, RAIL)
    # The slender columns and the thin dark roof, bowing a little along its length.
    span = 14
    def roofline(x):
        return ROOF_Z + 0.7 * (1 - (x / (STAND_HALF + 2)) ** 2)
    for i in range(span):
        a = -STAND_HALF - 2 + i * (2 * STAND_HALF + 4) / span
        b = a + (2 * STAND_HALF + 4) / span
        p.face([(a, -3.5, roofline(a)), (b, -3.5, roofline(b)), (b, back + 1.6, roofline(b) + 0.9), (a, back + 1.6, roofline(a) + 0.9)], ROOF_DARK)
        p.face([(a, -3.5, roofline(a) - 0.45), (b, -3.5, roofline(b) - 0.45), (b, -3.5, roofline(b)), (a, -3.5, roofline(a))], ROOF_DARK)
    for i in range(9):
        x = -STAND_HALF + i * STAND_HALF / 4
        p.tube((x, 0.4, 0.6), (x, 0.4, roofline(x) - 0.3), 0.22, STEEL, 8)
        p.tube((x, back, 0.6), (x, back, roofline(x) + 0.6), 0.22, STEEL, 8)
        p.box((x - 0.16, -3.4, roofline(x) - 0.75), (x + 0.16, back + 1.4, roofline(x) - 0.42), ROOF_DARK)
    # The curved beam at the end, from the back of the roof down over the end of the tiers.
    end = STAND_HALF + 1.6
    last = None
    for i in range(15):
        t = i / 14
        y = -3.0 + (back + 4.0) * t
        z = ROOF_Z - 0.6 + 2.4 * math.sin(t * math.pi * 0.55) - 3.0 * t * t
        if last:
            p.tube((end, last[0], last[1]), (end, y, z), 0.32, TAN, 8)
        last = (y, z)
    # The blue bins at its foot.
    for x in (-STAND_HALF - 3.2, STAND_HALF + 3.0):
        p.box((x - 0.8, -1.0, 0.0), (x + 0.8, 0.6, 2.2), BIN)
    return p


# --- the file ---------------------------------------------------------------------------------------------------

def bake_shade(things):
    """The shade of its own corners and creases, multiplied into each object's colours."""
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.device = 'CPU'
    for thing in things:
        mesh = thing.data
        for poly in mesh.polygons:
            poly.use_smooth = False
        ao = mesh.color_attributes.new('Shade', 'FLOAT_COLOR', 'CORNER')
        mesh.color_attributes.active_color = ao
        bpy.ops.object.select_all(action='DESELECT')
        thing.select_set(True)
        bpy.context.view_layer.objects.active = thing
        scene.render.bake.target = 'VERTEX_COLORS'
        scene.world = scene.world or bpy.data.worlds.new('World')
        bpy.ops.object.bake(type='AO')
        colour = mesh.color_attributes['Color']
        for i in range(len(colour.data)):
            a = ao.data[i].color[0]
            k = 0.45 + 0.55 * a
            r, g, b, _ = colour.data[i].color
            colour.data[i].color = (r * k, g * k, b * k, 1.0)
        mesh.color_attributes.remove(ao)
        mesh.color_attributes.active_color = mesh.color_attributes['Color']
        mesh.color_attributes.render_color_index = 0


def name_on(hall_thing, material, root):
    """The hall's name in white, over the ribbon of windows: an object of its own, which the game keeps white at night."""
    curve = bpy.data.curves.new('olympia-hall-name', 'FONT')
    curve.body = 'Olympia'
    curve.size = 3.3
    curve.extrude = 0.07
    curve.resolution_u = 3
    curve.align_x = 'CENTER'
    try:
        curve.font = bpy.data.fonts.load(os.path.join(root, 'public', 'fonts', 'playpen-sans-700-sv.woff2'))
    except RuntimeError as error:
        print('FONT NOT LOADED', error)
    name = bpy.data.objects.new('olympia-hall-name', curve)
    bpy.context.collection.objects.link(name)
    name.rotation_euler = (math.pi / 2, 0, 0)
    name.location = (0, -0.2, 15.75)
    bpy.ops.object.select_all(action='DESELECT')
    name.select_set(True)
    bpy.context.view_layer.objects.active = name
    bpy.ops.object.convert(target='MESH')
    name = bpy.context.view_layer.objects.active
    mesh = name.data
    colour = mesh.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for item in colour.data:
        item.color = WHITE
    mesh.materials.clear()
    mesh.materials.append(material)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    name.name = 'olympia-hall-name'
    print('NAME FACES', len(mesh.polygons))


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    material = bpy.data.materials.new('olympia')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    principled = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    attribute = nodes.new('ShaderNodeVertexColor')
    attribute.layer_name = 'Color'
    material.node_tree.links.new(attribute.outputs[0], principled.inputs[0])
    principled.inputs['Roughness'].default_value = 0.78
    root = os.path.abspath(os.path.join(os.path.dirname(bpy.data.filepath or __file__), '..', '..'))
    if not os.path.exists(os.path.join(root, 'scripts', 'bake', 'export.py')):
        root = os.getcwd()
    things = [hall().finish('olympia-hall', material), stand().finish('olympia-stand', material)]
    name_on(things[0], material, root)
    bake_shade(things)
    out = os.path.join(root, 'art', 'baked', 'aventyr2', 'olympia.glb')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    source = open(os.path.join(root, 'scripts', 'bake', 'export.py')).read()
    exec(source, {'OUT': out, 'bpy': bpy})
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args:
        preview(things, args[0])


def preview(things, path):
    """A picture to look at, for the one who builds it. Never committed."""
    scene = bpy.context.scene
    world = scene.world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.7, 0.75, 0.82, 1)
    things[1].location.x = 110
    camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
    bpy.context.collection.objects.link(camera)
    camera.location = (50, -210, 34)
    camera.rotation_euler = (math.radians(84), 0, 0)
    camera.data.lens = 34
    scene.camera = camera
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(55), 0, math.radians(30))
    sun.data.energy = 3
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 600
    scene.cycles.samples = 24
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


main()
