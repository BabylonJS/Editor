import { join } from "node:path/posix";

import fs from "fs-extra";

import { readSceneDirectories } from "../tools/scene.mjs";

export interface ICreateGeometryFilesOptions {
	sceneFile: string;
	sceneName: string;
	publicDir: string;
	geometryFiles: string[];
	exportedAssets: string[];
	babylonjsEditorToolsVersion: string;

	mergeGeometries?: boolean;

	directories: Awaited<ReturnType<typeof readSceneDirectories>>;
}

export async function createGeometryFiles(options: ICreateGeometryFilesOptions) {
	if (!options.mergeGeometries) {
		await fs.ensureDir(join(options.publicDir, options.sceneName));

		await Promise.all(
			options.geometryFiles.map(async (file) => {
				const destination = join(options.publicDir, options.sceneName, file);
				await fs.copyFile(join(options.sceneFile, "geometries", file), destination);
				options.exportedAssets.push(destination);
			})
		);
	}

	if (options.babylonjsEditorToolsVersion >= "5.2.6") {
		await fs.ensureDir(join(options.publicDir, options.sceneName, "morphTargets"));

		await Promise.all(
			options.directories.morphTargetFiles.map(async (file) => {
				const destination = join(options.publicDir, options.sceneName, "morphTargets", file);
				await fs.copyFile(join(options.sceneFile, "morphTargets", file), destination);
				options.exportedAssets.push(destination);
			})
		);
	}
}

export function configureMeshBinaryInfo(mesh: any, geometriesOffset: number) {
	if (!mesh._binaryInfo) {
		return {
			offset: 0,
		};
	}

	let offset = 0;

	if (mesh._binaryInfo.positionsAttrDesc) {
		mesh._binaryInfo.positionsAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.positionsAttrDesc.count * Float32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.normalsAttrDesc) {
		mesh._binaryInfo.normalsAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.normalsAttrDesc.count * Float32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.uvsAttrDesc) {
		mesh._binaryInfo.uvsAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.uvsAttrDesc.count * Float32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.uvs2AttrDesc) {
		mesh._binaryInfo.uvs2AttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.uvs2AttrDesc.count * Float32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.tangetsAttrDesc) {
		mesh._binaryInfo.tangetsAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.tangetsAttrDesc.count * Float32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.colorsAttrDesc) {
		mesh._binaryInfo.colorsAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.colorsAttrDesc.count * Float32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.matricesIndicesAttrDesc) {
		mesh._binaryInfo.matricesIndicesAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.matricesIndicesAttrDesc.count * Uint32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.matricesWeightsAttrDesc) {
		mesh._binaryInfo.matricesWeightsAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.matricesWeightsAttrDesc.count * Float32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.indicesAttrDesc) {
		mesh._binaryInfo.indicesAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.indicesAttrDesc.count * Uint32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.subMeshesAttrDesc) {
		mesh._binaryInfo.subMeshesAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.subMeshesAttrDesc.count * 5 * Uint32Array.BYTES_PER_ELEMENT;
	}

	return {
		offset,
	};
}

export function getGeometryBuffers(binaryInfo: any, buffer: Buffer) {
	const result: {
		positions?: Float32Array;
		normals?: Float32Array;
		tangents?: Float32Array;
		uvs?: Float32Array;
		uvs2?: Float32Array;
		colors?: Float32Array;
		matricesIndices?: Uint32Array;
		matricesWeights?: Float32Array;
		indices?: Uint32Array;
		subMeshes?: Int32Array;
	} = {};

	if (binaryInfo.positionsAttrDesc) {
		result.positions = new Float32Array(buffer.buffer, binaryInfo.positionsAttrDesc.offset, binaryInfo.positionsAttrDesc.count);
	}

	if (binaryInfo.normalsAttrDesc) {
		result.normals = new Float32Array(buffer.buffer, binaryInfo.normalsAttrDesc.offset, binaryInfo.normalsAttrDesc.count);
	}

	if (binaryInfo.tangetsAttrDesc) {
		result.tangents = new Float32Array(buffer.buffer, binaryInfo.tangetsAttrDesc.offset, binaryInfo.tangetsAttrDesc.count);
	}

	if (binaryInfo.uvsAttrDesc) {
		result.uvs = new Float32Array(buffer.buffer, binaryInfo.uvsAttrDesc.offset, binaryInfo.uvsAttrDesc.count);
	}

	if (binaryInfo.uvs2AttrDesc) {
		result.uvs2 = new Float32Array(buffer.buffer, binaryInfo.uvs2AttrDesc.offset, binaryInfo.uvs2AttrDesc.count);
	}

	if (binaryInfo.colorsAttrDesc) {
		result.colors = new Float32Array(buffer.buffer, binaryInfo.colorsAttrDesc.offset, binaryInfo.colorsAttrDesc.count);
	}

	if (binaryInfo.matricesIndicesAttrDesc) {
		const matricesIndices = new Uint32Array(buffer.buffer, binaryInfo.matricesIndicesAttrDesc.offset, binaryInfo.matricesIndicesAttrDesc.count);
		const floatIndices: number[] = [];
		for (let i = 0; i < matricesIndices.length; i++) {
			const index = matricesIndices[i];
			floatIndices.push(index & 0x000000ff);
			floatIndices.push((index & 0x0000ff00) >> 8);
			floatIndices.push((index & 0x00ff0000) >> 16);
			floatIndices.push((index >> 24) & 0xff); // & 0xFF to convert to v + 256 if v < 0
		}
		result.matricesIndices = new Uint32Array(floatIndices);
	}

	if (binaryInfo.matricesWeightsAttrDesc) {
		result.matricesWeights = new Float32Array(buffer.buffer, binaryInfo.matricesWeightsAttrDesc.offset, binaryInfo.matricesWeightsAttrDesc.count);
	}

	if (binaryInfo.indicesAttrDesc) {
		result.indices = new Uint32Array(buffer.buffer, binaryInfo.indicesAttrDesc.offset, binaryInfo.indicesAttrDesc.count);
	}

	if (binaryInfo.subMeshesAttrDesc) {
		result.subMeshes = new Int32Array(buffer.buffer, binaryInfo.subMeshesAttrDesc.offset, binaryInfo.subMeshesAttrDesc.count * 5);
	}

	return result;
}
