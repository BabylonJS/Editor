import type { Scene } from "@babylonjs/core/scene";
import type { QuarksVFXJSON } from "../types/quarksTypes";
import type { VFXLoaderOptions } from "../types/loader";
import type { VFXParseContext } from "../types/context";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXValueParser } from "./VFXValueParser";
import { VFXMaterialFactory } from "../factories/VFXMaterialFactory";
import { VFXGeometryFactory } from "../factories/VFXGeometryFactory";
import { VFXEmitterFactory } from "../factories/VFXEmitterFactory";
import { VFXHierarchyProcessor } from "../processors/VFXHierarchyProcessor";
import { VFXDataConverter } from "./VFXDataConverter";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";

/**
 * Main parser for Three.js particle JSON files
 * Orchestrates the parsing process using modular components
 */
export class VFXParser {
    private _context: VFXParseContext;
    private _logger: VFXLogger;
    private _valueParser: VFXValueParser;
    private _materialFactory: VFXMaterialFactory;
    private _geometryFactory: VFXGeometryFactory;
    private _emitterFactory: VFXEmitterFactory;
    private _hierarchyProcessor: VFXHierarchyProcessor;

    constructor(scene: Scene, rootUrl: string, jsonData: QuarksVFXJSON, options?: VFXLoaderOptions) {
        const opts = options || {};
        this._context = {
            scene,
            rootUrl,
            jsonData,
            options: opts,
            groupNodesMap: new Map<string, TransformNode>(),
        };

        this._logger = new VFXLogger("[VFXParser]");
        this._valueParser = new VFXValueParser();
        this._materialFactory = new VFXMaterialFactory(this._context);
        this._geometryFactory = new VFXGeometryFactory(this._context, this._materialFactory);
        this._emitterFactory = new VFXEmitterFactory(this._context, this._valueParser, this._materialFactory, this._geometryFactory);
        this._hierarchyProcessor = new VFXHierarchyProcessor(this._context, this._emitterFactory);
    }

    /**
     * Parse the JSON data and create particle systems
     */
    public parse(): (VFXParticleSystem | VFXSolidParticleSystem)[] {
        const { jsonData, options } = this._context;
        this._logger.log("=== Starting Particle System Parsing ===", options);

        if (options.validate) {
            this._validateJSONStructure(jsonData, options);
        }

        const dataConverter = new VFXDataConverter(options);
        const vfxData = dataConverter.convert(jsonData);
        this._context.vfxData = vfxData;
        const particleSystems = this._hierarchyProcessor.processHierarchy(vfxData);

        this._logger.log(`=== Parsing complete. Created ${particleSystems.length} particle system(s) ===`, options);
        return particleSystems;
    }

    /**
     * Validate JSON structure
     */
    private _validateJSONStructure(jsonData: QuarksVFXJSON, options: VFXLoaderOptions): void {
        this._logger.log("Validating JSON structure...", options);

        if (!jsonData.object) {
            this._logger.warn("JSON missing 'object' property", options);
        }

        if (!jsonData.materials || jsonData.materials.length === 0) {
            this._logger.warn("JSON has no materials", options);
        }

        if (!jsonData.textures || jsonData.textures.length === 0) {
            this._logger.warn("JSON has no textures", options);
        }

        if (!jsonData.images || jsonData.images.length === 0) {
            this._logger.warn("JSON has no images", options);
        }

        if (!jsonData.geometries || jsonData.geometries.length === 0) {
            this._logger.warn("JSON has no geometries", options);
        }

        this._logger.log("Validation complete", options);
    }

    /**
     * Get the parse context (for use by other components)
     */
    public getContext(): VFXParseContext {
        return this._context;
    }

    /**
     * Get the value parser
     */
    public getValueParser(): VFXValueParser {
        return this._valueParser;
    }

    /**
     * Get the material factory
     */
    public getMaterialFactory(): VFXMaterialFactory {
        return this._materialFactory;
    }

    /**
     * Get the geometry factory
     */
    public getGeometryFactory(): VFXGeometryFactory {
        return this._geometryFactory;
    }
}
