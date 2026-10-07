"""Exports the open Blender scene as a GLB for the game (plan §5.6). Every export goes through this script,
so a model comes out the same wherever it is made. It expects OUT, the path of the .glb to write.

Through MCP, where a session drives Olov's open Blender: send this file's text after a first line that sets OUT,
for example  OUT = r'C:/.../art/baked/boot/big-candy.glb'
The MCP server's safe mode allows nothing but bpy here, which is why this script reads no arguments itself.

Headless, in a cloud session or on Olov's computer:
    blender -b art/blender/<name>.blend --python-expr \
        "OUT='art/baked/<pack>/<name>.glb'; exec(open('scripts/bake/export.py').read())"

The game's asset build (scripts/build-assets.mjs) then compresses the meshes and turns the textures into KTX2.
For a character review scene, select its game collection and set
    bpy.context.scene['_export_selected_only'] = True
before this script. The one-shot flag is consumed by the export, keeping reference-image empties out of the GLB.
"""
import bpy

bpy.ops.export_scene.gltf(
    filepath=OUT,  # noqa: F821 (set by the caller, see above)
    export_format='GLB',
    export_yup=True,            # Blender's Z-up becomes glTF's Y-up
    export_apply=True,          # modifiers are applied
    export_extras=True,         # custom properties become "extras", and userData in three
    export_cameras=False,
    export_lights=False,
    export_animations=True,
    export_image_format='AUTO',  # textures stay PNG here; the asset build makes them KTX2
    # A character review can request its selected game meshes, excluding the reference-image empties.
    use_selection=bpy.context.scene.pop('_export_selected_only', False),
)
print('exported', OUT)  # noqa: F821
