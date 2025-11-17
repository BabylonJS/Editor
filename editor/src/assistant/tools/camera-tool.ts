// @ts-ignore - ES module imports in CommonJS context
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { Scene, ArcRotateCamera, FreeCamera, Vector3 } from "babylonjs";

export function createCameraTools(scene: Scene, onChange?: () => void): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: "list_cameras",
      description: "Lists all cameras in the scene with their basic properties",
      schema: z.object({}),
      func: async () => {
        const cameras = scene.cameras.map((camera) => ({
          name: camera.name,
          id: camera.id,
          type: camera.getClassName(),
          isActive: scene.activeCamera === camera,
        }));
        return JSON.stringify({ cameras, count: cameras.length });
      },
    }),

    new DynamicStructuredTool({
      name: "get_camera_properties",
      description: "Gets detailed properties of a specific camera by name or id",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the camera"),
      }),
      func: async ({ nameOrId }) => {
        const camera = scene.getCameraByName(nameOrId) || scene.getCameraById(nameOrId);
        if (!camera) {
          return JSON.stringify({ error: `Camera "${nameOrId}" not found` });
        }

        const baseProps: any = {
          name: camera.name,
          id: camera.id,
          type: camera.getClassName(),
          isActive: scene.activeCamera === camera,
          fov: camera.fov,
          minZ: camera.minZ,
          maxZ: camera.maxZ,
        };

        if (camera instanceof ArcRotateCamera) {
          baseProps.alpha = camera.alpha;
          baseProps.beta = camera.beta;
          baseProps.radius = camera.radius;
          baseProps.target = {
            x: camera.target.x,
            y: camera.target.y,
            z: camera.target.z,
          };
        }

        if (camera instanceof FreeCamera) {
          baseProps.position = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          };
        }

        return JSON.stringify(baseProps);
      },
    }),

    new DynamicStructuredTool({
      name: "set_camera_fov",
      description: "Sets the field of view (FOV) of a camera in radians",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the camera"),
        fov: z.number().min(0).max(Math.PI).describe("Field of view in radians"),
      }),
      func: async ({ nameOrId, fov }) => {
        const camera = scene.getCameraByName(nameOrId) || scene.getCameraById(nameOrId);
        if (!camera) {
          return JSON.stringify({ error: `Camera "${nameOrId}" not found` });
        }

        camera.fov = fov;
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `FOV of camera "${camera.name}" set to ${fov} radians`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_arc_rotate_camera_position",
      description: "Sets the position parameters (alpha, beta, radius) of an ArcRotateCamera",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the ArcRotateCamera"),
        alpha: z.number().optional().describe("Horizontal rotation angle in radians"),
        beta: z.number().optional().describe("Vertical rotation angle in radians"),
        radius: z.number().optional().describe("Distance from target"),
      }),
      func: async ({ nameOrId, alpha, beta, radius }) => {
        const camera = scene.getCameraByName(nameOrId) || scene.getCameraById(nameOrId);
        if (!camera) {
          return JSON.stringify({ error: `Camera "${nameOrId}" not found` });
        }

        if (!(camera instanceof ArcRotateCamera)) {
          return JSON.stringify({ error: `Camera "${camera.name}" is not an ArcRotateCamera` });
        }

        if (alpha !== undefined) camera.alpha = alpha;
        if (beta !== undefined) camera.beta = beta;
        if (radius !== undefined) camera.radius = radius;
        if (onChange) onChange();

        return JSON.stringify({
          success: true,
          message: `ArcRotateCamera "${camera.name}" position updated`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_arc_rotate_camera_target",
      description: "Sets the target position that an ArcRotateCamera looks at",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the ArcRotateCamera"),
        x: z.number().describe("X coordinate of target"),
        y: z.number().describe("Y coordinate of target"),
        z: z.number().describe("Z coordinate of target"),
      }),
      func: async ({ nameOrId, x, y, z }) => {
        const camera = scene.getCameraByName(nameOrId) || scene.getCameraById(nameOrId);
        if (!camera) {
          return JSON.stringify({ error: `Camera "${nameOrId}" not found` });
        }

        if (!(camera instanceof ArcRotateCamera)) {
          return JSON.stringify({ error: `Camera "${camera.name}" is not an ArcRotateCamera` });
        }

        camera.target.set(x, y, z);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `ArcRotateCamera "${camera.name}" target set to (${x}, ${y}, ${z})`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_free_camera_position",
      description: "Sets the position of a FreeCamera",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the FreeCamera"),
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
        z: z.number().describe("Z coordinate"),
      }),
      func: async ({ nameOrId, x, y, z }) => {
        const camera = scene.getCameraByName(nameOrId) || scene.getCameraById(nameOrId);
        if (!camera) {
          return JSON.stringify({ error: `Camera "${nameOrId}" not found` });
        }

        if (!(camera instanceof FreeCamera)) {
          return JSON.stringify({ error: `Camera "${camera.name}" is not a FreeCamera` });
        }

        camera.position = new Vector3(x, y, z);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `FreeCamera "${camera.name}" position set to (${x}, ${y}, ${z})`,
        });
      },
    }),
  ];
}

