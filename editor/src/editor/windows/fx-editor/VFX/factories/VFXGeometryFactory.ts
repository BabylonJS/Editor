import { Mesh, VertexData, CreatePlane, Nullable } from "babylonjs";
import type { IVFXGeometryFactory } from "../types/factories";
import type { VFXParseContext } from "../types/context";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXMaterialFactory } from "./VFXMaterialFactory";
import type { QuarksGeometry } from "../types/quarksTypes";

/**
 * Factory for creating meshes from Three.js geometry data
 */
export class VFXGeometryFactory implements IVFXGeometryFactory {
	private _logger: VFXLogger;
	private _context: VFXParseContext;
	private _materialFactory: VFXMaterialFactory;

	constructor(context: VFXParseContext, materialFactory: VFXMaterialFactory) {
		this._context = context;
		this._logger = new VFXLogger("[VFXGeometryFactory]");
		this._materialFactory = materialFactory;
	}

	/**
	 * Create a mesh from geometry ID with material applied
	 */
	public createMesh(geometryId: string, materialId: string | undefined, name: string): Nullable<Mesh> {
		const { options } = this._context;
		this._logger.log(`Creating mesh from geometry ID: ${geometryId}, name: ${name}`, options);

		const geometryData = this._findGeometry(geometryId);
		if (!geometryData) {
			return null;
		}

		this._logGeometryInfo(geometryData, geometryId);

		const mesh = this._createMeshFromGeometry(geometryData, name);
		if (!mesh) {
			this._logger.warn(`Failed to create mesh from geometry ${geometryId}`, options);
			return null;
		}

		this._applyMaterial(mesh, materialId, name);
		return mesh;
	}

	/**
	 * Create or load particle mesh for SPS
	 * Tries to load geometry if specified, otherwise creates default plane
	 */
	public createParticleMesh(config: { instancingGeometry?: string }, materialId: string | undefined, name: string, scene: any): Nullable<Mesh> {
		const { options } = this._context;
		let particleMesh = this._loadParticleGeometry(config, materialId, name);

		if (!particleMesh) {
			particleMesh = this._createDefaultPlaneMesh(name, scene);
			this._applyMaterial(particleMesh, materialId, name);
		} else {
			this._ensureMaterialApplied(particleMesh, materialId, name);
		}

		if (!particleMesh) {
			this._logger.warn(`  Cannot create particle mesh: particleMesh is null`, options);
		}

		return particleMesh;
	}

	/**
	 * Loads particle geometry if specified
	 */
	private _loadParticleGeometry(config: { instancingGeometry?: string }, materialId: string | undefined, name: string): Nullable<Mesh> {
		if (!config.instancingGeometry) {
			return null;
		}

		const { options } = this._context;
		this._logger.log(`  Loading geometry: ${config.instancingGeometry}`, options);
		const mesh = this.createMesh(config.instancingGeometry, materialId, name + "_shape");
		if (!mesh && this._logger) {
			this._logger.warn(`  Failed to load geometry ${config.instancingGeometry}, will create default plane`, options);
		}

		return mesh;
	}

	/**
	 * Creates default plane mesh
	 */
	private _createDefaultPlaneMesh(name: string, scene: any): Mesh {
		const { options } = this._context;
		this._logger.log(`  Creating default plane geometry`, options);
		return CreatePlane(name + "_shape", { width: 1, height: 1 }, scene);
	}

	/**
	 * Ensures material is applied to mesh if missing
	 */
	private _ensureMaterialApplied(mesh: Mesh, materialId: string | undefined, name: string): void {
		if (materialId && !mesh.material) {
			this._applyMaterial(mesh, materialId, name);
		}
	}

	/**
	 * Finds geometry by UUID
	 */
	private _findGeometry(geometryId: string): QuarksGeometry | null {
		const { jsonData, options } = this._context;

		if (!jsonData.geometries) {
			this._logger.warn("No geometries data available", options);
			return null;
		}

		const geometry = jsonData.geometries.find((g) => g.uuid === geometryId);
		if (!geometry) {
			this._logger.warn(`Geometry not found: ${geometryId}`, options);
			return null;
		}

		return geometry;
	}

	/**
	 * Logs geometry information
	 */
	private _logGeometryInfo(geometryData: QuarksGeometry, geometryId: string): void {
		const { options } = this._context;
		const geometryName = geometryData.type || geometryId;
		this._logger.log(`Found geometry: ${geometryName} (type: ${geometryData.type})`, options);
	}

	/**
	 * Applies material to mesh if provided
	 */
	private _applyMaterial(mesh: Mesh, materialId: string | undefined, name: string): void {
		if (!materialId) {
			return;
		}

		const { options } = this._context;
		const material = this._materialFactory.createMaterial(materialId, name);
		if (material) {
			mesh.material = material;
			this._logger.log(`Applied material to mesh: ${name}`, options);
		}
	}

	/**
	 * Creates mesh from geometry data based on type
	 */
	private _createMeshFromGeometry(geometryData: QuarksGeometry, name: string): Nullable<Mesh> {
		const { options } = this._context;
		this._logger.log(`createMeshFromGeometry: type=${geometryData.type}, name=${name}`, options);

		const geometryTypeHandlers: Record<string, (data: QuarksGeometry, meshName: string) => Nullable<Mesh>> = {
			PlaneGeometry: (data, meshName) => this._createPlaneGeometry(data, meshName),
			BufferGeometry: (data, meshName) => this._createBufferGeometry(data, meshName),
		};

		const handler = geometryTypeHandlers[geometryData.type];
		if (!handler) {
			this._logger.warn(`Unsupported geometry type: ${geometryData.type}`, options);
			return null;
		}

		return handler(geometryData, name);
	}

	/**
	 * Creates plane geometry mesh
	 */
	private _createPlaneGeometry(geometryData: QuarksGeometry, name: string): Nullable<Mesh> {
		const { scene, options } = this._context;
		const width = this._getNumericProperty(geometryData, "width", 1);
		const height = this._getNumericProperty(geometryData, "height", 1);

		this._logger.log(`Creating PlaneGeometry: width=${width}, height=${height}`, options);

		const mesh = CreatePlane(name, { width, height }, scene);
		if (mesh) {
			this._logger.log(`PlaneGeometry created successfully`, options);
		} else {
			this._logger.warn(`Failed to create PlaneGeometry`, options);
		}

		return mesh;
	}

	/**
	 * Creates buffer geometry mesh
	 */
	private _createBufferGeometry(geometryData: QuarksGeometry, name: string): Nullable<Mesh> {
		const { scene, options } = this._context;

		if (!geometryData.data?.attributes) {
			this._logger.warn("BufferGeometry missing data or attributes", options);
			return null;
		}

		const vertexData = this._createVertexDataFromAttributes(geometryData);
		if (!vertexData) {
			return null;
		}

		const mesh = new Mesh(name, scene);
		vertexData.applyToMesh(mesh);
		this._convertToLeftHanded(mesh);

		return mesh;
	}

	/**
	 * Creates VertexData from BufferGeometry attributes
	 */
	private _createVertexDataFromAttributes(geometryData: QuarksGeometry): Nullable<VertexData> {
		const { options } = this._context;

		if (!geometryData.data?.attributes) {
			return null;
		}

		const attrs = geometryData.data.attributes;
		const positions = attrs.position;
		if (!positions?.array) {
			this._logger.warn("BufferGeometry missing position attribute", options);
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

	/**
	 * Converts mesh geometry from right-handed (Three.js) to left-handed (Babylon.js) coordinate system
	 */
	private _convertToLeftHanded(mesh: Mesh): void {
		if (mesh.geometry) {
			mesh.geometry.toLeftHanded();
		}
	}

	/**
	 * Gets numeric property from geometry data with fallback
	 */
	private _getNumericProperty(geometryData: QuarksGeometry, property: string, defaultValue: number): number {
		const value = (geometryData as any)[property];
		return typeof value === "number" ? value : defaultValue;
	}
}
