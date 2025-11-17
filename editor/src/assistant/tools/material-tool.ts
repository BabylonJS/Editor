// @ts-ignore - ES module imports in CommonJS context
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { Scene, PBRMaterial, StandardMaterial, Color3 } from "babylonjs";

export function createMaterialTools(scene: Scene, onChange?: () => void): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: "list_materials",
      description: "Lists all materials in the scene with their basic properties",
      schema: z.object({}),
      func: async () => {
        const materials = scene.materials.map((material) => ({
          name: material.name,
          id: material.id,
          type: material.getClassName(),
          alpha: material.alpha,
        }));
        return JSON.stringify({ materials, count: materials.length });
      },
    }),

    new DynamicStructuredTool({
      name: "get_material_properties",
      description: "Gets detailed properties of a specific material by name or id",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the material"),
      }),
      func: async ({ nameOrId }) => {
        const material = scene.getMaterialByName(nameOrId) || scene.getMaterialById(nameOrId);
        if (!material) {
          return JSON.stringify({ error: `Material "${nameOrId}" not found` });
        }

        const baseProps: any = {
          name: material.name,
          id: material.id,
          type: material.getClassName(),
          alpha: material.alpha,
          backFaceCulling: material.backFaceCulling,
        };

        if (material instanceof PBRMaterial) {
          baseProps.metallic = material.metallic;
          baseProps.roughness = material.roughness;
          baseProps.albedoColor = material.albedoColor
            ? { r: material.albedoColor.r, g: material.albedoColor.g, b: material.albedoColor.b }
            : null;
        } else if (material instanceof StandardMaterial) {
          baseProps.diffuseColor = material.diffuseColor
            ? { r: material.diffuseColor.r, g: material.diffuseColor.g, b: material.diffuseColor.b }
            : null;
          baseProps.specularColor = material.specularColor
            ? { r: material.specularColor.r, g: material.specularColor.g, b: material.specularColor.b }
            : null;
        }

        return JSON.stringify(baseProps);
      },
    }),

    new DynamicStructuredTool({
      name: "set_material_alpha",
      description: "Sets the alpha (transparency) of a material",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the material"),
        alpha: z.number().min(0).max(1).describe("Alpha value (0 = transparent, 1 = opaque)"),
      }),
      func: async ({ nameOrId, alpha }) => {
        const material = scene.getMaterialByName(nameOrId) || scene.getMaterialById(nameOrId);
        if (!material) {
          return JSON.stringify({ error: `Material "${nameOrId}" not found` });
        }

        material.alpha = alpha;
        material.markAsDirty(1);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Alpha of material "${material.name}" set to ${alpha}`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_pbr_material_color",
      description: "Sets the albedo color of a PBR material",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the PBR material"),
        r: z.number().min(0).max(1).describe("Red component (0-1)"),
        g: z.number().min(0).max(1).describe("Green component (0-1)"),
        b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      }),
      func: async ({ nameOrId, r, g, b }) => {
        const material = scene.getMaterialByName(nameOrId) || scene.getMaterialById(nameOrId);
        if (!material) {
          return JSON.stringify({ error: `Material "${nameOrId}" not found` });
        }

        if (!(material instanceof PBRMaterial)) {
          return JSON.stringify({ error: `Material "${material.name}" is not a PBR material` });
        }

        material.albedoColor = new Color3(r, g, b);
        material.markAsDirty(1);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Albedo color of material "${material.name}" set to RGB(${r}, ${g}, ${b})`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_pbr_material_metallic_roughness",
      description: "Sets the metallic and roughness values of a PBR material",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the PBR material"),
        metallic: z.number().min(0).max(1).describe("Metallic value (0-1)"),
        roughness: z.number().min(0).max(1).describe("Roughness value (0-1)"),
      }),
      func: async ({ nameOrId, metallic, roughness }) => {
        const material = scene.getMaterialByName(nameOrId) || scene.getMaterialById(nameOrId);
        if (!material) {
          return JSON.stringify({ error: `Material "${nameOrId}" not found` });
        }

        if (!(material instanceof PBRMaterial)) {
          return JSON.stringify({ error: `Material "${material.name}" is not a PBR material` });
        }

        material.metallic = metallic;
        material.roughness = roughness;
        material.markAsDirty(1);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Metallic and roughness of material "${material.name}" set to ${metallic} and ${roughness}`,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "set_standard_material_color",
      description: "Sets the diffuse color of a Standard material",
      schema: z.object({
        nameOrId: z.string().describe("The name or id of the Standard material"),
        r: z.number().min(0).max(1).describe("Red component (0-1)"),
        g: z.number().min(0).max(1).describe("Green component (0-1)"),
        b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      }),
      func: async ({ nameOrId, r, g, b }) => {
        const material = scene.getMaterialByName(nameOrId) || scene.getMaterialById(nameOrId);
        if (!material) {
          return JSON.stringify({ error: `Material "${nameOrId}" not found` });
        }

        if (!(material instanceof StandardMaterial)) {
          return JSON.stringify({ error: `Material "${material.name}" is not a Standard material` });
        }

        material.diffuseColor = new Color3(r, g, b);
        material.markAsDirty(1);
        if (onChange) onChange();
        return JSON.stringify({
          success: true,
          message: `Diffuse color of material "${material.name}" set to RGB(${r}, ${g}, ${b})`,
        });
      },
    }),
  ];
}

