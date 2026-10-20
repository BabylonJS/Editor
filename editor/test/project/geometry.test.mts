import { describe, expect, test } from "vitest";

import { writeBinaryGeometry } from "../../src/project/tools/geometry";

/**
 * The keys here are not interchangeable and the two spellings both exist in
 * Babylon: `Geometry.serializeVerticeData` writes `uvs`, `uvs2`, `uvs3`...
 * while `MorphTarget.serialize` writes `uv2s`. Reading geometry with the morph
 * target's spelling makes the branch dead code rather than an error, so the
 * second uv set disappears from every saved and exported scene without a word -
 * and lightmaps go with it, being the one texture that needs a second set.
 */
describe("project/tools/geometry", () => {
	const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
	const uvs = [0, 0, 1, 0, 0, 1];
	const uvs2 = [0, 0, 0.5, 0, 0, 0.5];

	test("writes the second uv set under the key Babylon serializes it as", async () => {
		const mesh: any = { _binaryInfo: {} };

		await writeBinaryGeometry({ path: "", write: false, mesh, geometry: { positions, uvs, uvs2 } });

		expect(mesh._binaryInfo.uvs2AttrDesc).toBeDefined();
		expect(mesh._binaryInfo.uvs2AttrDesc.count).toBe(uvs2.length);
		expect(mesh._binaryInfo.uvs2AttrDesc.stride).toBe(2);
		expect(mesh.hasUVs2).toBe(true);
	});

	test("ignores the morph target spelling, which carries different data", async () => {
		const mesh: any = { _binaryInfo: {} };

		await writeBinaryGeometry({ path: "", write: false, mesh, geometry: { positions, uvs, uv2s: uvs2 } });

		expect(mesh._binaryInfo.uvs2AttrDesc).toBeUndefined();
		expect(mesh.hasUVs2).toBeUndefined();
	});

	test("counts the second uv set in the offsets of everything written after it", async () => {
		const tangents = [0, 0, 1, 0, 0, 1, 0, 0, 1];

		const withUvs2: any = { _binaryInfo: {} };
		await writeBinaryGeometry({ path: "", write: false, mesh: withUvs2, geometry: { positions, uvs, uvs2, tangents } });

		const withoutUvs2: any = { _binaryInfo: {} };
		await writeBinaryGeometry({ path: "", write: false, mesh: withoutUvs2, geometry: { positions, uvs, tangents } });

		const shift = withUvs2._binaryInfo.tangetsAttrDesc.offset - withoutUvs2._binaryInfo.tangetsAttrDesc.offset;
		expect(shift).toBe(uvs2.length * Float32Array.BYTES_PER_ELEMENT);
	});

	test("leaves the descriptor out when the geometry has no second uv set", async () => {
		const mesh: any = { _binaryInfo: {} };

		await writeBinaryGeometry({ path: "", write: false, mesh, geometry: { positions, uvs } });

		expect(mesh._binaryInfo.uvsAttrDesc).toBeDefined();
		expect(mesh._binaryInfo.uvs2AttrDesc).toBeUndefined();
	});
});
