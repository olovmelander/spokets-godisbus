"""The small and the many: three butterflies, a dragonfly, a bat, a firefly, the bumblebee and the wood ant
(the creature overhaul, 13 November 2026). Sent to Blender after kit-tools.py; a name in ONLY builds that one alone.

They are modelled here and moved in the game's vertex stage (src/render/lift/fauna/small-kit.ts), because there can be
many at once: a creature is one mesh there, and each instance moves its wings and legs by four numbers. So each moving
part is a thing of its own here, and says on itself (custom properties, which arrive as userData) which creature it is
part of, how it moves (`rig`: body, wing, hind, batwing, leg, feeler, lantern), which side it is on (`side`: +1 the
near side, towards the camera, which is Blender's -Y; -1 the far side), its group in a walk (`group`), where it turns
(`pivot`, and for a bat's hand its wrist, `joint`), which butterfly it belongs to (`species`), and how clear it is
(`alpha`: a glassy wing's membrane; its veins are painted dark, and dark is opaque).

Every creature faces +X, as the game's own code-built ones do, with its middle (or its feet) at the origin; Z is up.
Units are EL. Nothing here comes from anyone else; every shape and colour is made from the numbers below. Keep this
file in plain ASCII.
"""

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

UP = Vector((0.0, 0.0, 1.0))
FWD = Vector((1.0, 0.0, 0.0))
NEAR = Vector((0.0, -1.0, 0.0))


def wanted(name):
    return ONLY is None or ONLY == name


def rigged(made, creature, rig='body', side=0.0, group=0.0, pivot=(0.0, 0.0, 0.0), joint=(0.0, 0.0, 0.0), species=0.0, alpha=1.0):
    """Says on a finished part how the game moves it."""
    made['creature'] = creature
    made['rig'] = rig
    made['side'] = float(side)
    made['group'] = float(group)
    made['pivot'] = [float(pivot[0]), float(pivot[1]), float(pivot[2])]
    made['joint'] = [float(joint[0]), float(joint[1]), float(joint[2])]
    made['species'] = float(species)
    made['alpha'] = float(alpha)
    return made


def loft_x(part, rows, sides, colours, close=True):
    """A body along X from rows of (x, z, half width across Y, half height in Z). colours[i] is row i's colour, or a
    list with one for each point round it. Both ends close."""
    rings = []
    for row in rows:
        ring = []
        for j in range(sides):
            a = TAU * j / sides
            ring.append(Vector((row[0], row[2] * math.cos(a), row[1] + row[3] * math.sin(a))))
        rings.append(ring)
    first = (Vector((rows[0][0] - 0.002, 0.0, rows[0][1])), colours[0] if not isinstance(colours[0], list) else colours[0][0]) if close else None
    last = (Vector((rows[-1][0] + 0.002, 0.0, rows[-1][1])), colours[-1] if not isinstance(colours[-1], list) else colours[-1][0]) if close else None
    return skin(part, rings, colours, first, last)


def rod(part, points, radii, colour, sides=5):
    """A thin round limb along points."""
    tube(part, [Vector(p) for p in points], radii, [colour] * len(points), sides)


def ball(part, centre, size, detail, colour):
    return lump(part, Vector(centre), size, detail, colour)


def resample(points, n):
    """n points evenly along a polyline."""
    lengths = [0.0]
    for i in range(1, len(points)):
        lengths.append(lengths[-1] + (points[i] - points[i - 1]).length)
    total = lengths[-1]
    out = []
    for k in range(n):
        d = total * k / (n - 1)
        i = 1
        while i < len(points) - 1 and lengths[i] < d:
            i += 1
        span = lengths[i] - lengths[i - 1]
        t = 0.0 if span <= 0.0 else (d - lengths[i - 1]) / span
        out.append(points[i - 1].lerp(points[i], max(0.0, min(1.0, t))))
    return out


def side_point(p, s):
    """A point given for the near side (Blender -Y), on side s (+1 near, -1 far)."""
    return (p[0], p[1] * s, p[2])


def sheet_faces(part, grid, top, colours_top, colours_under, thick, up_hint):
    """Two sheets over a grid of points (rows of points), the top one facing `up_hint` and the under one away from it,
    each in its own colours. A wing is seen from both sides, in different colours: an under side is not a back face."""
    rows = len(grid)
    cols = len(grid[0])
    for layer in (0, 1):
        lift = up_hint * (thick * 0.5 if layer == 0 else -thick * 0.5)
        colours = colours_top if layer == 0 else colours_under
        made = []
        for i in range(rows):
            made.append([put(part, grid[i][j] + lift, colours[i][j]) for j in range(cols)])
        for i in range(rows - 1):
            for j in range(cols - 1):
                quad = [made[i][j], made[i][j + 1], made[i + 1][j + 1], made[i + 1][j]]
                n = (quad[1].co - quad[0].co).cross(quad[3].co - quad[0].co)
                if n.length < 1e-12:
                    n = (quad[2].co - quad[1].co).cross(quad[3].co - quad[1].co)
                facing = n.dot(up_hint) > 0.0
                if facing != (layer == 0):
                    quad = quad[::-1]
                face(part, quad)


# --- wings drawn round their root: butterflies, the bee and the firefly ----------------------------------------------
# A wing is given as its edge seen from its root: (angle, reach) rows, the angle in degrees from straight out (0) towards
# forward (+90) or back (-90). Its colours are a table too: a ground, its veins (angles, running out from the root),
# a dark border and a pale fringe, a dark tip, spots, a dusting at the root, and a flush from one colour to another.

def reach_at(edge, a):
    return along(edge, a)


def wing_colour(spec, a, r, at):
    c = spec['ground']
    if 'flush' in spec:
        f = spec['flush']
        c = blend(c, f[2], (r - f[0]) / (f[1] - f[0]))
    if 'root' in spec:
        c = blend(spec['root'][1], c, r / spec['root'][0])
    if 'tip' in spec:
        t = spec['tip']
        # A dark tip: the forewing's apex, round the angle t[0], from r t[1] out, fading over t[2] degrees.
        k = max(0.0, 1.0 - abs(a - t[0]) / t[2]) * max(0.0, min(1.0, (r - t[1]) / 0.12))
        c = blend(c, t[3], k * 1.4)
    for spot in spec.get('spots', []):
        d = (at - spot[0]).length
        c = blend(c, spot[2], 1.0 - (d - spot[1] * 0.55) / (spot[1] * 0.45))
    if 'border' in spec and r > spec['border'][0]:
        c = blend(c, spec['border'][1], (r - spec['border'][0]) / 0.04)
    if 'fringe' in spec and r > spec['fringe'][0]:
        c = blend(c, spec['fringe'][1], (r - spec['fringe'][0]) / 0.02)
    return c


def polar_wing(part, root, out, edge, span_from, span_to, veins, top, under, thick=0.0016, rings=9, step=7.0, camber=0.0, drop=0.0):
    """A wing round its root, on the side `out` points to, from angle span_from to span_to. `top` and `under` are its
    two sides' colour tables; a vein is drawn where the angle is one of `veins`."""
    fwd = FWD
    angles = []
    a = span_from
    while a < span_to - 0.01:
        angles.append(a)
        a += step
    angles.append(span_to)
    # Each vein has a row of points of its own; seen as small as the game sees them, that is line enough.
    angles += list(veins)
    angles = sorted(set([round(x, 3) for x in angles if span_from <= x <= span_to]))
    radii = [0.04] + [0.04 + 0.96 * (k / (rings - 1)) ** 0.85 for k in range(1, rings)]
    grid = []
    tops = []
    unders = []
    for a in angles:
        rad = math.radians(a)
        reach = reach_at(edge, a)
        direction = out * math.cos(rad) + fwd * math.sin(rad)
        row = []
        trow = []
        urow = []
        vein = min([abs(a - v) for v in veins]) < 0.01 if veins else False
        for r in radii:
            # A little cupped, and (a hind wing) a little under the fore one where they overlap.
            at = root + direction * (reach * r) + UP * (camber * reach * math.sin(math.pi * r) * 0.5 - drop * min(1.0, r * 3.0))
            row.append(at)
            # Where on the wing, as on the near one: spots are given there, and the far wing is its mirror.
            local = Vector((reach * r * math.sin(rad), -reach * r * math.cos(rad), 0.0))
            ct = wing_colour(top, a, r, local)
            cu = wing_colour(under, a, r, local)
            if vein:
                ct = blend(ct, top['vein'], top.get('vein_k', 0.6) * (1.0 - 0.5 * r))
                cu = blend(cu, under['vein'], under.get('vein_k', 0.6) * (1.0 - 0.5 * r))
            trow.append(ct)
            urow.append(cu)
        grid.append(row)
        tops.append(trow)
        unders.append(urow)
    sheet_faces(part, grid, True, tops, unders, thick, UP)
    # The root: each sheet's first ring fanned to the root, so that no hole is left at the hinge.
    for layer in (1.0, -1.0):
        hub = put(part, root + UP * (thick * 0.5 * layer), top['root'][1] if 'root' in top else top['ground'])
        for i in range(len(grid) - 1):
            p = put(part, grid[i][0] + UP * (thick * 0.5 * layer), tops[i][0])
            q = put(part, grid[i + 1][0] + UP * (thick * 0.5 * layer), tops[i + 1][0])
            tri = [hub, p, q]
            n = (p.co - hub.co).cross(q.co - hub.co)
            if (n.dot(UP) > 0.0) != (layer > 0.0):
                tri = tri[::-1]
            face(part, tri)


def finish_wing(part, name):
    """A wing keeps its colours as they are painted: no shade is baked into a sheet that thin."""
    return finish(part, name, sharp=180.0, strength=0.0, reach=0.05, floor=None, recalc=False, leaf=True)


# --- butterflies ---------------------------------------------------------------------------------------------------------
# Three of Sweden's own, each with its own wings, all in one mesh: the game shows each instance's own (`species`).
# They are 0.4 across with their wings spread; the body lies along X with its middle at the origin, and the wings'
# roots on its sides a little over its middle, where they turn.

BUTTERFLIES = {
    # Citronfjaril, the brimstone: pale sulphur over, greener under, leaf-shaped with a hooked tip, one small dot.
    'citron': {
        'species': 1,
        'body': tone('#3a3a2a'), 'hair': tone('#9a9a62'),
        'fore': [(-70.0, 0.05), (-62.0, 0.09), (-50.0, 0.13), (-35.0, 0.152), (-20.0, 0.165), (-8.0, 0.185), (2.0, 0.208), (8.0, 0.2), (15.0, 0.15), (22.0, 0.06)],
        'hind': [(-105.0, 0.05), (-95.0, 0.1), (-80.0, 0.138), (-62.0, 0.152), (-48.0, 0.162), (-40.0, 0.152), (-25.0, 0.135), (-10.0, 0.12), (5.0, 0.1)],
        'fore_top': {'ground': tone('#e6e08a'), 'vein': tone('#b8b46a'), 'vein_k': 0.35, 'root': (0.25, tone('#c8c486')),
                     'spots': [(Vector((-0.015, -0.084, 0.0)), 0.016, tone('#c49a50'))]},
        'fore_under': {'ground': tone('#d4dc9a'), 'vein': tone('#98a464'), 'vein_k': 0.6, 'root': (0.3, tone('#b8c48a')),
                       'spots': [(Vector((-0.015, -0.084, 0.0)), 0.01, tone('#9a7a52'))]},
        'hind_top': {'ground': tone('#e2dc8a'), 'vein': tone('#b4b06a'), 'vein_k': 0.35, 'root': (0.3, tone('#c4c088')),
                     'spots': [(Vector((-0.044, -0.05, 0.0)), 0.014, tone('#c49a50'))]},
        'hind_under': {'ground': tone('#ccd896'), 'vein': tone('#90a060'), 'vein_k': 0.65, 'root': (0.3, tone('#b0c088')),
                       'spots': [(Vector((-0.044, -0.05, 0.0)), 0.01, tone('#9a7a52'))]},
    },
    # Skogsvitvinge, the wood white: small, slender, round wings, white with a grey tip, under a misty grey-green.
    'vitvinge': {
        'species': 2,
        'body': tone('#3c3c38'), 'hair': tone('#8c8c84'),
        'fore': [(-70.0, 0.045), (-60.0, 0.08), (-48.0, 0.11), (-32.0, 0.13), (-15.0, 0.148), (-2.0, 0.158), (8.0, 0.15), (15.0, 0.12), (22.0, 0.05)],
        'hind': [(-105.0, 0.045), (-92.0, 0.085), (-75.0, 0.115), (-55.0, 0.128), (-35.0, 0.126), (-15.0, 0.112), (5.0, 0.092)],
        'fore_top': {'ground': tone('#f2f0e8'), 'vein': tone('#c8c6bc'), 'vein_k': 0.4, 'root': (0.2, tone('#cfccc2')),
                     'tip': (2.0, 0.66, 20.0, tone('#7c7c78'))},
        'fore_under': {'ground': tone('#e8eae0'), 'vein': tone('#b4b8a8'), 'vein_k': 0.5, 'root': (0.25, tone('#c4c8b8'))},
        'hind_top': {'ground': tone('#f0eee6'), 'vein': tone('#cac8be'), 'vein_k': 0.35, 'root': (0.25, tone('#cfccc2'))},
        'hind_under': {'ground': tone('#dce2d0'), 'vein': tone('#a8b098'), 'vein_k': 0.5, 'root': (0.3, tone('#b8c0a8')),
                       'spots': [(Vector((-0.04, -0.06, 0.0)), 0.03, tone('#bcc4ae')), (Vector((-0.075, -0.035, 0.0)), 0.025, tone('#bcc4ae'))]},
    },
    # Puktorneblavinge, a blue: violet-blue over with a dark rim and a white fringe; grey-brown under with black dots in
    # white rings and a row of dull ochre moons at the edge.
    'blavinge': {
        'species': 3,
        'body': tone('#2e2e36'), 'hair': tone('#7c88a8'),
        'fore': [(-70.0, 0.045), (-60.0, 0.085), (-48.0, 0.115), (-32.0, 0.13), (-15.0, 0.142), (-2.0, 0.152), (8.0, 0.145), (15.0, 0.115), (22.0, 0.05)],
        'hind': [(-105.0, 0.045), (-92.0, 0.085), (-75.0, 0.112), (-55.0, 0.122), (-35.0, 0.12), (-15.0, 0.105), (5.0, 0.088)],
        'fore_top': {'ground': tone('#8ea2d8'), 'vein': tone('#6a7cb0'), 'vein_k': 0.3, 'root': (0.35, tone('#6e7eb4')),
                     'border': (0.86, tone('#3a3a44')), 'fringe': (0.95, tone('#eceae4'))},
        'fore_under': {'ground': tone('#b4ada0'), 'vein': tone('#9c9488'), 'vein_k': 0.3, 'root': (0.3, tone('#8c9aa8')),
                       'fringe': (0.95, tone('#e6e2da')),
                       'spots': [(Vector((0.0, -0.09, 0.0)), 0.015, tone('#f0ece4')), (Vector((0.0, -0.09, 0.0)), 0.008, tone('#26221e')),
                                 (Vector((-0.031, -0.085, 0.0)), 0.014, tone('#f0ece4')), (Vector((-0.031, -0.085, 0.0)), 0.0075, tone('#26221e')),
                                 (Vector((-0.058, -0.069, 0.0)), 0.013, tone('#f0ece4')), (Vector((-0.058, -0.069, 0.0)), 0.007, tone('#26221e'))]},
        'hind_top': {'ground': tone('#8a9ed4'), 'vein': tone('#6a7cb0'), 'vein_k': 0.3, 'root': (0.35, tone('#6e7eb4')),
                     'border': (0.86, tone('#3a3a44')), 'fringe': (0.94, tone('#eceae4'))},
        'hind_under': {'ground': tone('#b0a99c'), 'vein': tone('#989084'), 'vein_k': 0.3, 'root': (0.35, tone('#8898a8')),
                       'fringe': (0.94, tone('#e6e2da')),
                       'spots': [(Vector((-0.056, -0.02, 0.0)), 0.012, tone('#f0ece4')), (Vector((-0.056, -0.02, 0.0)), 0.0065, tone('#26221e')),
                                 (Vector((-0.042, -0.042, 0.0)), 0.012, tone('#f0ece4')), (Vector((-0.042, -0.042, 0.0)), 0.0065, tone('#26221e')),
                                 (Vector((-0.02, -0.056, 0.0)), 0.012, tone('#f0ece4')), (Vector((-0.02, -0.056, 0.0)), 0.0065, tone('#26221e')),
                                 (Vector((-0.097, -0.026, 0.0)), 0.013, tone('#c8a676')), (Vector((-0.082, -0.057, 0.0)), 0.013, tone('#c8a676')),
                                 (Vector((-0.057, -0.082, 0.0)), 0.013, tone('#c8a676')), (Vector((-0.026, -0.097, 0.0)), 0.013, tone('#c8a676'))]},
    },
}
# Where the wings' veins run, out from the root, in the angles of each wing.
FORE_VEINS = [-58.0, -44.0, -30.0, -16.0, -3.0, 10.0]
HIND_VEINS = [-92.0, -77.0, -62.0, -46.0, -30.0, -14.0]
# The wings' root, on the near side: a little forward of the middle, on the top of the thorax.
FORE_ROOT = (0.012, -0.011, 0.008)
HIND_ROOT = (-0.004, -0.011, 0.006)


def butterfly(key):
    b = BUTTERFLIES[key]
    name = 'fjaril-' + key
    sp = b['species']
    part = new_part()
    body = b['body']
    hair = b['hair']
    # Thorax, furred; the abdomen behind it, slimmer, in rings; the head with its two round eyes.
    rows = [(-0.085, -0.002, 0.004, 0.004), (-0.075, -0.001, 0.008, 0.008), (-0.05, 0.0, 0.0105, 0.0105), (-0.025, 0.0, 0.011, 0.011),
            (-0.008, 0.0, 0.011, 0.011), (0.0, 0.001, 0.014, 0.014), (0.016, 0.002, 0.0165, 0.016), (0.03, 0.002, 0.014, 0.014),
            (0.04, 0.002, 0.009, 0.009)]
    colours = []
    for i in range(len(rows)):
        colours.append(hair if i >= 5 else (lit(body, 1.25) if i % 2 else body))
    loft_x(part, rows, 8, colours)
    ball(part, (0.048, 0.0, 0.004), (0.011, 0.012, 0.011), 1, body)
    for s in (-1.0, 1.0):
        ball(part, (0.052, -0.009 * s, 0.006), (0.0065, 0.0065, 0.0075), 1, tone('#2a2a24'))
        # Antennae: long and thin, each with a club at its tip.
        tip = (0.15, -0.045 * s, 0.07)
        rod(part, [(0.054, -0.004 * s, 0.012), (0.1, -0.025 * s, 0.045), tip], [0.0016, 0.0014, 0.0014], tone('#2c2a26'), 4)
        ball(part, (tip[0] + 0.004, tip[1], tip[2] + 0.002), (0.006, 0.0035, 0.0035), 1, tone('#d8d4c4') if key == 'vitvinge' else tone('#2c2a26'))
        # Six thin legs, folded down under the thorax to stand on a flower.
        for k, x in enumerate((0.022, 0.008, -0.006)):
            rod(part, [(x, -0.006 * s, -0.006), (x + 0.008 - k * 0.006, -0.02 * s, -0.016), (x + 0.014 - k * 0.012, -0.022 * s, -0.03)],
                [0.0017, 0.0014, 0.0011], tone('#34322c'), 4)
    rigged(finish(part, name, sharp=60.0, strength=0.3, reach=0.03), 'butterfly', species=sp)
    for s in (1.0, -1.0):
        out = NEAR * s
        tag = 'n' if s > 0 else 'f'
        root = Vector(side_point(FORE_ROOT, s))
        part = new_part()
        polar_wing(part, root, out, b['fore'], -70.0, 22.0, FORE_VEINS, b['fore_top'], b['fore_under'], camber=0.06)
        rigged(finish_wing(part, name + '-fram-' + tag), 'butterfly', 'wing', s, 0.0, root, species=sp)
        root = Vector(side_point(HIND_ROOT, s))
        part = new_part()
        polar_wing(part, root, out, b['hind'], -105.0, 5.0, HIND_VEINS, b['hind_top'], b['hind_under'], camber=0.05, drop=0.004)
        rigged(finish_wing(part, name + '-bak-' + tag), 'butterfly', 'hind', s, 0.0, root, species=sp)


for key in ('citron', 'vitvinge', 'blavinge'):
    if wanted('fjaril') or wanted('fjaril-' + key):
        butterfly(key)


# --- the dragonfly -------------------------------------------------------------------------------------------------------
# A hawker of the bog and the forest pool, half an EL long: big blue-green eyes that meet on its head, a stout striped
# thorax, a long thin abdomen in ten rings with pale spots, and four long glassy wings, each with its dark
# pterostigma near the tip. Its middle, where the wings join, is at the origin.

DRAGON_EYE = tone('#4c8c8e')
DRAGON_DARK = tone('#24302e')
DRAGON_STRIPE = tone('#8cb48a')
DRAGON_SPOT = tone('#6ab0b4')
MEMBRANE = tone('#e4eef0')
VEIN = tone('#2c3434')
STIGMA = tone('#4a3a2a')


def strip_wing(part, root, out, long, chords, top_tint, sweep=0.0, lean=0.0):
    """A long narrow wing out from its root: `chords` gives its width at each share of its length. Veins run along it
    (the leading edge heaviest) and across it every so often; its pterostigma sits near the tip on the leading edge."""
    spans = [0.0, 0.06]
    s = 0.14
    while s < 0.8:
        spans.append(s)
        s += 0.11
    spans += [0.84, 0.92, 0.97, 1.0]
    spans = sorted(set([round(v, 3) for v in spans]))
    across = [0.0, 0.12, 0.3, 0.55, 0.8, 1.0]
    lines = [0.0, 0.3, 0.55]
    cross = [round(0.14 + 0.11 * k, 3) for k in range(7)]
    grid = []
    tops = []
    for sp in spans:
        width = along(chords, sp)
        # Out, leaning forward (a fore wing) or back (a hind one) by `lean` degrees, its leading edge bowed by `sweep`.
        way = out * math.cos(math.radians(lean)) + FWD * math.sin(math.radians(lean))
        lead = root + way * (long * sp) + FWD * (sweep * long * sp * sp)
        row = []
        trow = []
        for c in across:
            # Its tip rounds off: the trailing edge comes up to the leading one.
            tipcut = 1.0 if sp < 0.86 else max(0.12, math.sqrt(max(0.0, 1.0 - ((sp - 0.86) / 0.14) ** 2)))
            at = lead - FWD * (width * c * tipcut)
            row.append(at)
            colour = blend(top_tint, MEMBRANE, sp * 0.8 + 0.2)
            vein = (c in lines) or (sp in cross and c < 0.95) or sp >= 0.999 or c >= 0.999
            if vein:
                colour = VEIN if c == 0.0 else blend(colour, VEIN, 0.75)
            if 0.84 <= sp <= 0.92 and c <= 0.12:
                colour = STIGMA
            trow.append(colour)
        grid.append(row)
        tops.append(trow)
    sheet_faces(part, grid, True, tops, tops, 0.0014, UP)


if wanted('trollslanda'):
    name = 'trollslanda'
    part = new_part()
    # The thorax: stout, dark with two pale green stripes down each side.
    rows = [(-0.04, 0.0, 0.016, 0.018), (-0.025, 0.002, 0.024, 0.026), (-0.005, 0.004, 0.027, 0.03), (0.015, 0.004, 0.026, 0.028),
            (0.032, 0.003, 0.02, 0.022), (0.042, 0.002, 0.012, 0.012)]
    ring = [[DRAGON_STRIPE if (j in (2, 3, 7, 8)) else DRAGON_DARK for j in range(12)] for _ in rows]
    loft_x(part, rows, 12, ring)
    # The head: two great eyes meeting on top, and a pale face below them.
    for s in (-1.0, 1.0):
        ball(part, (0.058, -0.017 * s, 0.01), (0.02, 0.02, 0.021), 2, DRAGON_EYE)
    ball(part, (0.066, 0.0, -0.006), (0.013, 0.016, 0.012), 1, tone('#b4bc8c'))
    ball(part, (0.05, 0.0, 0.0), (0.012, 0.016, 0.016), 1, DRAGON_DARK)
    # The abdomen: long and thin, in ten rings, each with a pale spot on its back and a dark joint between.
    rows = []
    cols = []
    for k in range(31):
        t = k / 30.0
        x = -0.04 - t * 0.29
        r = 0.011 * (1.0 - 0.45 * t) if t > 0.08 else 0.016 - t * 0.05
        if t > 0.9:
            r *= 1.15
        rows.append((x, 0.006 - 0.012 * t * t, r, r * 1.05))
        seg = (t * 10.0) % 1.0
        row = []
        for j in range(8):
            top_side = math.sin(TAU * j / 8) > 0.3
            c = DRAGON_DARK
            if top_side and 0.25 < seg < 0.65 and t < 0.95:
                c = DRAGON_SPOT
            if seg < 0.08:
                c = lit(DRAGON_DARK, 0.7)
            row.append(c)
        cols.append(row)
    loft_x(part, rows, 8, cols)
    # The claspers at its tail.
    for s in (-1.0, 1.0):
        rod(part, [(-0.33, -0.003 * s, 0.0), (-0.36, -0.006 * s, 0.001)], [0.002, 0.001], DRAGON_DARK, 4)
    # Six legs, folded up under it, spiny.
    for s in (-1.0, 1.0):
        for k, x in enumerate((0.03, 0.015, 0.0)):
            rod(part, [(x, -0.012 * s, -0.018), (x + 0.012 - k * 0.006, -0.026 * s, -0.03), (x + 0.02 - k * 0.012, -0.022 * s, -0.045)],
                [0.0024, 0.0019, 0.0014], DRAGON_DARK, 4)
    rigged(finish(part, name, sharp=60.0, strength=0.35, reach=0.04), 'dragonfly')
    # Four wings: the fore pair slender, the hind pair broader at the base. Each turns about its root on the thorax.
    FORE_CHORD = [(0.0, 0.014), (0.08, 0.026), (0.4, 0.042), (0.8, 0.04), (1.0, 0.032)]
    HIND_CHORD = [(0.0, 0.03), (0.08, 0.062), (0.25, 0.06), (0.6, 0.047), (1.0, 0.032)]
    for s in (1.0, -1.0):
        out = NEAR * s
        tag = 'n' if s > 0 else 'f'
        root = Vector((0.018, -0.012 * s, 0.022))
        part = new_part()
        strip_wing(part, root, out, 0.3, FORE_CHORD, tone('#c8b890'), sweep=0.02, lean=9.0)
        rigged(finish_wing(part, name + '-fram-' + tag), 'dragonfly', 'wing', s, 0.0, root, alpha=0.24)
        root = Vector((-0.012, -0.013 * s, 0.02))
        part = new_part()
        strip_wing(part, root, out, 0.29, HIND_CHORD, tone('#c8b890'), sweep=0.0, lean=-7.0)
        rigged(finish_wing(part, name + '-bak-' + tag), 'dragonfly', 'hind', s, 0.0, root, alpha=0.24)


# --- the bat -------------------------------------------------------------------------------------------------------------
# A northern bat at dusk, 1 EL across with its wings spread: a furred brown body, a dark face with big rounded ears, and
# wings of thin skin stretched between the long bones of its fingers, scalloped between them. Each wing is one part that
# turns at the shoulder; the hand beyond the wrist (`joint`) folds as it beats up. Its middle is at the origin.

BAT_FUR = tone('#5a4636')
BAT_BELLY = tone('#7a6450')
BAT_SKIN = tone('#2e2622')
BAT_BONE = tone('#4a3c34')
# The bones of the near wing, laid flat: shoulder, elbow, wrist, and the tips of its fingers (the second to the fifth),
# and the ankle, where the skin ends at the leg.
SHOULDER = Vector((0.02, -0.03, 0.01))
ELBOW = Vector((0.07, -0.13, 0.012))
WRIST = Vector((0.03, -0.24, 0.012))
TIPS = [Vector((0.075, -0.43, 0.012)), Vector((0.02, -0.5, 0.01)), Vector((-0.085, -0.4, 0.01)), Vector((-0.115, -0.27, 0.01))]
ANKLE = Vector((-0.1, -0.045, 0.0))


def bend(a, b, k, out_by):
    """A point k along a finger from a to b, bowed a little towards the trailing side."""
    p = a.lerp(b, k)
    d = (b - a)
    n = Vector((d.y, -d.x, 0.0))
    if n.length > 0.0:
        n.normalize()
    return p + n * (out_by * math.sin(math.pi * k))


def membrane(part, edge_a, edge_b, scallop, rows, cols, colour, colour_b, thick=0.002):
    """Skin between two bones, given as lists of points from the joint out; its free edge between their ends curves in."""
    grid = []
    tints = []
    n = len(edge_a)
    for i in range(n):
        row = []
        trow = []
        for j in range(cols):
            v = j / (cols - 1)
            p = edge_a[i].lerp(edge_b[i], v)
            k = i / (n - 1)
            # The scallop: the free edge, and the skin near it, drawn in towards the joint.
            inward = (edge_a[0].lerp(edge_b[0], v) - p)
            if inward.length > 0.0:
                inward.normalize()
            p = p + inward * (scallop * math.sin(math.pi * v) * k ** 2)
            p.z += -0.006 * math.sin(math.pi * v) * math.sin(math.pi * k)
            row.append(p)
            trow.append(blend(colour, colour_b, 0.5 + 0.5 * math.sin(math.pi * v) * k))
        grid.append(row)
        tints.append(trow)
    sheet_faces(part, grid, True, tints, [[lit(c, 0.85) for c in r] for r in tints], thick, UP)


def finger(a, b, n, out_by=0.01):
    return [bend(a, b, k / (n - 1), out_by) for k in range(n)]


if wanted('fladdermus'):
    name = 'fladdermus'
    part = new_part()
    # The body: short, round and furred, the belly paler.
    rows = [(-0.11, -0.004, 0.012, 0.01), (-0.09, -0.002, 0.026, 0.022), (-0.06, 0.0, 0.036, 0.03), (-0.025, 0.0, 0.04, 0.034),
            (0.01, 0.002, 0.039, 0.034), (0.04, 0.004, 0.032, 0.03), (0.06, 0.006, 0.024, 0.024)]
    cols = [[BAT_BELLY if math.sin(TAU * j / 12) < -0.3 else BAT_FUR for j in range(12)] for _ in rows]
    loft_x(part, rows, 12, cols)
    # The head: a round crown, a short dark snout, small eyes, and two big rounded ears that stand up and out.
    ball(part, (0.085, 0.0, 0.012), (0.028, 0.03, 0.026), 2, BAT_FUR)
    ball(part, (0.112, 0.0, 0.002), (0.016, 0.017, 0.013), 1, tone('#3a2c26'))
    ball(part, (0.126, 0.0, 0.004), (0.005, 0.009, 0.005), 1, tone('#1c1614'))
    for s in (-1.0, 1.0):
        ball(part, (0.105, -0.015 * s, 0.017), (0.0045, 0.0045, 0.0045), 1, tone('#0c0a0a'))
        # The ear: a cupped leaf of skin, its open side forward.
        ear = []
        base = Vector((0.085, -0.016 * s, 0.03))
        for k in range(6):
            t = k / 5.0
            w = 0.017 * math.sin(math.pi * (0.15 + 0.85 * t)) + 0.004
            centre = base + Vector((0.006 * t, -0.012 * s * t, 0.048 * t))
            ear.append([centre + Vector((-w * 0.2, 0.0, 0.0)) + Vector((0.0, -w * 0.7 * s, 0.0)),
                        centre + Vector((-w, 0.0, 0.0)),
                        centre + Vector((-w * 0.2, 0.0, 0.0)) + Vector((0.0, w * 0.7 * s, 0.0)),
                        centre + Vector((w * 0.25, 0.0, 0.0))])
        skin(part, ear, [[BAT_SKIN, BAT_SKIN, BAT_SKIN, tone('#5a4038')] for _ in ear], None, (base + Vector((0.006, -0.012 * s, 0.05)), BAT_SKIN))
        # The hind legs, out behind it, with the tail skin between them and the tail.
        knee = Vector((-0.1, -0.035 * s, -0.004))
        foot = Vector((-0.13, -0.05 * s, -0.004))
        rod(part, [(-0.07, -0.025 * s, -0.004), (knee.x, knee.y, knee.z), (foot.x, foot.y, foot.z)], [0.0045, 0.0035, 0.003], BAT_SKIN, 5)
    tail = [Vector((-0.1, 0.0, -0.004)), Vector((-0.14, 0.0, -0.004)), Vector((-0.17, 0.0, -0.002))]
    rod(part, [tuple(p) for p in tail], [0.003, 0.0025, 0.0015], BAT_SKIN, 4)
    for s in (-1.0, 1.0):
        edge_a = [Vector((-0.08, -0.02 * s, -0.003)), Vector((-0.11, -0.035 * s, -0.004)), Vector((-0.13, -0.05 * s, -0.004))]
        edge_b = [Vector((-0.08, 0.0, -0.003)), Vector((-0.13, 0.0, -0.004)), Vector((-0.17, 0.0, -0.002))]
        membrane(part, edge_a, edge_b, 0.01, 3, 4, BAT_SKIN, lit(BAT_SKIN, 1.2))
    rigged(finish(part, name, sharp=70.0, strength=0.3, reach=0.05), 'bat')
    # The wings.
    for s in (1.0, -1.0):
        tag = 'n' if s > 0 else 'f'
        part = new_part()
        sh = Vector(side_point(SHOULDER, s))
        el = Vector(side_point(ELBOW, s))
        wr = Vector(side_point(WRIST, s))
        tips = [Vector(side_point(t, s)) for t in TIPS]
        an = Vector(side_point(ANKLE, s))
        # Bones: the arm, and the four long fingers out from the wrist, and a little thumb with its claw.
        rod(part, [tuple(sh), tuple(el), tuple(wr)], [0.008, 0.006, 0.0055], BAT_BONE, 5)
        for tip in tips:
            rod(part, [tuple(p) for p in finger(wr, tip, 5, 0.008 * s)], [0.0035, 0.003, 0.0025, 0.002, 0.0015], BAT_BONE, 4)
        rod(part, [tuple(wr), tuple(wr + Vector((0.025, -0.006 * s, 0.006)))], [0.003, 0.0018], BAT_BONE, 4)
        # The skin: before the arm, between each pair of fingers, and from the last finger back to the ankle.
        front = [sh.lerp(wr, k / 4.0) for k in range(5)]
        lead = [sh.lerp(wr, k / 4.0) + Vector((0.035 * math.sin(math.pi * k / 4.0) + 0.012, 0.0, 0.0)) for k in range(5)]
        membrane(part, front, lead, 0.0, 5, 3, BAT_SKIN, lit(BAT_SKIN, 1.15))
        for k in range(3):
            membrane(part, finger(wr, tips[k], 6, 0.008 * s), finger(wr, tips[k + 1], 6, 0.008 * s), 0.035 + 0.01 * k, 6, 5, BAT_SKIN, lit(BAT_SKIN, 1.3))
        # The arm's skin: from the arm and the last finger to the body's side, down to the ankle; its free edge, from the
        # last finger's tip to the ankle, curves in.
        arm = resample([sh, el, wr] + finger(wr, tips[3], 5, 0.008 * s)[1:], 9)
        side = [sh.lerp(an, k / 8.0) for k in range(9)]
        membrane(part, arm, side, 0.03, 9, 5, BAT_SKIN, lit(BAT_SKIN, 1.25))
        rigged(finish_wing(part, name + '-vinge-' + tag), 'bat', 'batwing', s, 0.0, sh, joint=wr)


# --- the firefly ---------------------------------------------------------------------------------------------------------
# A glow-worm beetle, 0.1 long: a pale shield over its head with a dark mark, brown wing cases held up as it flies, two
# thin wings beating under them, and the lamp at the end of its body. The game lights the lamp as its glow comes and goes.

if wanted('lysmask'):
    name = 'lysmask'
    part = new_part()
    rows = [(-0.05, -0.004, 0.006, 0.005), (-0.04, -0.004, 0.012, 0.009), (-0.02, -0.003, 0.016, 0.011), (0.0, -0.002, 0.017, 0.011),
            (0.02, -0.001, 0.016, 0.011), (0.03, 0.0, 0.012, 0.009)]
    loft_x(part, rows, 8, [tone('#3a3026')] * len(rows))
    # The shield: pale, with a dark mark in its middle, over the small head.
    ball(part, (0.037, 0.0, 0.006), (0.014, 0.016, 0.005), 2, tone('#c2b48e'))
    ball(part, (0.04, 0.0, 0.01), (0.006, 0.005, 0.002), 1, tone('#4a3a2a'))
    ball(part, (0.045, 0.0, -0.002), (0.006, 0.008, 0.005), 1, tone('#2a221c'))
    # The wing cases, lifted up and out as it flies, and the thin wings under them.
    for s in (-1.0, 1.0):
        ball(part, (-0.008, -0.01 * s, 0.01), (0.036, 0.011, 0.0045), 2, tone('#5a4834'))
        # Six short legs.
        for k, x in enumerate((0.02, 0.005, -0.01)):
            rod(part, [(x, -0.01 * s, -0.008), (x + 0.004, -0.02 * s, -0.014), (x + 0.006, -0.024 * s, -0.02)], [0.0015, 0.0012, 0.001], tone('#2a221c'), 3)
        # Its feelers.
        rod(part, [(0.048, -0.004 * s, 0.002), (0.065, -0.012 * s, 0.01), (0.078, -0.02 * s, 0.012)], [0.0012, 0.001, 0.0008], tone('#2a221c'), 3)
    rigged(finish(part, name, sharp=60.0, strength=0.25, reach=0.02), 'firefly')
    # The lamp: the last rings of its body, pale yellow-green under; the game makes it glow.
    part = new_part()
    loft_x(part, [(-0.052, -0.006, 0.005, 0.004), (-0.046, -0.007, 0.01, 0.007), (-0.034, -0.007, 0.012, 0.008), (-0.026, -0.007, 0.01, 0.007)], 8,
           [tone('#e4ecaa')] * 4)
    rigged(finish(part, name + '-lampa', sharp=180.0, strength=0.0, reach=0.02), 'firefly', 'lantern')
    for s in (1.0, -1.0):
        tag = 'n' if s > 0 else 'f'
        root = Vector((0.012, -0.006 * s, 0.012))
        part = new_part()
        polar_wing(part, root, NEAR * s, [(-60.0, 0.05), (-35.0, 0.062), (-15.0, 0.066), (5.0, 0.055), (20.0, 0.03)], -60.0, 20.0, [-40.0, -20.0],
                   {'ground': tone('#c8ccc4'), 'vein': tone('#5a5a50'), 'vein_k': 0.5}, {'ground': tone('#c8ccc4'), 'vein': tone('#5a5a50'), 'vein_k': 0.5},
                   rings=6, step=10.0)
        rigged(finish_wing(part, name + '-vinge-' + tag), 'firefly', 'wing', s, 0.0, root, alpha=0.35)


# --- the bumblebee -------------------------------------------------------------------------------------------------------
# A buff-tailed bumblebee, 0.22 long, all fuzz: a black head, a yellow collar on a black thorax, a yellow band, a black
# one and a white tail; dark legs, the hind ones with their pollen baskets, and four small smoky wings that lie back
# over it as it sits. Its feet are at the origin, so that it stands on a dandelion's head where it is put.

BEE_BLACK = tone('#1e1a16')
BEE_YELLOW = tone('#b49a4a')
BEE_WHITE = tone('#e2ddcc')


def fuzzy(part, centre, size, colour_at, seed, spikes=0.006, hair=0.0065):
    """A round furred lump: its points pushed out a little by noise, so that its edge is ragged as fur is, and each in
    its colour band (`colour_at` is a table of (x, colour) rows along X, read straight between)."""
    made = lump(part, Vector(centre), size, 3, BEE_BLACK)
    for vert in made:
        p = vert.co
        n = (p - Vector(centre))
        if n.length > 0.0:
            n.normalize()
        k = noise(p.x * 160.0 + seed, p.y * 160.0, p.z * 160.0)
        vert.co = p + n * (spikes * (k - 0.35))
        c = colour_at[0][1]
        for i in range(1, len(colour_at)):
            if p.x <= colour_at[i][0]:
                a = colour_at[i - 1]
                b = colour_at[i]
                t = (p.x - a[0]) / (b[0] - a[0])
                c = blend(a[1], b[1], (t - 0.5) * 6.0 + 0.5)
                break
            c = colour_at[i][1]
        part['paint'][vert] = lit(c, 0.85 + 0.3 * noise(p.x * 300.0, p.y * 300.0 + seed, p.z * 300.0))
    # Hairs: a short thin spike out of every other point, in its point's colour, a little paler at its tip.
    for i in range(len(made)):
        vert = made[i]
        n = vert.co - Vector(centre)
        if n.length <= 0.0:
            continue
        n.normalize()
        long = hair * (0.7 + 0.6 * rnd(i, seed))
        tip_at = vert.co + n * long + Vector((-0.6 * long, 0.0, 0.0))
        side = n.cross(UP)
        if side.length < 0.01:
            side = n.cross(FWD)
        side.normalize()
        other = n.cross(side)
        c = part['paint'][vert]
        a = put(part, vert.co - n * 0.001 + side * 0.0012, c)
        b = put(part, vert.co - n * 0.001 - side * 0.0006 + other * 0.001, c)
        d = put(part, vert.co - n * 0.001 - side * 0.0006 - other * 0.001, c)
        t = put(part, tip_at, lit(c, 1.08))
        face(part, (a, b, t))
        face(part, (b, d, t))
        face(part, (d, a, t))
    return made


if wanted('humla'):
    name = 'humla'
    part = new_part()
    # The abdomen: big and round, banded: yellow, black, white.
    fuzzy(part, (-0.045, 0.0, 0.07), (0.068, 0.058, 0.052), [(-0.12, BEE_WHITE), (-0.07, BEE_WHITE), (-0.06, BEE_BLACK), (-0.03, BEE_BLACK),
                                                             (-0.02, BEE_YELLOW), (0.0, BEE_YELLOW), (0.01, BEE_BLACK), (0.1, BEE_BLACK)], 1.0)
    # The thorax: black with its yellow collar at the front.
    fuzzy(part, (0.035, 0.0, 0.078), (0.042, 0.044, 0.042), [(0.0, BEE_BLACK), (0.045, BEE_BLACK), (0.058, BEE_YELLOW), (0.1, BEE_YELLOW)], 2.0)
    # The head, black, with its eyes, and its feelers bent at the elbow.
    fuzzy(part, (0.085, 0.0, 0.07), (0.022, 0.028, 0.026), [(0.0, BEE_BLACK), (0.2, BEE_BLACK)], 3.0, 0.003, 0.004)
    for s in (-1.0, 1.0):
        ball(part, (0.094, -0.016 * s, 0.076), (0.01, 0.006, 0.014), 1, tone('#100e0c'))
        rod(part, [(0.1, -0.006 * s, 0.088), (0.118, -0.012 * s, 0.11), (0.14, -0.02 * s, 0.104)], [0.0022, 0.002, 0.0018], BEE_BLACK, 4)
        # Legs: dark and hairy, standing; the hind pair carry their baskets of pollen.
        for k, (x, reach) in enumerate(((0.05, 0.02), (0.03, 0.0), (0.005, -0.03))):
            hip = (x, -0.022 * s, 0.05)
            knee = (x + reach * 0.5, -0.052 * s, 0.036)
            foot = (x + reach, -0.05 * s, 0.003)
            rod(part, [hip, knee, foot], [0.006, 0.005, 0.0035], BEE_BLACK, 5)
            if k == 2:
                ball(part, (knee[0] + reach * 0.25, knee[1], 0.022), (0.011, 0.006, 0.009), 1, tone('#a88e4c'))
    rigged(finish(part, name, sharp=60.0, strength=0.35, reach=0.04, floor=0.0), 'bee')
    for s in (1.0, -1.0):
        tag = 'n' if s > 0 else 'f'
        root = Vector((0.04, -0.024 * s, 0.106))
        part = new_part()
        polar_wing(part, root, NEAR * s, [(-70.0, 0.06), (-40.0, 0.095), (-15.0, 0.11), (5.0, 0.1), (20.0, 0.07), (30.0, 0.04)], -70.0, 30.0,
                   [-50.0, -25.0, 0.0], {'ground': tone('#bcb8ac'), 'vein': tone('#4a4236'), 'vein_k': 0.7},
                   {'ground': tone('#bcb8ac'), 'vein': tone('#4a4236'), 'vein_k': 0.7}, rings=7, step=8.0)
        rigged(finish_wing(part, name + '-vinge-' + tag), 'bee', 'wing', s, 0.0, root, alpha=0.4)


# --- the wood ant --------------------------------------------------------------------------------------------------------
# A wood ant of Granskogen's anthill, 0.36 long: a dark head with its jaws and its feelers bent at the elbow, a rust-red
# thorax, the node of its waist, and a round dark gaster. Its six legs are parts of their own, each turning at its hip:
# the front and back legs of one side walk with the middle one of the other (`group`). Its feet are at the origin.

ANT_DARK = tone('#2a1c16')
ANT_RUST = tone('#6e3e26')
ANT_LEG = tone('#4a2c1e')

if wanted('myra'):
    name = 'myra'
    part = new_part()
    # The gaster: round, dark, with a faint sheen of rings.
    gaster = lump(part, Vector((-0.115, 0.0, 0.1)), (0.072, 0.056, 0.054), 3, ANT_DARK)
    for vert in gaster:
        band = (math.sin((vert.co.x + 0.115) * 140.0) + 1.0) * 0.5
        part['paint'][vert] = blend(ANT_DARK, tone('#3c2a20'), band * 0.6)
    # The waist's node, and the thorax: long, humped, rust-red.
    ball(part, (-0.035, 0.0, 0.098), (0.012, 0.014, 0.022), 2, ANT_RUST)
    rows = [(-0.025, 0.094, 0.012, 0.012), (-0.008, 0.098, 0.02, 0.022), (0.015, 0.104, 0.024, 0.026), (0.035, 0.104, 0.022, 0.024),
            (0.05, 0.106, 0.016, 0.018)]
    loft_x(part, rows, 10, [ANT_RUST] * len(rows))
    # The head: broad, dark, its eyes at its sides, its jaws in front.
    ball(part, (0.085, 0.0, 0.112), (0.034, 0.036, 0.03), 3, ANT_DARK)
    for s in (-1.0, 1.0):
        ball(part, (0.093, -0.031 * s, 0.12), (0.009, 0.006, 0.009), 1, tone('#100c0a'))
        rod(part, [(0.112, -0.012 * s, 0.098), (0.13, -0.01 * s, 0.094), (0.136, -0.002 * s, 0.092)], [0.0045, 0.0035, 0.002], tone('#3a241a'), 4)
    rigged(finish(part, name, sharp=60.0, strength=0.4, reach=0.05, floor=0.0), 'ant')
    # Feelers: a long first joint up and out, then bent forward and down; each a part, to wave.
    for s in (1.0, -1.0):
        tag = 'n' if s > 0 else 'f'
        part = new_part()
        base = (0.104, -0.012 * s, 0.128)
        elbow = (0.12, -0.04 * s, 0.17)
        tip = (0.175, -0.05 * s, 0.15)
        rod(part, [base, elbow, tip], [0.0032, 0.0028, 0.0024], ANT_DARK, 4)
        rigged(finish(part, name + '-kanna-' + tag, sharp=180.0, strength=0.0, reach=0.02), 'ant', 'feeler', s, 0.0, base)
    # The legs: from the hip on the thorax, the thigh up and out, the shin down to the ground, the foot.
    LEGS = [(0.04, 0.032, 0.6), (0.018, 0.0, 0.0), (-0.004, -0.04, -0.7)]
    for s in (1.0, -1.0):
        tag = 'n' if s > 0 else 'f'
        for k, (x, reach, splay) in enumerate(LEGS):
            part = new_part()
            hip = Vector((x, -0.014 * s, 0.09))
            knee = Vector((x + reach * 0.45, -0.07 * s, 0.118))
            ankle = Vector((x + reach, -0.11 * s, 0.018))
            foot = Vector((x + reach * 1.15 + 0.012, -0.118 * s, 0.002))
            rod(part, [tuple(hip), tuple(hip.lerp(knee, 0.5)), tuple(knee), tuple(knee.lerp(ankle, 0.5)), tuple(ankle), tuple(foot)],
                [0.0085, 0.0085, 0.0068, 0.0052, 0.004, 0.003], ANT_LEG, 5)
            # The walk's two groups: front and back legs of the near side with the middle one of the far.
            group = (k + (0 if s > 0 else 1)) % 2
            rigged(finish(part, name + '-ben-' + str(k) + tag, sharp=180.0, strength=0.2, reach=0.03), 'ant', 'leg', s, float(group), hip)

print('small life built')
