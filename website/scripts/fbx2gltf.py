import bpy
import sys

# Get the command line arguments
argv = sys.argv

# Blender skips its own arguments, so we find "--" and start processing after that
if "--" in argv:
    argv = argv[argv.index("--") + 1:]
else:
    argv = []  # as no arguments are passed

# Check if we have the correct number of arguments
if len(argv) < 2:
    print("Usage: blender --background --python <script.py> -- <import_file_path> <export_file_path>")
    sys.exit(1)

# Path to the FBX file to import
import_file_path = argv[0]
# Path to save the re-exported FBX file
export_file_path = argv[1]

# Clear all objects from the current scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import the FBX file
bpy.ops.import_scene.fbx(filepath=import_file_path)

# Select all objects (if needed)
bpy.ops.object.select_all(action='SELECT')

# Export to FBX
# bpy.ops.export_scene.fbx(filepath=export_file_path)
bpy.ops.export_scene.gltf(filepath=export_file_path, export_format='GLB')   
