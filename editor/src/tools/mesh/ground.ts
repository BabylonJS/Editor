import { Mesh, FloatArray, IndicesArray, VertexBuffer, VertexData } from "babylonjs";

export interface ISmoothGroundGeometryOptions {
	ground: Mesh;
	smoothFactor: number;
	subdivisions: number;

	indices?: IndicesArray | null;
	normals?: FloatArray | null;
	positions?: FloatArray | null;
}

export function smoothGroundGeometry(options: ISmoothGroundGeometryOptions) {
	const positions = options.positions ?? options.ground.geometry?.getVerticesData(VertexBuffer.PositionKind, false);
	if (!positions) {
		return;
	}

	const smoothFactor = options.smoothFactor;
	const subdivisions = options.subdivisions;

	for (let run = 0; run < smoothFactor; ++run) {
		let yd = subdivisions;

		for (let y = 1; y < subdivisions - 1; ++y) {
			for (let x = 1; x < subdivisions - 1; ++x) {
				const idxCenter = (x + yd) * 3 + 1; // index du Y dans le buffer flat

				const idxLeft = (x - 1 + yd) * 3 + 1;
				const idxRight = (x + 1 + yd) * 3 + 1;
				const idxAbove = (x + yd - subdivisions) * 3 + 1;
				const idxBelow = (x + yd + subdivisions) * 3 + 1;

				positions[idxCenter] = (positions[idxLeft] + positions[idxRight] + positions[idxAbove] + positions[idxBelow]) * 0.25;
			}

			yd += subdivisions;
		}
	}

	if (!options.positions) {
		options.ground.geometry?.setVerticesData(VertexBuffer.PositionKind, positions, false);
	}

	const indices = options.indices ?? options.ground.geometry?.getIndices(false);
	const normals = options.normals ?? options.ground.geometry?.getVerticesData(VertexBuffer.NormalKind, false);
	if (normals && indices) {
		VertexData.ComputeNormals(positions, indices, normals);

		if (!options.normals) {
			options.ground.geometry?.setVerticesData(VertexBuffer.NormalKind, normals, false);
		}
	}
}
