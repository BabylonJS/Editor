import os
import bpy
import json
import struct
from mathutils import Vector, Quaternion


def create_mesh_attributes(mesh_folder: str, bin_files: list):
    mesh_definition = {}

    with open(os.path.join(mesh_folder, "mesh.json"), "r") as f:
        mesh_definition["data"] = json.load(f)

    with open(os.path.join(mesh_folder, "positions.bin"), "rb") as f:
        mesh_definition["positions"] = struct.unpack(
            "f" * (os.path.getsize(f.name) // 4), f.read()
        )

    with open(os.path.join(mesh_folder, "indices.bin"), "rb") as f:
        mesh_definition["indices"] = struct.unpack(
            "I" * (os.path.getsize(f.name) // 4), f.read()
        )

    if "normals.bin" in bin_files:
        with open(os.path.join(mesh_folder, "normals.bin"), "rb") as f:
            mesh_definition["normals"] = struct.unpack(
                "f" * (os.path.getsize(f.name) // 4), f.read()
            )

    if "uvs.bin" in bin_files:
        with open(os.path.join(mesh_folder, "uvs.bin"), "rb") as f:
            mesh_definition["uvs"] = struct.unpack(
                "f" * (os.path.getsize(f.name) // 4), f.read()
            )

    if "uv2s.bin" in bin_files:
        with open(os.path.join(mesh_folder, "uv2s.bin"), "rb") as f:
            mesh_definition["uv2s"] = struct.unpack(
                "f" * (os.path.getsize(f.name) // 4), f.read()
            )

    return mesh_definition


def create_mesh(name: str, input_path: str, mesh_definition: dict):
    mesh = bpy.data.meshes.new(name)

    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    vertices = [
        Vector(
            (
                -mesh_definition["positions"][i],
                mesh_definition["positions"][i + 1],
                mesh_definition["positions"][i + 2],
            )
        )
        for i in range(0, len(mesh_definition["positions"]), 3)
    ]

    faces = [
        tuple(mesh_definition["indices"][i : i + 3])
        for i in range(0, len(mesh_definition["indices"]), 3)
    ]

    mesh.from_pydata(vertices, [], faces)

    if "normals" in mesh_definition:
        custom_normals = [
            Vector(
                (
                    -mesh_definition["normals"][i],
                    mesh_definition["normals"][i + 1],
                    mesh_definition["normals"][i + 2],
                )
            )
            for i in range(0, len(mesh_definition["normals"]), 3)
        ]

        loop_normals = [custom_normals[loop.vertex_index] for loop in mesh.loops]
        mesh.normals_split_custom_set(loop_normals)

    if "uvs" in mesh_definition:
        mesh.uv_layers.new(name="UVMap")
        uv_layer = mesh.uv_layers["UVMap"].data
        for i, loop in enumerate(mesh.loops):
            uv_layer[i].uv = (
                mesh_definition["uvs"][loop.vertex_index * 2],
                1.0 - mesh_definition["uvs"][loop.vertex_index * 2 + 1],
            )

    if "uv2s" in mesh_definition:
        mesh.uv_layers.new(name="LightmapUV")
        lightmap_uv_layer = mesh.uv_layers["LightmapUV"].data
        for i, loop in enumerate(mesh.loops):
            lightmap_uv_layer[i].uv = (
                mesh_definition["uv2s"][loop.vertex_index * 2],
                mesh_definition["uv2s"][loop.vertex_index * 2 + 1],
            )

    mat = bpy.data.materials.new(name=f"{name}_Material")
    mat.use_nodes = True

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    bsdf = nodes["Principled BSDF"]

    if "texture" in mesh_definition["data"]:
        img_path = os.path.join(
            input_path, "textures", mesh_definition["data"]["texture"]
        )
        img = bpy.data.images.load(img_path)

        tex_image = nodes.new("ShaderNodeTexImage")
        tex_image.image = img
        links.new(bsdf.inputs["Base Color"], tex_image.outputs["Color"])

        tex_coord = nodes.new(type="ShaderNodeTexCoord")
        mapping = nodes.new(type="ShaderNodeMapping")

        mapping.inputs["Scale"].default_value[0] = mesh_definition["data"][
            "textureUScale"
        ]
        mapping.inputs["Scale"].default_value[1] = mesh_definition["data"][
            "textureVScale"
        ]
        mapping.inputs["Scale"].default_value[2] = 1.0

        links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])
        links.new(mapping.outputs["Vector"], tex_image.inputs["Vector"])

    obj.data.materials.append(mat)

    obj.location = Vector(mesh_definition["data"]["position"])
    obj.scale = Vector(mesh_definition["data"]["scaling"])
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Quaternion(mesh_definition["data"]["rotation"])

    return mesh


def write_mesh(output_folder: str, mesh, mesh_definition):
    mesh.calc_loop_triangles()

    uv_layer = mesh.uv_layers["UVMap"].data
    uv_layer_lightmap = mesh.uv_layers["LightmapUV"].data

    indices = []
    positions = []
    normals = []
    uvs = []
    uv2s = []

    vertex_map = {}
    next_index = 0

    for tri in mesh.loop_triangles:
        for loop_index in tri.loops:
            vertex_index = mesh.loops[loop_index].vertex_index

            position = mesh.vertices[vertex_index].co
            normal = mesh.loops[loop_index].normal
            uv = uv_layer[loop_index].uv
            uv_lightmap = uv_layer_lightmap[loop_index].uv

            key = (
                -position.x,
                position.y,
                position.z,
                -normal.x,
                normal.y,
                normal.z,
                uv.x,
                1.0 - uv.y,
                uv_lightmap.x,
                uv_lightmap.y,
            )

            if key not in vertex_map:
                vertex_map[key] = next_index
                positions.extend([key[0], key[1], key[2]])
                normals.extend([key[3], key[4], key[5]])
                uvs.extend([key[6], key[7]])
                uv2s.extend([key[8], key[9]])
                next_index += 1

            indices.append(vertex_map[key])

    with open(os.path.join(output_folder, f"{mesh.name}_indices.bin"), "wb") as f:
        f.write(struct.pack("I" * len(indices), *indices))

    with open(os.path.join(output_folder, f"{mesh.name}_positions.bin"), "wb") as f:
        f.write(struct.pack("f" * len(positions), *positions))

    with open(os.path.join(output_folder, f"{mesh.name}_normals.bin"), "wb") as f:
        f.write(struct.pack("f" * len(normals), *normals))

    with open(os.path.join(output_folder, f"{mesh.name}_uvs.bin"), "wb") as f:
        f.write(struct.pack("f" * len(uvs), *uvs))

    with open(os.path.join(output_folder, f"{mesh.name}_uv2s.bin"), "wb") as f:
        f.write(struct.pack("f" * len(uv2s), *uv2s))
