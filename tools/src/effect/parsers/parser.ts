import { Scene, TransformNode } from "babylonjs";
import type { IQuarksJSON, ILoaderOptions, IData } from "../types";
import { Logger } from "../loggers/logger";
import { MaterialFactory, GeometryFactory, SystemFactory } from "../factories";
import { DataConverter } from "./dataConverter";
import type { EffectParticleSystem, EffectSolidParticleSystem } from "../systems";

/**
 * Result of parsing  JSON
 */
export interface IParseResult {
	/** Created particle systems */
	systems: (EffectParticleSystem | EffectSolidParticleSystem)[];
	/** Converted  data */
	data: IData;
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
	private _data: IData;
	private _groupNodesMap: Map<string, TransformNode>;
	private _options: ILoaderOptions;

	constructor(scene: Scene, rootUrl: string, jsondata: IQuarksJSON, options?: ILoaderOptions) {
		const opts = options || {};
		this._options = opts;
		this._groupNodesMap = new Map<string, TransformNode>();

		this._logger = new Logger("[Parser]", opts);

		// Convert Quarks JSON to data first
		const dataConverter = new DataConverter(opts);
		this._data = dataConverter.convert(jsondata);

		// Create factories with data instead of QuarksJSON
		this._materialFactory = new MaterialFactory(scene, this._data, rootUrl, opts);
		this._geometryFactory = new GeometryFactory(this._data, opts);
		this._systemFactory = new SystemFactory(scene, opts, this._groupNodesMap, this._materialFactory, this._geometryFactory);
	}

	/**
	 * Parse the JSON data and create particle systems
	 * Returns all necessary data for building the effect hierarchy
	 */
	public parse(): IParseResult {
		this._logger.log("=== Starting Particle System Parsing ===");

		if (!this._data) {
			this._logger.warn("data is missing");
			return {
				systems: [],
				data: this._data,
				groupNodesMap: this._groupNodesMap,
			};
		}

		if (this._options.validate) {
			this._validateJSONStructure(this._data);
		}

		const particleSystems = this._systemFactory.createSystems(this._data);

		this._logger.log(`=== Parsing complete. Created ${particleSystems.length} particle system(s) ===`);
		return {
			systems: particleSystems,
			data: this._data,
			groupNodesMap: this._groupNodesMap,
		};
	}

	/**
	 * Validate  data structure
	 */
	private _validateJSONStructure(data: IData): void {
		this._logger.log("Validating  data structure...");

		if (!data.root) {
			this._logger.warn(" data missing 'root' property");
		}

		if (!data.materials || data.materials.length === 0) {
			this._logger.warn(" data has no materials");
		}

		if (!data.textures || data.textures.length === 0) {
			this._logger.warn(" data has no textures");
		}

		if (!data.images || data.images.length === 0) {
			this._logger.warn(" data has no images");
		}

		if (!data.geometries || data.geometries.length === 0) {
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
