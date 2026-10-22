import { describe, expect, test, vi } from "vitest";

import { Material, Mesh, SceneContext } from "@babylonjs/lite";

import { DepthRendererPass, IDepthRendererPassOptions } from "../../src/rendering/post-process/depth-renderer";
import { _getMeshPassMaterial, IMeshPassMaterial } from "../../src/rendering/post-process/mesh-materials";
import { _sortMeshPassDraws, IMeshPassDraw } from "../../src/rendering/post-process/mesh-pass";
import { PrePassMeshRenderer } from "../../src/rendering/post-process/pre-pass";

// The serialized Babylon.js materials are stored by the loader of the materials.
const { serializedMaterials } = vi.hoisted(() => ({ serializedMaterials: new Map<unknown, any>() }));
vi.mock("../../src/loading/material", () => ({
	_getSerializedMaterialData: (material: unknown) => serializedMaterials.get(material) ?? null,
}));

function createMaterial(data: any, textures: Record<string, unknown> = {}): Material {
	const material = { ...textures } as unknown as Material;
	if (data) {
		serializedMaterials.set(material, data);
	}

	return material;
}

function createMesh(material: Material, options: { uv2?: boolean; hasVertexAlpha?: boolean; position?: number[] } = {}): Mesh {
	const [x, y, z] = options.position ?? [0, 0, 0];
	return {
		material,
		hasVertexAlpha: options.hasVertexAlpha,
		boundMin: [-1, -1, -1],
		boundMax: [1, 1, 1],
		worldMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
		_gpu: { uv2Buffer: options.uv2 ? {} : null },
	} as unknown as Mesh;
}

const pbr = (data: any) => ({ customType: "BABYLON.PBRMaterial", ...data });

describe("rendering/post-process/mesh-pass", () => {
	describe("materials", () => {
		test("should not read the textures of the opaque materials", () => {
			const material = _getMeshPassMaterial(createMesh(createMaterial(pbr({ albedoTexture: { name: "albedo" } }), { baseColorTexture: {} })));

			expect(material.type).toBe("pbr");
			expect(material.transparent).toBe(false);
			expect(material.alphaTest).toBe(false);
			expect(material.diffuse).toBeNull();
			expect(material.opacity).toBeNull();
			expect(material.alpha).toBe(1);
			expect(material.alphaCutOff).toBe(0.4);
		});

		test("should read the alpha of the base color texture of the transparent PBR materials", () => {
			const baseColorTexture = { invertY: true };
			const material = _getMeshPassMaterial(createMesh(createMaterial(pbr({ alpha: 0.5, alphaCutOff: 0.3, albedoTexture: { uScale: 2 } }), { baseColorTexture })));

			expect(material.transparent).toBe(true);
			expect(material.alpha).toBe(0.5);
			expect(material.alphaCutOff).toBe(0.3);
			expect(material.diffuse?.texture).toBe(baseColorTexture);
			expect(material.diffuse?.matrix[0]).toBe(2);
			expect(material.diffuse?.uv2).toBe(false);
		});

		test("should test the alpha of the albedo textures with an alpha channel", () => {
			const data = pbr({ albedoTexture: { hasAlpha: true, coordinatesIndex: 1 } });

			const withUv2 = _getMeshPassMaterial(createMesh(createMaterial(data, { baseColorTexture: {} }), { uv2: true }));
			expect(withUv2.alphaTest).toBe(true);
			expect(withUv2.transparent).toBe(false);
			expect(withUv2.diffuse?.uv2).toBe(true);

			// The second set of texture coordinates is read only when the mesh has one.
			const withoutUv2 = _getMeshPassMaterial(createMesh(createMaterial(data, { baseColorTexture: {} })));
			expect(withoutUv2.diffuse?.uv2).toBe(false);
		});

		test("should read the opacity textures of the standard materials as Babylon.js does", () => {
			const opacityTexture = {};
			const material = _getMeshPassMaterial(createMesh(createMaterial({ opacityTexture: { getAlphaFromRGB: true, level: 0.5 } }, { _opacityTexture: opacityTexture })));

			expect(material.type).toBe("standard");
			expect(material.transparent).toBe(true);
			expect(material.diffuse).toBeNull();
			expect(material.opacity).toMatchObject({ texture: opacityTexture, rgb: true, level: 0.5 });
		});

		test("should read the alpha of the diffuse texture combined with the opacity texture by Babylon Lite", () => {
			const combined = {};
			const data = { diffuseTexture: { hasAlpha: true }, useAlphaFromDiffuseTexture: true, opacityTexture: { level: 0.7 } };
			const material = _getMeshPassMaterial(createMesh(createMaterial(data, { diffuseTexture: {}, _opacityTexture: combined })));

			expect(material.transparent).toBe(true);
			expect(material.diffuse).toBeNull();
			expect(material.opacity).toMatchObject({ texture: combined, rgb: false, level: 1 });
		});

		test("should describe the culling, the vertex alpha and the other materials", () => {
			const doubleSided = _getMeshPassMaterial(createMesh(createMaterial(pbr({ backFaceCulling: false, transparencyMode: 2 })), { hasVertexAlpha: true }));
			expect(doubleSided.doubleSided).toBe(true);
			expect(doubleSided.vertexAlpha).toBe(true);

			const opaqueVertexAlpha = _getMeshPassMaterial(createMesh(createMaterial(pbr({ transparencyMode: 0 })), { hasVertexAlpha: true }));
			expect(opaqueVertexAlpha.vertexAlpha).toBe(false);

			const other = _getMeshPassMaterial(createMesh(createMaterial(null)));
			expect(other.type).toBe("other");
			expect(other.transparent).toBe(false);
		});

		test("should describe the material again when it changes", () => {
			const mesh = createMesh(createMaterial(pbr({})));
			expect(_getMeshPassMaterial(mesh).transparent).toBe(false);

			mesh.material = createMaterial(pbr({ alpha: 0.2 }));
			expect(_getMeshPassMaterial(mesh).transparent).toBe(true);
		});
	});

	describe("depth renderer", () => {
		test("should draw the meshes as the depth renderer of Babylon.js does", () => {
			const meshes = [
				createMesh(createMaterial(pbr({ alpha: 0.5 })), { position: [0, 0, 1] }),
				createMesh(createMaterial(pbr({ albedoTexture: { hasAlpha: true } }), { baseColorTexture: {} }), { position: [0, 0, 2] }),
				createMesh(createMaterial(pbr({})), { position: [0, 0, 3] }),
				createMesh(createMaterial(pbr({ disableDepthWrite: true })), { position: [0, 0, 4] }),
				createMesh(createMaterial({ opacityTexture: { level: 0.5 } }, { _opacityTexture: {} }), { position: [0, 0, 5] }),
			];

			const scene = { surface: { engine: {} }, meshes } as unknown as SceneContext;
			const pass = new DepthRendererPass(scene, "depth");
			const options: IDepthRendererPassOptions = { output: "depthMetric", format: "r16float", width: 4, height: 4, reverseCulling: false, transparentMeshes: false };
			const cameraWorld = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -10, 1];

			// The transparent meshes and the materials not writing the depth are skipped, the opaque meshes are drawn first.
			const draws: IMeshPassDraw[] = (pass as any)._getDraws(cameraWorld, options);
			expect(draws.map((draw) => meshes.indexOf(draw.mesh))).toEqual([2, 1]);

			// Alpha tested with the alpha of the alpha test texture only (0.4), without blending.
			const alphaTested = draws[1];
			expect(alphaTested.material.alphaTest).toBe(true);
			expect(alphaTested.material.diffuse).not.toBeNull();
			expect(alphaTested.material.opacity).toBeNull();
			expect(alphaTested.alpha).toBe(1);
			expect(alphaTested.alphaCutOff).toBe(0.4);
			expect(draws[0].material.diffuse).toBeNull();

			// "forceDepthWriteTransparentMeshes": the transparent meshes are drawn last, from back to front, without blending.
			const transparentDraws: IMeshPassDraw[] = (pass as any)._getDraws(cameraWorld, { ...options, transparentMeshes: true, reverseCulling: true });
			expect(transparentDraws.map((draw) => meshes.indexOf(draw.mesh))).toEqual([2, 1, 4, 0]);
			expect(transparentDraws.every((draw) => !draw.material.transparent && draw.reverseCulling)).toBe(true);
		});
	});

	describe("pre-pass", () => {
		test("should create the textures of the pre-pass of Babylon.js", () => {
			vi.stubGlobal("GPUTextureUsage", { TEXTURE_BINDING: 4, RENDER_ATTACHMENT: 16 });

			const created: GPUTextureDescriptor[] = [];
			const device = {
				createTexture: (descriptor: GPUTextureDescriptor) => {
					created.push(descriptor);
					const size = descriptor.size as GPUExtent3DDict;
					return { width: size.width, height: size.height, createView: () => ({}), destroy: () => {} };
				},
			};

			const scene = { surface: { engine: { _device: device }, canvas: { width: 8, height: 4 } }, meshes: [] } as unknown as SceneContext;
			const renderer = new PrePassMeshRenderer(scene);

			renderer.update({ velocity: true, linearVelocity: false, screenDepth: true });
			expect(renderer.textures.velocity).toMatchObject({ format: "rgba8unorm", width: 8, height: 4 });
			expect(renderer.textures.linearVelocity).toBeNull();
			expect(renderer.textures.screenDepth).toMatchObject({ format: "r16float", width: 8, height: 4 });
			expect(created.map((descriptor) => descriptor.format)).toEqual(["rgba8unorm", "r16float", "depth24plus"]);

			// The textures are kept while their size doesn't change.
			renderer.update({ velocity: true, linearVelocity: true, screenDepth: false });
			expect(renderer.textures.linearVelocity).toMatchObject({ format: "rgba16float" });
			expect(renderer.textures.screenDepth).toBeNull();
			expect(created.length).toBe(4);

			vi.unstubAllGlobals();
		});
	});

	describe("sort", () => {
		test("should sort the meshes as Babylon.js renders them", () => {
			const opaque = { transparent: false, alphaTest: false } as IMeshPassMaterial;
			const alphaTest = { transparent: false, alphaTest: true } as IMeshPassMaterial;
			const transparent = { transparent: true, alphaTest: false } as IMeshPassMaterial;

			const draw = (name: string, material: IMeshPassMaterial, position: number[]): IMeshPassDraw & { name: string } => ({
				name,
				mesh: createMesh(createMaterial(null), { position }),
				material,
				alpha: 1,
				alphaCutOff: 0.4,
				writeColor: true,
			});

			const draws = [
				draw("near", transparent, [0, 0, 1]),
				draw("tested", alphaTest, [0, 0, 5]),
				draw("far", transparent, [0, 0, 10]),
				draw("opaque", opaque, [0, 0, 20]),
				draw("middle", transparent, [0, 0, 4]),
			];

			const cameraWorld = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -10, 1];
			const sorted = _sortMeshPassDraws(draws, cameraWorld) as (IMeshPassDraw & { name: string })[];

			expect(sorted.map((d) => d.name)).toEqual(["opaque", "tested", "far", "middle", "near"]);
		});
	});
});
