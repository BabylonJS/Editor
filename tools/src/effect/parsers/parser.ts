import { Scene, TransformNode } from "babylonjs";
import type { QuarksJSON } from "../types/quarksTypes";
import type { LoaderOptions } from "../types/loader";
import type { Data } from "../types/hierarchy";
import { Logger } from "../loggers/logger";
import { MaterialFactory, GeometryFactory, SystemFactory } from "../factories";
import { DataConverter } from "./dataConverter";
import type { EffectParticleSystem } from "../systems/effectParticleSystem";
import type { EffectSolidParticleSystem } from "../systems/effectSolidParticleSystem";

/**
 * Result of parsing  JSON
 */
export interface ParseResult {
	/** Created particle systems */
	systems: (EffectParticleSystem | EffectSolidParticleSystem)[];
	/** Converted  data */
	Data: Data;
	/** Map of group UUIDs to TransformNodes */
	groupNodesMap: Map<string, TransformNode>;
}

/**
 * Main parser for Three.js particle JSON files
 * Orchestrates the parsing process using modular components
 */
export class Parser {
	private _logger: Logger;
	private _materialFactory: MaterialFactory;
	private _geometryFactory: GeometryFactory;
	private _systemFactory: SystemFactory;
	private _Data: Data;
	private _groupNodesMap: Map<string, TransformNode>;
	private _options: LoaderOptions;

	constructor(scene: Scene, rootUrl: string, jsonData: QuarksJSON, options?: LoaderOptions) {
		const opts = options || {};
		this._options = opts;
		this._groupNodesMap = new Map<string, TransformNode>();

		this._logger = new Logger("[Parser]", opts);

		// Convert Quarks JSON to Data first
		const dataConverter = new DataConverter(opts);
		this._Data = dataConverter.convert(jsonData);

		// Create factories with Data instead of QuarksJSON
		this._materialFactory = new MaterialFactory(scene, this._Data, rootUrl, opts);
		this._geometryFactory = new GeometryFactory(this._Data, opts);
		this._systemFactory = new SystemFactory(scene, opts, this._groupNodesMap, this._materialFactory, this._geometryFactory);
	}

	/**
	 * Parse the JSON data and create particle systems
	 * Returns all necessary data for building the effect hierarchy
	 */
	public parse(): ParseResult {
		this._logger.log("=== Starting Particle System Parsing ===");

		if (!this._Data) {
			this._logger.warn("Data is missing");
			return {
				systems: [],
				Data: this._Data,
				groupNodesMap: this._groupNodesMap,
			};
		}

		if (this._options.validate) {
			this._validateJSONStructure(this._Data);
		}

		const particleSystems = this._systemFactory.createSystems(this._Data);

		this._logger.log(`=== Parsing complete. Created ${particleSystems.length} particle system(s) ===`);
		return {
			systems: particleSystems,
			Data: this._Data,
			groupNodesMap: this._groupNodesMap,
		};
	}

	/**
	 * Validate  data structure
	 */
	private _validateJSONStructure(Data: Data): void {
		this._logger.log("Validating  data structure...");

		if (!Data.root) {
			this._logger.warn(" data missing 'root' property");
		}

		if (!Data.materials || Data.materials.length === 0) {
			this._logger.warn(" data has no materials");
		}

		if (!Data.textures || Data.textures.length === 0) {
			this._logger.warn(" data has no textures");
		}

		if (!Data.images || Data.images.length === 0) {
			this._logger.warn(" data has no images");
		}

		if (!Data.geometries || Data.geometries.length === 0) {
			this._logger.warn(" data has no geometries");
		}

		this._logger.log("Validation complete");
	}

	/**
	 * Get the material factory (for advanced use cases)
	 */
	public getMaterialFactory(): MaterialFactory {
		return this._materialFactory;
	}

	/**
	 * Get the geometry factory (for advanced use cases)
	 */
	public getGeometryFactory(): GeometryFactory {
		return this._geometryFactory;
	}
}
