// @ts-ignore - ES module imports in CommonJS context
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3 } from "babylonjs";

export function createMeshTools(scene: Scene, onChange?: () => void): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: "list_meshes",
      description: "Lists all meshes in the scene with their basic properties",
      schema: z.object({}),
      func: async () => {
        const meshes = scene.meshes.map((mesh) => ({
          name: mesh.name,
          id: mesh.id,
          isVisible: mesh.isVisible,
          isEnabled: mesh.isEnabled(),
          position: {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          },
          scaling: {
            x: mesh.scaling.x,
            y: mesh.scaling.y,
            z: mesh.scaling.z,
          },
        }));
        return JSON.stringify({ meshes, count: meshes.length });
      },
    }),

    new DynamicStructuredTool({
      name: "get_mesh_properties",
      description: "Gets detailed properties of a specific mesh by name or id",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the mesh"),
      }),
      func: async ({ nameOrId }) => {
        const mesh = scene.getMeshByName(nameOrId) || scene.getMeshById(nameOrId);
        if (!mesh) {
          return JSON.stringify({ error: `Mesh "${nameOrId}" not found` });
        }

        return JSON.stringify({
          name: mesh.name,
          id: mesh.id,
          isVisible: mesh.isVisible,
          isEnabled: mesh.isEnabled(),
          position: {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          },
          rotation: {
            x: mesh.rotation.x,
            y: mesh.rotation.y,
            z: mesh.rotation.z,
          },
          scaling: {
            x: mesh.scaling.x,
            y: mesh.scaling.y,
            z: mesh.scaling.z,
          },
          material: mesh.material?.name || "none",
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_mesh_position",
      description: "Sets the position of a mesh",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the mesh"),
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
        z: z.number().describe("Z coordinate"),
      }),
      func: async ({ nameOrId, x, y, z }) => {
        const mesh = scene.getMeshByName(nameOrId) || scene.getMeshById(nameOrId);
        if (!mesh) {
          return JSON.stringify({ error: `Mesh "${nameOrId}" not found` });
        }

        mesh.position = new Vector3(x, y, z);
        mesh.computeWorldMatrix(true);
        scene.markAllMaterialsAsDirty(1);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Position of mesh "${mesh.name}" set to (${x}, ${y}, ${z})`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_mesh_scaling",
      description: "Sets the scaling of a mesh",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the mesh"),
        x: z.number().describe("X scale factor"),
        y: z.number().describe("Y scale factor"),
        z: z.number().describe("Z scale factor"),
      }),
      func: async ({ nameOrId, x, y, z }) => {
        const mesh = scene.getMeshByName(nameOrId) || scene.getMeshById(nameOrId);
        if (!mesh) {
          return JSON.stringify({ error: `Mesh "${nameOrId}" not found` });
        }

        mesh.scaling = new Vector3(x, y, z);
        mesh.computeWorldMatrix(true);
        scene.markAllMaterialsAsDirty(1);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Scaling of mesh "${mesh.name}" set to (${x}, ${y}, ${z})`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_mesh_rotation",
      description: "Sets the rotation of a mesh in radians",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the mesh"),
        x: z.number().describe("X rotation in radians"),
        y: z.number().describe("Y rotation in radians"),
        z: z.number().describe("Z rotation in radians"),
      }),
      func: async ({ nameOrId, x, y, z }) => {
        const mesh = scene.getMeshByName(nameOrId) || scene.getMeshById(nameOrId);
        if (!mesh) {
          return JSON.stringify({ error: `Mesh "${nameOrId}" not found` });
        }

        mesh.rotation = new Vector3(x, y, z);
        mesh.computeWorldMatrix(true);
        scene.markAllMaterialsAsDirty(1);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Rotation of mesh "${mesh.name}" set to (${x}, ${y}, ${z}) radians`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_mesh_visibility",
      description: "Sets the visibility of a mesh",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the mesh"),
        visible: z.boolean().describe("Whether the mesh should be visible"),
      }),
      func: async ({ nameOrId, visible }) => {
        const mesh = scene.getMeshByName(nameOrId) || scene.getMeshById(nameOrId);
        if (!mesh) {
          return JSON.stringify({ error: `Mesh "${nameOrId}" not found` });
        }

        mesh.isVisible = visible;
        scene.markAllMaterialsAsDirty(1);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Visibility of mesh "${mesh.name}" set to ${visible}`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "create_mesh",
      description: "Creates a new mesh in the scene (box, sphere, cylinder, plane, torus, or ground)",
      schema: z.object({
        type: z.enum(["box", "sphere", "cylinder", "plane", "torus", "ground"]).describe("Type of mesh to create"),
        name: z.string().describe("Name for the new mesh"),
        x: z.number().optional().describe("X position (default: 0)"),
        y: z.number().optional().describe("Y position (default: 0)"),
        z: z.number().optional().describe("Z position (default: 0)"),
      }),
      func: async ({ type, name, x, y, z }) => {
        const position = new Vector3(x || 0, y || 0, z || 0);
        let mesh;

        switch (type) {
          case "box":
            mesh = MeshBuilder.CreateBox(name, { size: 1 }, scene);
            break;
          case "sphere":
            mesh = MeshBuilder.CreateSphere(name, { diameter: 1 }, scene);
            break;
          case "cylinder":
            mesh = MeshBuilder.CreateCylinder(name, { height: 2, diameter: 1 }, scene);
            break;
          case "plane":
            mesh = MeshBuilder.CreatePlane(name, { size: 1 }, scene);
            break;
          case "torus":
            mesh = MeshBuilder.CreateTorus(name, { diameter: 1, thickness: 0.3 }, scene);
            break;
          case "ground":
            mesh = MeshBuilder.CreateGround(name, { width: 10, height: 10 }, scene);
            break;
          default:
            return JSON.stringify({ error: `Unknown mesh type: ${type}` });
        }

        mesh.position = position;

        const material = new StandardMaterial(name + "_material", scene);
        material.diffuseColor = new Color3(0.7, 0.7, 0.7);
        mesh.material = material;

        scene.markAllMaterialsAsDirty(1);
        if (onChange) onChange();

        return JSON.stringify({
          success: true,
          message: `Created ${type} mesh "${name}" at position (${x || 0}, ${y || 0}, ${z || 0})`,
          meshId: mesh.id,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "rename_mesh",
      description: "Renames a mesh in the scene",
      schema: z.object({
        nameOrId: z.string().describe("The current name or id of the mesh"),
        newName: z.string().describe("The new name for the mesh"),
      }),
      func: async ({ nameOrId, newName }) => {
        const mesh = scene.getMeshByName(nameOrId) || scene.getMeshById(nameOrId);
        if (!mesh) {
          return JSON.stringify({ error: `Mesh "${nameOrId}" not found` });
        }

        const oldName = mesh.name;
        mesh.name = newName;
        if (onChange) onChange();

        return JSON.stringify({
          success: true,
          message: `Renamed mesh from "${oldName}" to "${newName}"`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "delete_mesh",
      description: "Deletes a mesh from the scene",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the mesh to delete"),
      }),
      func: async ({ nameOrId }) => {
        const mesh = scene.getMeshByName(nameOrId) || scene.getMeshById(nameOrId);
        if (!mesh) {
          return JSON.stringify({ error: `Mesh "${nameOrId}" not found` });
        }

        const meshName = mesh.name;
        mesh.dispose();
        scene.markAllMaterialsAsDirty(1);
        if (onChange) onChange();

        return JSON.stringify({
          success: true,
          message: `Deleted mesh "${meshName}"`,
        });
      },
    }),
  ];
}

