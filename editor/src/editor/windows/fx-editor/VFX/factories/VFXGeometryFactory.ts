import type { Nullable } from "../../../types";
import type { Scene } from "../../../scene";
import { Mesh } from "../../../Meshes/mesh";
import { VertexData } from "../../../Meshes/mesh.vertexData";
import { CreatePlane } from "../../../Meshes/Builders/planeBuilder";
import type { IVFXGeometryFactory } from "../types/factories";
import type { VFXParseContext } from "../types/context";
import type { VFXLoaderOptions } from "../types/loader";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXMaterialFactory } from "./VFXMaterialFactory";

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
        const { jsonData, scene, options } = this._context;

        this._logger.log(`Creating mesh from geometry ID: ${geometryId}, name: ${name}`, options);
        if (!jsonData.geometries) {
            this._logger.warn("No geometries data available", options);
            return null;
        }

        // Find geometry
        const geometryData = jsonData.geometries.find((g) => g.uuid === geometryId);
        if (!geometryData) {
            this._logger.warn(`Geometry not found: ${geometryId}`, options);
            return null;
        }

        this._logger.log(`Found geometry: ${geometryData.name || geometryData.type || geometryId} (type: ${geometryData.type})`, options);

        // Create mesh from geometry
        const mesh = this._createMeshFromGeometry(geometryData, scene, name, options);
        if (!mesh) {
            this._logger.warn(`Failed to create mesh from geometry ${geometryId}`, options);
            return null;
        }

        // Apply material if provided
        if (materialId) {
            const material = this._materialFactory.createMaterial(materialId, name);
            if (material) {
                mesh.material = material;
                this._logger.log(`Applied material to mesh: ${name}`, options);
            }
        }

        return mesh;
    }

    /**
     * Create a mesh from Three.js geometry data
     */
    private _createMeshFromGeometry(
        geometryData: import("../types/quarksTypes").QuarksGeometry,
        scene: Scene,
        name: string = "ParticleMesh",
        options?: VFXLoaderOptions
    ): Nullable<Mesh> {
        if (!geometryData) {
            this._logger.warn(`createMeshFromGeometry: geometryData is null`, options);
            return null;
        }

        this._logger.log(`createMeshFromGeometry: type=${geometryData.type}, name=${name}`, options);

        // Handle PlaneGeometry
        if (geometryData.type === "PlaneGeometry") {
            const width = typeof geometryData.width === "number" ? geometryData.width : 1;
            const height = typeof geometryData.height === "number" ? geometryData.height : 1;
            this._logger.log(`  Creating PlaneGeometry: width=${width}, height=${height}`, options);
            const mesh = CreatePlane(name, { width, height }, scene);
            if (mesh) {
                this._logger.log(`  PlaneGeometry created successfully`, options);
            } else {
                this._logger.warn(`  Failed to create PlaneGeometry`, options);
            }
            return mesh;
        }

        // Handle BufferGeometry
        if (geometryData.type === "BufferGeometry" && geometryData.data && geometryData.data.attributes) {
            const attrs = geometryData.data.attributes;
            const positions = attrs.position;
            const normals = attrs.normal;
            const uvs = attrs.uv;
            const colors = attrs.color;
            const indices = geometryData.data.index;

            if (!positions || !positions.array) {
                return null;
            }

            const vertexData = new VertexData();
            vertexData.positions = Array.from(positions.array);

            if (normals && normals.array) {
                vertexData.normals = Array.from(normals.array);
            }

            if (uvs && uvs.array) {
                vertexData.uvs = Array.from(uvs.array);
            }

            if (colors && colors.array) {
                vertexData.colors = Array.from(colors.array);
            }

            if (indices && indices.array) {
                vertexData.indices = Array.from(indices.array);
            } else {
                // Generate indices if not provided
                const vertexCount = vertexData.positions.length / 3;
                const generatedIndices: number[] = [];
                for (let i = 0; i < vertexCount; i++) {
                    generatedIndices.push(i);
                }
                vertexData.indices = generatedIndices;
            }

            const mesh = new Mesh(name, scene);
            vertexData.applyToMesh(mesh);

            // Convert from Three.js (right-handed) to Babylon.js (left-handed) coordinate system
            // This inverts Z coordinates, flips face winding, and negates normal Z
            if (mesh.geometry) {
                mesh.geometry.toLeftHanded();
            }

            return mesh;
        }

        return null;
    }
}
