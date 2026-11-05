"""The last step of a kit: the shade of each thing's own creases is baked into its colours. Set BAKE = False to skip it."""
# --- the shade of each thing's own creases, and of the ground under it, baked into its colours --------------

scene = bpy.context.scene
before = scene.render.engine
try:
    scene.render.engine = 'CYCLES'
except TypeError:
    pass
shaded = 0
if BAKE and scene.render.engine == 'CYCLES':
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 32
    things = [made for made in scene.objects if made.type == 'MESH']
    bpy.ops.mesh.primitive_plane_add(size=80.0)
    ground = bpy.context.object
    ground.name = 'bake-ground'
    # Each is shaded alone: the others stand aside while it is baked.
    for made in things:
        made.hide_render = True
    for made in things:
        strength = made['shade']
        if strength <= 0.0:
            continue
        mesh = made.data
        # One shade for each point, so that a smooth thing stays smooth: its corners agree where they meet.
        occlusion = mesh.color_attributes.new('occlusion', 'FLOAT_COLOR', 'POINT')
        mesh.color_attributes.active_color = occlusion
        made.hide_render = False
        ground.hide_render = made['floor'] < -999.0
        ground.location = (0.0, 0.0, made['floor'])
        if scene.world is not None:
            scene.world.light_settings.distance = made['reach']
        bpy.ops.object.select_all(action='DESELECT')
        made.select_set(True)
        bpy.context.view_layer.objects.active = made
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        made.hide_render = True
        occlusion = mesh.color_attributes['occlusion']
        colour = mesh.color_attributes['Color']
        for i in range(len(colour.data)):
            light = occlusion.data[mesh.loops[i].vertex_index].color[0]
            k = 1.0 - strength * (1.0 - min(1.0, light) ** 0.8)
            c = colour.data[i].color
            colour.data[i].color = (c[0] * k, c[1] * k, c[2] * k, 1.0)
        mesh.color_attributes.remove(mesh.color_attributes['occlusion'])
        mesh.color_attributes.active_color = mesh.color_attributes['Color']
        shaded += 1
    for made in things:
        made.hide_render = False
    bpy.data.objects.remove(ground, do_unlink=True)
try:
    scene.render.engine = before
except TypeError:
    pass

total = 0
for made in scene.objects:
    if made.type == 'MESH':
        del made['shade']
        del made['reach']
        del made['floor']
        made.data.color_attributes.render_color_index = 0
        made.data.color_attributes.active_color_index = 0
        made.data.calc_loop_triangles()
        total += len(made.data.loop_triangles)
        print('  ', made.name, len(made.data.loop_triangles), 'triangles,', len(made.data.vertices), 'points')
print('kit built:', len(scene.objects), 'things,', total, 'triangles,', shaded, 'shaded')
