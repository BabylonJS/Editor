import { Scalar, Vector3, VertexBuffer } from "babylonjs";

import { ITerrainPainterData } from "./data";
import { TerrainSculptPainter } from "./sculpt";

export function paintTerrainElevation(data: ITerrainPainterData, painter: TerrainSculptPainter, center: Vector3): void {
    const radius = painter._size * 0.5;
    const strength = painter._strength * 0.01;

    const position = Vector3.Zero();
    const positions = data.positions.getData() as number[] | Float32Array;

    for (let i = 0, len = positions.length; i < len; i += 3) {
        position.set(positions[i], positions[i + 1], positions[i + 2]);

        const distance = Vector3.Distance(position, center);
        if (distance > radius) {
            continue;
        }

        const amount = Math.min((distance / radius) * (1 - painter._attenuation), 1);
        let offset = Scalar.Lerp(0, strength, 1 - amount);

        if (painter._brushData?.data) {
            const x = (((position.x - center.x + radius) * painter._brushData.width) / radius) >> 0;
            const y = (((position.z - center.z + radius) * painter._brushData.height) / radius) >> 0;

            const value = painter._brushData.data[(y * painter._brushData.width) + (x * 4)];
            offset *= value / 255;
        }

        if (painter._elevating) {
            positions[i + 1] += offset;
        } else {
            positions[i + 1] -= offset;
        }
    }

    data.geometry.updateVerticesDataDirectly(VertexBuffer.PositionKind, positions, 0, false);
}
