import { Scene, TransformNode } from "babylonjs";
import type { QuarksVFXJSON } from "../types/quarksTypes";
import type { VFXLoaderOptions } from "../types/loader";
import type { VFXData } from "../types/hierarchy";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXMaterialFactory } from "../factories/VFXMaterialFactory";
import { VFXGeometryFactory } from "../factories/VFXGeometryFactory";
import { VFXSystemFactory } from "../factories/VFXSystemFactory";
import { VFXDataConverter } from "./VFXDataConverter";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";

/**
 * Result of parsing VFX JSON
 */
export interface VFXParseResult {
	/** Created particle systems */
	systems: (VFXParticleSystem | VFXSolidParticleSystem)[];
	/** Converted VFX data */
	vfxData: VFXData;
	/** Map of group UUIDs to TransformNodes */
	groupNodesMap: Map<string, TransformNode>;
}

/**
 * Main parser for Three.js particle JSON files
 * Orchestrates the parsing process using modular components
 */
export class VFXParser {
	private _logger: VFXLogger;
	private _materialFactory: VFXMaterialFactory;
	private _geometryFactory: VFXGeometryFactory;
	private _systemFactory: VFXSystemFactory;
	private _vfxData: VFXData;
	private _groupNodesMap: Map<string, TransformNode>;
	private _options: VFXLoaderOptions;

	constructor(scene: Scene, rootUrl: string, jsonData: QuarksVFXJSON, options?: VFXLoaderOptions) {
		const opts = options || {};
		this._options = opts;
		this._groupNodesMap = new Map<string, TransformNode>();

		this._logger = new VFXLogger("[VFXParser]", opts);

		// Convert Quarks JSON to VFXData first
		const dataConverter = new VFXDataConverter(opts);
		this._vfxData = dataConverter.convert(jsonData);

		// Create factories with VFXData instead of QuarksVFXJSON
		this._materialFactory = new VFXMaterialFactory(scene, this._vfxData, rootUrl, opts);
		this._geometryFactory = new VFXGeometryFactory(this._vfxData, opts);
		this._systemFactory = new VFXSystemFactory(scene, opts, this._groupNodesMap, this._materialFactory, this._geometryFactory);
	}

	/**
	 * Parse the JSON data and create particle systems
	 * Returns all necessary data for building the effect hierarchy
	 */
	public parse(): VFXParseResult {
		this._logger.log("=== Starting Particle System Parsing ===");

		if (!this._vfxData) {
			this._logger.warn("VFXData is missing");
			return {
				systems: [],
				vfxData: this._vfxData,
				groupNodesMap: this._groupNodesMap,
			};
		}

		if (this._options.validate) {
			this._validateJSONStructure(this._vfxData);
		}

		const particleSystems = this._systemFactory.createSystems(this._vfxData);

		this._logger.log(`=== Parsing complete. Created ${particleSystems.length} particle system(s) ===`);
		return {
			systems: particleSystems,
			vfxData: this._vfxData,
			groupNodesMap: this._groupNodesMap,
		};
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
	 * Get the material factory (for advanced use cases)
	 */
	public getMaterialFactory(): VFXMaterialFactory {
		return this._materialFactory;
	}

	/**
	 * Get the geometry factory (for advanced use cases)
	 */
	public getGeometryFactory(): VFXGeometryFactory {
		return this._geometryFactory;
	}
}
