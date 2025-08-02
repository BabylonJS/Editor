import os
import bpy
import platform

from utils import log


def bake_object(obj: any, output_folder: str, quality: str):
    if obj.type != "MESH":
        return

    if (
        obj.data is None
        or not hasattr(obj.data, "uv_layers")
        or len(obj.data.polygons) == 0
    ):
        return

    bpy.context.scene.render.engine = "CYCLES"

    cycles = bpy.context.scene.cycles
    cycles.use_adaptive_sampling = True
    cycles.use_denoising = True

    system = platform.system()
    prefs = bpy.context.preferences.addons["cycles"].preferences

    if system == "Darwin":
        prefs.compute_device_type = "METAL"
    elif system == "Windows":
        cycles.denoiser = "OPTIX"
        prefs.compute_device_type = "OPTIX"  # Try OPTIX first
    elif system == "Linux":
        prefs.compute_device_type = "CUDA"
    else:
        prefs.compute_device_type = "NONE"  # fallback

    prefs.get_devices()

    if not prefs.devices or all(not d.use for d in prefs.devices):
        log(
            f"⚠️ No GPU devices found for {prefs.compute_device_type} - falling back to CPU."
        )
        bpy.context.scene.cycles.device = "CPU"
    else:
        for device in prefs.devices:
            device.use = True
        bpy.context.scene.cycles.device = "GPU"

    log(f"Used device: {bpy.context.scene.cycles.device}")
    log(f"Device type: {prefs.compute_device_type}")

    texture_size = 1024

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

    log(f"🧱 Baking mesh: {obj.name}")

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
    if not "LightmapUV" in obj.data.uv_layers:
        obj.data.uv_layers.new(name="LightmapUV")

    obj.data.uv_layers.active = obj.data.uv_layers["LightmapUV"]

    # Smart UV unwrap for lightmap
    log(f"Unwrapping UV2s for {obj.name}")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.pack_islands(margin=0.006)

    bpy.ops.object.mode_set(mode="OBJECT")
    log(f"Unwrapped UV2s for {obj.name}")

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
        pass_filter={"DIRECT", "INDIRECT"},
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
