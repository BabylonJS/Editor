import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { Scene } from "@babylonjs/core/scene";
import type { IGeometryFactory, IGeometry, IData } from "../types";
import { Nullable } from "@babylonjs/core/types";
import { Tools } from "@babylonjs/core/Misc/tools";

/**
 * Factory for creating meshes from Three.js geometry data
 */
export class GeometryFactory implements IGeometryFactory {
	private _data: IData;

	constructor(data: IData) {
		this._data = data;
	}

	/**
	 * Create a mesh from geometry ID
	 */
	public createMesh(geometryId: string, name: string, scene: Scene): Mesh {
		const geometryData = this._findGeometry(geometryId);
		if (!geometryData) {
			return new Mesh(name, scene);
		}

		const mesh = this._createMeshFromGeometry(geometryData, name, scene);
		if (!mesh) {
			Tools.Warn(`Failed to create mesh from geometry ${geometryId}`);
			return new Mesh(name, scene);
		}

		return mesh;
	}

	/**
	 * Create or load particle mesh for SPS
	 * Tries to load geometry if specified, otherwise creates default plane
	 */
	public createParticleMesh(config: { instancingGeometry?: string }, name: string, scene: Scene): Mesh {
		let particleMesh = this._loadParticleGeometry(config, name, scene);

		if (!particleMesh) {
			particleMesh = this._createDefaultPlaneMesh(name, scene);
		}

		if (!particleMesh) {
			Tools.Warn(`Cannot create particle mesh: particleMesh is null`);
		}

		return particleMesh;
	}

	/**
	 * Loads particle geometry if specified
	 */
	private _loadParticleGeometry(config: { instancingGeometry?: string }, name: string, scene: Scene): Nullable<Mesh> {
		if (!config.instancingGeometry) {
			return null;
		}

		const mesh = this.createMesh(config.instancingGeometry, name + "_shape", scene);
		if (!mesh) {
			Tools.Warn(`Failed to load geometry ${config.instancingGeometry}, will create default plane`);
		}

		return mesh;
	}

	/**
	 * Creates default plane mesh
	 */
	private _createDefaultPlaneMesh(name: string, scene: Scene): Mesh {
		return CreatePlane(name + "_shape", { width: 1, height: 1 }, scene);
	}

	/**
	 * Finds geometry by UUID
	 */
	private _findGeometry(geometryId: string): IGeometry | null {
		if (!this._data.geometries || this._data.geometries.length === 0) {
			Tools.Warn("No geometries data available");
			return null;
		}

		const geometry = this._data.geometries.find((g) => g.uuid === geometryId);
		if (!geometry) {
			Tools.Warn(`Geometry not found: ${geometryId}`);
			return null;
		}

		return geometry;
	}

	/**
	 * Creates mesh from geometry data based on type
	 */
	private _createMeshFromGeometry(geometryData: IGeometry, name: string, scene: Scene): Nullable<Mesh> {
		const geometryTypeHandlers: Record<string, (data: IGeometry, meshName: string, scene: Scene) => Nullable<Mesh>> = {
			PlaneGeometry: (data, meshName, scene) => this._createPlaneGeometry(data, meshName, scene),
			BufferGeometry: (data, meshName, scene) => this._createBufferGeometry(data, meshName, scene),
		};

		const handler = geometryTypeHandlers[geometryData.type];
		if (!handler) {
			Tools.Warn(`Unsupported geometry type: ${geometryData.type}`);
			return null;
		}

		return handler(geometryData, name, scene);
	}

	/**
	 * Creates plane geometry mesh
	 */
	private _createPlaneGeometry(geometryData: IGeometry, name: string, scene: Scene): Nullable<Mesh> {
		const width = geometryData.width ?? 1;
		const height = geometryData.height ?? 1;
		const mesh = CreatePlane(name, { width, height }, scene);
		return mesh;
	}

	/**
	 * Creates buffer geometry mesh (already converted to left-handed)
	 */
	private _createBufferGeometry(geometryData: IGeometry, name: string, scene: Scene): Nullable<Mesh> {
		if (!geometryData.data?.attributes) {
			Tools.Warn("BufferGeometry missing data or attributes");
			return null;
		}

		const vertexData = this._createVertexDataFromAttributes(geometryData);
		if (!vertexData) {
			return null;
		}

		const mesh = new Mesh(name, scene);
		vertexData.applyToMesh(mesh);
		// Geometry is already converted to left-handed in DataConverter

		return mesh;
	}

	/**
	 * Creates VertexData from BufferGeometry attributes (already converted to left-handed)
	 */
	private _createVertexDataFromAttributes(geometryData: IGeometry): Nullable<VertexData> {
		if (!geometryData.data?.attributes) {
			return null;
		}

		const attrs = geometryData.data.attributes;
		const positions = attrs.position;
		if (!positions?.array) {
			Tools.Warn("BufferGeometry missing position attribute");
			return null;
		}

		const vertexData = new VertexData();
		vertexData.positions = Array.from(positions.array);

		this._applyAttribute(vertexData, attrs.normal, "normals");
		this._applyAttribute(vertexData, attrs.uv, "uvs");
		this._applyAttribute(vertexData, attrs.color, "colors");

		const indices = geometryData.data.index;
		if (indices?.array) {
			vertexData.indices = Array.from(indices.array);
		} else {
			vertexData.indices = this._generateIndices(vertexData.positions.length);
		}

		return vertexData;
	}

	/**
	 * Applies attribute data to VertexData if available
	 */
	private _applyAttribute(vertexData: VertexData, attribute: { array?: number[] } | undefined, property: "normals" | "uvs" | "colors"): void {
		if (attribute?.array) {
			(vertexData as any)[property] = Array.from(attribute.array);
		}
	}

	/**
	 * Generates sequential indices for vertices
	 */
	private _generateIndices(positionsLength: number): number[] {
		const vertexCount = positionsLength / 3;
		return Array.from({ length: vertexCount }, (_, i) => i);
	}
}
