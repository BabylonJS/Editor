import { Scene, TransformNode } from "babylonjs";
import type { QuarksVFXJSON } from "../types/quarksTypes";
import type { VFXLoaderOptions } from "../types/loader";
import type { VFXParseContext } from "../types/context";
import type { VFXData } from "../types/hierarchy";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXMaterialFactory } from "../factories/VFXMaterialFactory";
import { VFXGeometryFactory } from "../factories/VFXGeometryFactory";
import { VFXSystemFactory } from "../factories/VFXSystemFactory";
import { VFXDataConverter } from "./VFXDataConverter";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";

/**
 * Main parser for Three.js particle JSON files
 * Orchestrates the parsing process using modular components
 */
export class VFXParser {
	private _context: VFXParseContext;
	private _logger: VFXLogger;
	private _materialFactory: VFXMaterialFactory;
	private _geometryFactory: VFXGeometryFactory;
	private _systemFactory: VFXSystemFactory;

	constructor(scene: Scene, rootUrl: string, jsonData: QuarksVFXJSON, options?: VFXLoaderOptions) {
		const opts = options || {};
		this._context = {
			scene,
			rootUrl,
			jsonData,
			options: opts,
			groupNodesMap: new Map<string, TransformNode>(),
		};

		this._logger = new VFXLogger("[VFXParser]", opts);

		// Convert Quarks JSON to VFXData first
		const dataConverter = new VFXDataConverter(opts);
		const vfxData = dataConverter.convert(jsonData);
		this._context.vfxData = vfxData;

		// Create factories with VFXData instead of QuarksVFXJSON
		this._materialFactory = new VFXMaterialFactory(scene, vfxData, rootUrl, opts);
		this._geometryFactory = new VFXGeometryFactory(vfxData, opts);
		this._systemFactory = new VFXSystemFactory(scene, opts, this._context.groupNodesMap, this._materialFactory, this._geometryFactory);
	}

	/**
	 * Parse the JSON data and create particle systems
	 */
	public parse(): (VFXParticleSystem | VFXSolidParticleSystem)[] {
		const { options, vfxData } = this._context;
		this._logger.log("=== Starting Particle System Parsing ===");

		if (!vfxData) {
			this._logger.warn("VFXData is missing");
			return [];
		}

		if (options.validate) {
			this._validateJSONStructure(vfxData);
		}

		const particleSystems = this._systemFactory.createSystems(vfxData);

		this._logger.log(`=== Parsing complete. Created ${particleSystems.length} particle system(s) ===`);
		return particleSystems;
	}

	/**
	 * Validate VFX data structure
	 */
	private _validateJSONStructure(vfxData: VFXData): void {
		this._logger.log("Validating VFX data structure...");

		if (!vfxData.root) {
			this._logger.warn("VFX data missing 'root' property");
		}

		if (!vfxData.materials || vfxData.materials.length === 0) {
			this._logger.warn("VFX data has no materials");
		}

		if (!vfxData.textures || vfxData.textures.length === 0) {
			this._logger.warn("VFX data has no textures");
		}

		if (!vfxData.images || vfxData.images.length === 0) {
			this._logger.warn("VFX data has no images");
		}

		if (!vfxData.geometries || vfxData.geometries.length === 0) {
			this._logger.warn("VFX data has no geometries");
		}

		this._logger.log("Validation complete");
	}

	/**
	 * Get the parse context (for use by other components)
	 */
	public getContext(): VFXParseContext {
		return this._context;
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
