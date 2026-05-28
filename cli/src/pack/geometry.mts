import { join } from "node:path/posix";

import fs from "fs-extra";

import { readSceneDirectories } from "../tools/scene.mjs";

export interface ICreateGeometryFilesOptions {
	sceneFile: string;
	sceneName: string;
	publicDir: string;
	exportedAssets: string[];
	babylonjsEditorToolsVersion: string;

	directories: Awaited<ReturnType<typeof readSceneDirectories>>;
}

export async function createGeometryFiles(options: ICreateGeometryFilesOptions) {
	await fs.ensureDir(join(options.publicDir, options.sceneName));

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
		return 0;
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
		offset += mesh._binaryInfo.matricesIndicesAttrDesc.count * Int32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.matricesWeightsAttrDesc) {
		mesh._binaryInfo.matricesWeightsAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.matricesWeightsAttrDesc.count * Float32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.indicesAttrDesc) {
		mesh._binaryInfo.indicesAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.indicesAttrDesc.count * Int32Array.BYTES_PER_ELEMENT;
	}

	if (mesh._binaryInfo.subMeshesAttrDesc) {
		mesh._binaryInfo.subMeshesAttrDesc.offset += geometriesOffset;
		offset += mesh._binaryInfo.subMeshesAttrDesc.count * 5 * Int32Array.BYTES_PER_ELEMENT;
	}

	return offset;
}
