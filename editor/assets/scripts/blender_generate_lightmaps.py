import bpy
import sys
import os
import platform

# ---------------------------
# Parse CLI args
# ---------------------------
argv = sys.argv
argv = argv[argv.index("--") + 1 :]
input_path = argv[0]
output_folder = argv[1]

texture_size = 1024
quality = argv[2] if len(argv) > 2 else "high"


def log(msg):
    print(msg)
    sys.stdout.flush()


log(f"Input GLB: {input_path}")
log(f"Output Folder: {output_folder}")

# ---------------------------
# Setup: clear default scene
# ---------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------------------------
# Import GLB/GLTF
# ---------------------------
# Import all .glb files from input_path
log(f"📦 Importing GLBs: {input_path}")
for filename in os.listdir(input_path):
    if filename.lower().endswith(".gltf"):
        glb_path = os.path.join(input_path, filename)
        bpy.ops.import_scene.gltf(filepath=glb_path)
        log(f"editor_log: 🔧 Imported GLTF file: {filename}")

# bpy.ops.import_scene.gltf(filepath=input_path)

# ✅ Set render engine to Cycles (required for baking)
bpy.context.scene.render.engine = "CYCLES"
cycles = bpy.context.scene.cycles

cycles.use_adaptive_sampling = True
cycles.use_denoising = True
cycles.denoiser = "OPTIX"

match quality:
    case "low":
        texture_size = 256
        cycles.samples = 256
        cycles.max_bounces = 12
        cycles.diffuse_bounces = 5
        cycles.glossy_bounces = 5
        cycles.transparent_max_bounces = 8
        cycles.transmission_bounces = 5
    case "medium":
        texture_size = 512
        cycles.samples = 512
        cycles.max_bounces = 8
        cycles.diffuse_bounces = 5
        cycles.glossy_bounces = 5
        cycles.transparent_max_bounces = 8
        cycles.transmission_bounces = 5
    case "high":
        texture_size = 1024
        cycles.samples = 256
        cycles.max_bounces = 4
        cycles.diffuse_bounces = 5
        cycles.glossy_bounces = 5
        cycles.transparent_max_bounces = 8
        cycles.transmission_bounces = 5
    case "preview":
        texture_size = 128
        cycles.samples = 128
        cycles.max_bounces = 4
        cycles.diffuse_bounces = 5
        cycles.glossy_bounces = 5
        cycles.transparent_max_bounces = 8
        cycles.transmission_bounces = 5

system = platform.system()
prefs = bpy.context.preferences.addons["cycles"].preferences

# Choose GPU backend dynamically
if system == "Darwin":
    prefs.compute_device_type = "METAL"
elif system == "Windows":
    prefs.compute_device_type = "OPTIX"  # Try OPTIX first
elif system == "Linux":
    prefs.compute_device_type = "CUDA"
else:
    prefs.compute_device_type = "NONE"  # fallback

# Load and activate devices
prefs.get_devices()

# If no device found for current backend, fallback to CPU
if not prefs.devices or all(not d.use for d in prefs.devices):
    log(
        f"editor_log: ⚠️ No GPU devices found for {prefs.compute_device_type} - falling back to CPU."
    )
    bpy.context.scene.cycles.device = "CPU"
else:
    for device in prefs.devices:
        device.use = True
    bpy.context.scene.cycles.device = "GPU"

log(f"editor_log: Used device: {bpy.context.scene.cycles.device}")
log(f"editor_log: Device type: {prefs.compute_device_type}")

# ---------------------------
# Bake Lightmaps
# ---------------------------
for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    if (
        obj.data is None
        or not hasattr(obj.data, "uv_layers")
        or len(obj.data.polygons) == 0
    ):
        continue  # Skip invalid/empty meshes

    log(f"editor_log: 🧱 Baking mesh: {obj.name}")

    # Ensure clean selection
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    # Ensure material with nodes
    for slot in obj.material_slots:
        if not slot.material:
            slot.material = bpy.data.materials.new(name="LightmapMaterial")
        if not slot.material.use_nodes:
            slot.material.use_nodes = True

    # Ensure second UV channel (lightmap)
    if "LightmapUV" not in obj.data.uv_layers:
        obj.data.uv_layers.new(name="LightmapUV")
    obj.data.uv_layers.active = obj.data.uv_layers["LightmapUV"]

    # Smart UV unwrap for lightmap
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.pack_islands(margin=0.006)

    # bpy.ops.uv.smart_project(angle_limit=66, island_margin=0.03)
    # bpy.ops.uv.smart_project(angle_limit=1.5707, island_margin=0.03)
    # bpy.ops.uv.smart_project(
    #     angle_limit=66.0,
    #     island_margin=0.006,
    #     area_weight=0.0,
    #     correct_aspect=True,
    #     scale_to_bounds=False
    # )

    bpy.ops.object.mode_set(mode="OBJECT")

    # Create new image for baking
    lightmap_name = f"{obj.name}_lightmap"
    image = bpy.data.images.new(
        name=lightmap_name, width=texture_size, height=texture_size
    )

    # Assign image to texture nodes
    for slot in obj.material_slots:
        mat = slot.material
        nodes = mat.node_tree.nodes
        tex_node = nodes.new("ShaderNodeTexImage")
        tex_node.image = image
        tex_node.name = "BakeLightmap"
        mat.node_tree.nodes.active = tex_node

    # Bake lighting into image
    # bpy.ops.object.bake(type='COMBINED', use_clear=True, margin=4)
    bpy.ops.object.bake(
        type="DIFFUSE",
        pass_filter={"DIRECT", "INDIRECT", "COLOR", "GLOSSY", "EMIT"},
        use_clear=True,
        margin=4,
        margin_type="EXTEND",
    )

    # Save baked image
    output_path = os.path.join(output_folder, f"{lightmap_name}.png")
    image.filepath_raw = output_path
    image.file_format = "PNG"
    image.save()

    obj.select_set(False)

# ---------------------------
# Export the baked scene
# ---------------------------
export_path = os.path.join(output_folder, "baked_scene.glb")
bpy.ops.export_scene.gltf(
    filepath=export_path, export_format="GLB", export_materials="NONE"
)

log("editor_log: ✅ Baking complete.")
