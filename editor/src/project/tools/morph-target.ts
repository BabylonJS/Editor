import { createWriteStream } from "fs";

export async function writeBinaryMorphTarget(path: string, morphTarget: any): Promise<void> {
	const stream = createWriteStream(path);

	let offset = 0;

	if (morphTarget.positions) {
		morphTarget.positionsOffset = offset;

		stream?.write(Buffer.from(new Float32Array(morphTarget.positions).buffer));
		offset += morphTarget.positions.length * Float32Array.BYTES_PER_ELEMENT;

		morphTarget.positionsCount = morphTarget.positions.length;
		morphTarget.positions = null;
	}

	if (morphTarget.normals) {
		morphTarget.normalsOffset = offset;

		stream?.write(Buffer.from(new Float32Array(morphTarget.normals).buffer));
		offset += morphTarget.normals.length * Float32Array.BYTES_PER_ELEMENT;

		morphTarget.normalsCount = morphTarget.normals.length;
		morphTarget.normals = null;
	}

	if (morphTarget.tangents) {
		morphTarget.tangentsOffset = offset;

		stream?.write(Buffer.from(new Float32Array(morphTarget.tangents).buffer));
		offset += morphTarget.tangents.length * Float32Array.BYTES_PER_ELEMENT;

		morphTarget.tangentsCount = morphTarget.tangents.length;
		morphTarget.tangents = null;
	}

	if (morphTarget.uvs) {
		morphTarget.uvsOffset = offset;

		stream?.write(Buffer.from(new Float32Array(morphTarget.uvs).buffer));
		offset += morphTarget.uvs.length * Float32Array.BYTES_PER_ELEMENT;

		morphTarget.uvsCount = morphTarget.uvs.length;
		morphTarget.uvs = null;
	}

	if (morphTarget.uv2s) {
		morphTarget.uv2sOffset = offset;

		stream?.write(Buffer.from(new Float32Array(morphTarget.uv2s).buffer));
		offset += morphTarget.uv2s.length * Float32Array.BYTES_PER_ELEMENT;

		morphTarget.uv2sCount = morphTarget.uv2s.length;
		morphTarget.uv2s = null;
	}

	if (stream) {
		await new Promise<void>((resolve) => {
			stream.once("close", () => resolve());
			stream.end();
			stream.close();
		});
	}
}
