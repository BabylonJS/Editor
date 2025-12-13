import { Mesh, VertexData, CreatePlane, Nullable, Scene } from "babylonjs";
import type { IVFXGeometryFactory } from "../types/factories";
import { VFXLogger } from "../loggers/VFXLogger";
import type { VFXData } from "../types/hierarchy";
import type { VFXGeometry } from "../types/resources";
import type { VFXLoaderOptions } from "../types/loader";

/**
 * Factory for creating meshes from Three.js geometry data
 */
export class VFXGeometryFactory implements IVFXGeometryFactory {
	private _logger: VFXLogger;
	private _vfxData: VFXData;

	constructor(vfxData: VFXData, options: VFXLoaderOptions) {
		this._vfxData = vfxData;
		this._logger = new VFXLogger("[VFXGeometryFactory]", options);
	}

	/**
	 * Create a mesh from geometry ID
	 */
	public createMesh(geometryId: string, name: string, scene: Scene): Nullable<Mesh> {
		this._logger.log(`Creating mesh from geometry ID: ${geometryId}, name: ${name}`);

		const geometryData = this._findGeometry(geometryId);
		if (!geometryData) {
			return null;
		}

		const geometryName = geometryData.type || geometryId;
		this._logger.log(`Found geometry: ${geometryName} (type: ${geometryData.type})`);

		const mesh = this._createMeshFromGeometry(geometryData, name, scene);
		if (!mesh) {
			this._logger.warn(`Failed to create mesh from geometry ${geometryId}`);
			return null;
		}

		return mesh;
	}

	/**
	 * Create or load particle mesh for SPS
	 * Tries to load geometry if specified, otherwise creates default plane
	 */
	public createParticleMesh(config: { instancingGeometry?: string }, name: string, scene: Scene): Nullable<Mesh> {
		let particleMesh = this._loadParticleGeometry(config, name, scene);

		if (!particleMesh) {
			particleMesh = this._createDefaultPlaneMesh(name, scene);
		}

		if (!particleMesh) {
			this._logger.warn(`  Cannot create particle mesh: particleMesh is null`);
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

		this._logger.log(`  Loading geometry: ${config.instancingGeometry}`);
		const mesh = this.createMesh(config.instancingGeometry, name + "_shape", scene);
		if (!mesh) {
			this._logger.warn(`  Failed to load geometry ${config.instancingGeometry}, will create default plane`);
		}

		return mesh;
	}

	/**
	 * Creates default plane mesh
	 */
	private _createDefaultPlaneMesh(name: string, scene: Scene): Mesh {
		this._logger.log(`  Creating default plane geometry`);
		return CreatePlane(name + "_shape", { width: 1, height: 1 }, scene);
	}

	/**
	 * Finds geometry by UUID
	 */
	private _findGeometry(geometryId: string): VFXGeometry | null {
		if (!this._vfxData.geometries || this._vfxData.geometries.length === 0) {
			this._logger.warn("No geometries data available");
			return null;
		}

		const geometry = this._vfxData.geometries.find((g) => g.uuid === geometryId);
		if (!geometry) {
			this._logger.warn(`Geometry not found: ${geometryId}`);
			return null;
		}

		return geometry;
	}

	/**
	 * Creates mesh from geometry data based on type
	 */
	private _createMeshFromGeometry(geometryData: VFXGeometry, name: string, scene: Scene): Nullable<Mesh> {
		this._logger.log(`createMeshFromGeometry: type=${geometryData.type}, name=${name}`);

		const geometryTypeHandlers: Record<string, (data: VFXGeometry, meshName: string, scene: Scene) => Nullable<Mesh>> = {
			PlaneGeometry: (data, meshName, scene) => this._createPlaneGeometry(data, meshName, scene),
			BufferGeometry: (data, meshName, scene) => this._createBufferGeometry(data, meshName, scene),
		};

		const handler = geometryTypeHandlers[geometryData.type];
		if (!handler) {
			this._logger.warn(`Unsupported geometry type: ${geometryData.type}`);
			return null;
		}

		return handler(geometryData, name, scene);
	}

	/**
	 * Creates plane geometry mesh
	 */
	private _createPlaneGeometry(geometryData: VFXGeometry, name: string, scene: Scene): Nullable<Mesh> {
		const width = geometryData.width ?? 1;
		const height = geometryData.height ?? 1;

		this._logger.log(`Creating PlaneGeometry: width=${width}, height=${height}`);

		const mesh = CreatePlane(name, { width, height }, scene);
		if (mesh) {
			this._logger.log(`PlaneGeometry created successfully`);
		} else {
			this._logger.warn(`Failed to create PlaneGeometry`);
		}

		return mesh;
	}

	/**
	 * Creates buffer geometry mesh (already converted to left-handed)
	 */
	private _createBufferGeometry(geometryData: VFXGeometry, name: string, scene: Scene): Nullable<Mesh> {
		if (!geometryData.data?.attributes) {
			this._logger.warn("BufferGeometry missing data or attributes");
			return null;
		}

		const vertexData = this._createVertexDataFromAttributes(geometryData);
		if (!vertexData) {
			return null;
		}

		const mesh = new Mesh(name, scene);
		vertexData.applyToMesh(mesh);
		// Geometry is already converted to left-handed in VFXDataConverter

		return mesh;
	}

	/**
	 * Creates VertexData from BufferGeometry attributes (already converted to left-handed)
	 */
	private _createVertexDataFromAttributes(geometryData: VFXGeometry): Nullable<VertexData> {
		if (!geometryData.data?.attributes) {
			return null;
		}

		const attrs = geometryData.data.attributes;
		const positions = attrs.position;
		if (!positions?.array) {
			this._logger.warn("BufferGeometry missing position attribute");
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
