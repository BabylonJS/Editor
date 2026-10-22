/**
 * Defines the uniforms of the scene written by a render task of Babylon Lite: the view projection matrix is stored in
 * the first 16 floats (column-major).
 */
export interface ILiteSceneUniforms {
	readonly buffer: GPUBuffer;
	readonly data: Float32Array;
}

const jitteredViewProjection = new Float32Array(16);

/**
 * Writes the view projection matrix of the given scene uniforms of Babylon Lite into their buffer, offset in clip space
 * ("clip.xy += offset * clip.w"): same as the jitter Babylon.js stores in the projection matrix of the camera. The data
 * of the uniforms is not modified, so writing an offset of 0 restores the matrix.
 * @param device defines the reference to the device of the engine.
 * @param uniforms defines the uniforms of the scene of the task to offset.
 * @param x defines the offset on the x axis, in clip space.
 * @param y defines the offset on the y axis, in clip space.
 */
export function _writeJitteredViewProjection(device: GPUDevice, uniforms: ILiteSceneUniforms, x: number, y: number): void {
	const data = uniforms.data;

	for (let column = 0; column < 4; ++column) {
		const offset = column * 4;
		const w = data[offset + 3];

		jitteredViewProjection[offset] = data[offset] + x * w;
		jitteredViewProjection[offset + 1] = data[offset + 1] + y * w;
		jitteredViewProjection[offset + 2] = data[offset + 2];
		jitteredViewProjection[offset + 3] = w;
	}

	device.queue.writeBuffer(uniforms.buffer, 0, jitteredViewProjection);
}
