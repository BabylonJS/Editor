// @ts-ignore - ES module imports in CommonJS context
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { Scene, PointLight, DirectionalLight, SpotLight, HemisphericLight, Color3, Vector3 } from "babylonjs";

export function createLightTools(scene: Scene, onChange?: () => void): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: "list_lights",
      description: "Lists all lights in the scene with their basic properties",
      schema: z.object({}),
      func: async () => {
        const lights = scene.lights.map((light) => ({
          name: light.name,
          id: light.id,
          type: light.getClassName(),
          isEnabled: light.isEnabled(),
          intensity: light.intensity,
        }));
        return JSON.stringify({ lights, count: lights.length });
      },
    }),

    new DynamicStructuredTool({
      name: "get_light_properties",
      description: "Gets detailed properties of a specific light by name or id",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the light"),
      }),
      func: async ({ nameOrId }) => {
        const light = scene.getLightByName(nameOrId) || scene.getLightById(nameOrId);
        if (!light) {
          return JSON.stringify({ error: `Light "${nameOrId}" not found` });
        }

        const baseProps: any = {
          name: light.name,
          id: light.id,
          type: light.getClassName(),
          isEnabled: light.isEnabled(),
          intensity: light.intensity,
        };

        if (light instanceof PointLight || light instanceof DirectionalLight || light instanceof SpotLight) {
          baseProps.diffuse = light.diffuse
            ? { r: light.diffuse.r, g: light.diffuse.g, b: light.diffuse.b }
            : null;
          baseProps.specular = light.specular
            ? { r: light.specular.r, g: light.specular.g, b: light.specular.b }
            : null;
        }

        if (light instanceof PointLight || light instanceof SpotLight) {
          baseProps.position = {
            x: light.position.x,
            y: light.position.y,
            z: light.position.z,
          };
        }

        if (light instanceof DirectionalLight || light instanceof SpotLight) {
          baseProps.direction = {
            x: light.direction.x,
            y: light.direction.y,
            z: light.direction.z,
          };
        }

        return JSON.stringify(baseProps);
      },
    }),

    new DynamicStructuredTool({
      name: "set_light_intensity",
      description: "Sets the intensity of a light",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the light"),
        intensity: z.number().min(0).describe("Light intensity"),
      }),
      func: async ({ nameOrId, intensity }) => {
        const light = scene.getLightByName(nameOrId) || scene.getLightById(nameOrId);
        if (!light) {
          return JSON.stringify({ error: `Light "${nameOrId}" not found` });
        }

        light.intensity = intensity;
        scene.markAllMaterialsAsDirty(2);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Intensity of light "${light.name}" set to ${intensity}`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_light_color",
      description: "Sets the diffuse color of a light",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the light"),
        r: z.number().min(0).max(1).describe("Red component (0-1)"),
        g: z.number().min(0).max(1).describe("Green component (0-1)"),
        b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      }),
      func: async ({ nameOrId, r, g, b }) => {
        const light = scene.getLightByName(nameOrId) || scene.getLightById(nameOrId);
        if (!light) {
          return JSON.stringify({ error: `Light "${nameOrId}" not found` });
        }

        if (light instanceof PointLight || light instanceof DirectionalLight || light instanceof SpotLight) {
          light.diffuse = new Color3(r, g, b);
          scene.markAllMaterialsAsDirty(2);
          if (onChange) onChange();
          return JSON.stringify({
            success: true,
            message: `Color of light "${light.name}" set to RGB(${r}, ${g}, ${b})`,
          });
        }

        return JSON.stringify({
          error: `Light "${light.name}" does not support color modification`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_light_position",
      description: "Sets the position of a point light or spot light",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the light"),
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
        z: z.number().describe("Z coordinate"),
      }),
      func: async ({ nameOrId, x, y, z }) => {
        const light = scene.getLightByName(nameOrId) || scene.getLightById(nameOrId);
        if (!light) {
          return JSON.stringify({ error: `Light "${nameOrId}" not found` });
        }

        if (light instanceof PointLight || light instanceof SpotLight) {
          light.position = new Vector3(x, y, z);
          scene.markAllMaterialsAsDirty(2);
          if (onChange) onChange();
          return JSON.stringify({
            success: true,
            message: `Position of light "${light.name}" set to (${x}, ${y}, ${z})`,
          });
        }

        return JSON.stringify({
          error: `Light "${light.name}" does not support position modification`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "enable_disable_light",
      description: "Enables or disables a light",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the light"),
        enabled: z.boolean().describe("Whether the light should be enabled"),
      }),
      func: async ({ nameOrId, enabled }) => {
        const light = scene.getLightByName(nameOrId) || scene.getLightById(nameOrId);
        if (!light) {
          return JSON.stringify({ error: `Light "${nameOrId}" not found` });
        }

        light.setEnabled(enabled);
        scene.markAllMaterialsAsDirty(2);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Light "${light.name}" ${enabled ? "enabled" : "disabled"}`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "create_light",
      description: "Creates a new light in the scene (point, directional, spot, or hemispheric)",
      schema: z.object({
        type: z.enum(["point", "directional", "spot", "hemispheric"]).describe("Type of light to create"),
        name: z.string().describe("Name for the new light"),
        x: z.number().optional().describe("X position/direction"),
        y: z.number().optional().describe("Y position/direction"),
        z: z.number().optional().describe("Z position/direction"),
        intensity: z.number().optional().describe("Light intensity (default: 1)"),
      }),
      func: async ({ type, name, x, y, z, intensity }) => {
        const vector = new Vector3(x || 0, y || 1, z || 0);
        const lightIntensity = intensity || 1;
        let light;

        switch (type) {
          case "point":
            light = new PointLight(name, vector, scene);
            break;
          case "directional":
            light = new DirectionalLight(name, vector, scene);
            break;
          case "spot":
            light = new SpotLight(name, vector, new Vector3(0, -1, 0), Math.PI / 3, 2, scene);
            break;
          case "hemispheric":
            light = new HemisphericLight(name, vector, scene);
            break;
          default:
            return JSON.stringify({ error: `Unknown light type: ${type}` });
        }

        light.intensity = lightIntensity;
        scene.markAllMaterialsAsDirty(2);
        if (onChange) onChange();

        return JSON.stringify({
          success: true,
          message: `Created ${type} light "${name}" with intensity ${lightIntensity}`,
          lightId: light.id,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "delete_light",
      description: "Deletes a light from the scene",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the light to delete"),
      }),
      func: async ({ nameOrId }) => {
        const light = scene.getLightByName(nameOrId) || scene.getLightById(nameOrId);
        if (!light) {
          return JSON.stringify({ error: `Light "${nameOrId}" not found` });
        }

        const lightName = light.name;
        light.dispose();
        scene.markAllMaterialsAsDirty(2);
        if (onChange) onChange();

        return JSON.stringify({
          success: true,
          message: `Deleted light "${lightName}"`,
        });
      },
    }),
  ];
}

