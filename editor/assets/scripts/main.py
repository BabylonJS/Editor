import os
import struct
import bpy
import sys

script_dir = os.path.dirname(__file__)
if script_dir not in sys.path:
    sys.path.append(script_dir)

from utils import log

log("Starting Blender lightmap generation script...")

argv = sys.argv
argv = argv[argv.index("--") + 1 :]
input_path = argv[0]
output_folder = argv[1]
quality = argv[2] if len(argv) > 2 else "high"

from bake import bake_object
from mesh import create_mesh, write_mesh, create_mesh_attributes

# Clear scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Prepare meshes to bake
imported_meshes = []

for folder_name in os.listdir(input_path):
    mesh_folder = os.path.join(input_path, folder_name)

    if folder_name == "textures" or os.path.isdir(mesh_folder) is False:
        continue

    bin_files = [f for f in os.listdir(mesh_folder) if f.endswith(".bin")]

    mesh_definition = create_mesh_attributes(mesh_folder, bin_files)
    mesh = create_mesh(folder_name, input_path, mesh_definition)

    imported_meshes.append((mesh, mesh_definition))

log("Imported meshes.")

# Load lights
lights_path = os.path.join(input_path, "lights.glb")
if os.path.exists(lights_path):
    bpy.ops.import_scene.gltf(filepath=lights_path)

log("Imported lights, starting baking...")

# export_path = os.path.join(output_folder, "../test.glb")
# bpy.ops.export_scene.gltf(
#     filepath=export_path, export_format="GLB", export_materials="NONE"
# )

# Bake lightmaps for each object
for obj in bpy.context.scene.objects:
    bake_object(obj, output_folder, quality)

for mesh, mesh_definition in imported_meshes:
    log(f"Writing mesh {mesh.name} to output folder...")
    write_mesh(output_folder, mesh, mesh_definition)

# Export final glb
export_path = os.path.join(output_folder, "baked_scene.glb")

# bpy.ops.export_scene.fbx(
#     filepath=export_path,
#     # apply_unit_scale=True,
#     # apply_scale_options="FBX_SCALE_ALL",
#     object_types={"MESH"},
#     path_mode="STRIP",
#     axis_up="Y",
#     axis_forward="-Z",
# )
# bpy.ops.export_scene.gltf(
#     filepath=export_path, export_format="GLB", export_materials="NONE"
# )
