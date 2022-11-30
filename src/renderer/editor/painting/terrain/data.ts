import { Nullable } from "../../../../shared/types";

import { Geometry, GroundMesh, IndicesArray, VertexBuffer, VertexData } from "babylonjs";

import { Tools } from "../../tools/tools";

export interface ITerrainPainterData {
    mesh: GroundMesh;
    geometry: Geometry;

    positions: VertexBuffer;

    uvs: Nullable<VertexBuffer>;
    normals: Nullable<VertexBuffer>;
    indices: Nullable<IndicesArray>;
}

export function configureTerrainAndData(mesh: GroundMesh): Nullable<ITerrainPainterData> {
    if (!mesh.geometry || !mesh.geometry.isVerticesDataPresent(VertexBuffer.PositionKind)) {
        return null;
    }

    const geometry = new Geometry(Tools.RandomId(), mesh.getScene(), undefined, true);

    const serializedGeometry = mesh.geometry.serializeVerticeData();
    VertexData.ImportVertexData(serializedGeometry, geometry);

    geometry.applyToMesh(mesh);

    return {
        mesh,
        geometry,

        indices: geometry.getIndices(),

        uvs: geometry.getVertexBuffer(VertexBuffer.UVKind),
        normals: geometry.getVertexBuffer(VertexBuffer.NormalKind),
        positions: geometry.getVertexBuffer(VertexBuffer.PositionKind)!,
    };
}

export function computeTerrainNormals(data: ITerrainPainterData): void {
    const normals = data.normals?.getData();
    if (!normals || !data.mesh || !data.positions || !data.indices || !data.normals) {
        return;
    }

    VertexData.ComputeNormals(data.positions.getData(), data.indices, normals);

    data.geometry.updateVerticesDataDirectly(VertexBuffer.NormalKind, normals, 0, false);
}
