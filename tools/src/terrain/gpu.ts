import type { Scene } from "@babylonjs/core/scene";
import type { ThinEngine } from "@babylonjs/core/Engines/thinEngine";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import type { InternalTexture } from "@babylonjs/core/Materials/Textures/internalTexture";

import { Logger } from "@babylonjs/core/Misc/logger";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { RawTexture2DArray } from "@babylonjs/core/Materials/Textures/rawTexture2DArray";

import { computeTerrainMipChain } from "./layer-textures";

export interface ITerrainGpu {
	/** false on engines without a GPU context (NullEngine: !engine.isWebGPU && !engine._gl); every call below is then a no-op or returns null. */
	isAvailable(engine: AbstractEngine): boolean;
	/** Packed RGBA8 rect upload to level 0 of a 2D texture: engine.updateTextureData(internal, packed, x, y, width, height, 0, 0, false) (S7). */
	updateRegion(texture: BaseTexture, packed: Uint8Array, x: number, y: number, width: number, height: number): void;
	/** Full mip chain of a 2D texture: engine.generateMipmaps(internal). */
	generateMips(texture: BaseTexture): void;
	/** RGBA8 RawTexture2DArray (mips, trilinear, wrap, anisotropy) + WebGPU per-layer mip fix (§5.5.3); null when unavailable. */
	createLayerArray(level0: Uint8Array, size: number, layers: number, scene: Scene, name: string, anisotropy: number): RawTexture2DArray | null;
}

/** Engine internals used by the seam that the AbstractEngine declarations don't expose. */
interface ITerrainGpuEngineInternals {
	_gl?: unknown;
	webGLVersion?: number;
	_textureHelper?: {
		generateMipmaps?: (hardwareTexture: unknown, mipLevelCount: number, faceIndex: number, commandEncoder?: unknown) => void;
	};
	_uploadEncoder?: unknown;
}

interface ITerrainGpuInternalTexture {
	_hardwareTexture?: unknown;
	mipLevelCount?: number;
	depth?: number;
	/** Context-restore data of Babylon: level 0 of the array (updateRawTexture2DArray replaces it with the last level it uploads). */
	_bufferView?: ArrayBufferView | null;
	/** Context-restore data of the levels uploaded with updateMipLevel. */
	_bufferViewArray?: (ArrayBufferView | null)[] | null;
}

let invalidRegionWarned = false;

function isTerrainGpuAvailable(engine: AbstractEngine | null | undefined): boolean {
	if (!engine) {
		return false;
	}

	return engine.isWebGPU || !!(engine as unknown as ITerrainGpuEngineInternals)._gl;
}

function getTerrainTextureTarget(texture: BaseTexture): { engine: AbstractEngine; internal: InternalTexture } | null {
	const internal = texture?.getInternalTexture();
	if (!internal) {
		return null;
	}

	const engine = internal.getEngine() ?? texture.getScene()?.getEngine() ?? null;
	if (!isTerrainGpuAvailable(engine)) {
		return null;
	}

	return { engine: engine!, internal };
}

/**
 * Default GPU seam (§5.10): real uploads on WebGL2 / WebGPU, no-ops (or null) on headless engines such as the NullEngine,
 * where `engine.updateTextureData`, `engine.generateMipmaps` and `new RawTexture2DArray` throw.
 */
export const DefaultTerrainGpu: ITerrainGpu = {
	isAvailable(engine: AbstractEngine): boolean {
		return isTerrainGpuAvailable(engine);
	},

	updateRegion(texture: BaseTexture, packed: Uint8Array, x: number, y: number, width: number, height: number): void {
		const target = getTerrainTextureTarget(texture);
		if (!target || width <= 0 || height <= 0) {
			return;
		}

		const { engine, internal } = target;
		const valid =
			Number.isInteger(x) &&
			Number.isInteger(y) &&
			Number.isInteger(width) &&
			Number.isInteger(height) &&
			x >= 0 &&
			y >= 0 &&
			x + width <= internal.width &&
			y + height <= internal.height &&
			packed.length >= width * height * 4;

		if (!valid) {
			if (!invalidRegionWarned) {
				invalidRegionWarned = true;
				Logger.Warn(`[Terrain] Ignored an invalid texture region upload (${x}, ${y}, ${width} x ${height}) on “${texture.name}”.`);
			}
			return;
		}

		// updateTextureData is declared by ThinEngine and WebGPUEngine, not by AbstractEngine.
		const gpuEngine = engine as unknown as ThinEngine;
		if (typeof gpuEngine.updateTextureData !== "function") {
			return;
		}

		// Packed data is mandatory and invertY must be false (S7): row y of the data lands on texel row y.
		gpuEngine.updateTextureData(internal, packed, x, y, width, height, 0, 0, false);
	},

	generateMips(texture: BaseTexture): void {
		const target = getTerrainTextureTarget(texture);
		if (!target) {
			return;
		}

		target.engine.generateMipmaps(target.internal);
	},

	createLayerArray(level0: Uint8Array, size: number, layers: number, scene: Scene, name: string, anisotropy: number): RawTexture2DArray | null {
		const engine = scene?.getEngine();
		if (!engine || !isTerrainGpuAvailable(engine) || (!engine.isWebGPU && ((engine as unknown as ITerrainGpuEngineInternals).webGLVersion ?? 0) < 2)) {
			return null; // Texture arrays need WebGL2 or WebGPU.
		}

		if (size < 1 || layers < 1 || level0.length < size * size * layers * 4) {
			return null;
		}

		let texture: RawTexture2DArray | null = null;
		try {
			texture = new RawTexture2DArray(
				level0,
				size,
				size,
				layers,
				Constants.TEXTUREFORMAT_RGBA,
				scene,
				true /* mips */,
				false /* invertY */,
				Texture.TRILINEAR_SAMPLINGMODE,
				Constants.TEXTURETYPE_UNSIGNED_BYTE
			);

			texture.name = name; // No file extension: the editor's preview KTX pass skips it.
			texture.wrapU = Texture.WRAP_ADDRESSMODE;
			texture.wrapV = Texture.WRAP_ADDRESSMODE;
			texture.anisotropicFilteringLevel = Math.max(1, Math.min(16, Math.round(anisotropy) || 1));

			generateTerrainArrayMipmapsWebGPU(engine, texture, level0);

			return texture;
		} catch (e) {
			texture?.dispose();
			Logger.Warn(`[Terrain] Can't create the texture array “${name}” (${size} x ${size} x ${layers}): ${e instanceof Error ? e.message : String(e)}`);
			return null;
		}
	},
};

/** WebGPU only: builds mips of every array layer (§5.5.3). No-op on WebGL. */
export function generateTerrainArrayMipmapsWebGPU(engine: AbstractEngine, texture: RawTexture2DArray, level0: Uint8Array): void {
	if (!engine?.isWebGPU) {
		return; // WebGL2 gl.generateMipmap covers every layer; updateMipLevel is broken there (S5).
	}

	const internal = texture.getInternalTexture() as (InternalTexture & ITerrainGpuInternalTexture) | null;
	if (!internal) {
		return;
	}

	const depth = internal.depth ?? texture.depth;
	const mipLevelCount = internal.mipLevelCount ?? 1;
	if (depth < 2 || mipLevelCount < 2) {
		return; // Babylon already generated the mips of layer 0; nothing to do without mips.
	}

	const internals = engine as unknown as ITerrainGpuEngineInternals;
	const helper = internals._textureHelper;
	if (internal._hardwareTexture && typeof helper?.generateMipmaps === "function") {
		// Fix A (verified): Babylon generates the chain of layer 0 only.
		for (let layer = 1; layer < depth; ++layer) {
			helper.generateMipmaps(internal._hardwareTexture, mipLevelCount, layer, internals._uploadEncoder);
		}
		return;
	}

	// Fix B (verified on WebGPU): upload a CPU box-filtered chain of every layer.
	const size = texture.getSize().width;
	if (level0.length < size * size * depth * 4) {
		return;
	}

	const chain = computeTerrainMipChain(level0, size, depth);
	uploadTerrainMipChain(texture, internal, chain, level0);

	// updateMipLevel writes at once (queue.writeTexture) while the mips Babylon generated for layer 0 when it created the array are still
	// recorded in the upload encoder, submitted at the end of the frame: they would overwrite the box-filtered levels of layer 0 (±1
	// differences with the other layers). The chain is uploaded again once that frame is submitted.
	engine.onEndFrameObservable?.addOnce(() => {
		try {
			uploadTerrainMipChain(texture, internal, chain, level0);
		} catch (e) {
			Logger.Warn(`[Terrain] Can't upload the mipmaps of “${texture.name}”: ${e instanceof Error ? e.message : String(e)}`);
		}
	});
}

/** Uploads levels 1..n of every layer, then restores Babylon's context-restore data to level 0 (the plugin re-runs the fix after a restore). */
function uploadTerrainMipChain(texture: RawTexture2DArray, internal: InternalTexture & ITerrainGpuInternalTexture, chain: Uint8Array[], level0: Uint8Array): void {
	if (texture.getInternalTexture() !== internal) {
		return; // Disposed or re-created meanwhile.
	}

	chain.forEach((level, index) => texture.updateMipLevel(level, index + 1));

	// updateRawTexture2DArray(level n) makes the LAST level the data Babylon re-creates the array from after a context loss.
	if (internal._bufferViewArray) {
		internal._bufferView = level0;
		internal._bufferViewArray = null;
	}
}
