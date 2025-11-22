import { join } from "path/posix";
import { pathExists, readFile, writeFile, writeJSON } from "fs-extra";

import { Component, ReactNode } from "react";

import { toast } from "sonner";

import { Mesh, StandardMaterial, Color3, IObstacle } from "babylonjs";
import { CreateNavMeshResult } from "babylonjs-addons/navigation/types";
import { CreateNavigationPluginAsync, RecastNavigationJSPluginV2, WaitForFullTileCacheUpdate } from "babylonjs-addons";

import { SpinnerUIComponent } from "../../../ui/spinner";

import { setNodeSerializable, setNodeVisibleInGraph } from "../../../tools/node/metadata";

import { Editor } from "../../main";

import { INavMeshConfiguration } from "./types";
import { NavMeshEditorToolbar } from "./toolbar";
import { NavMeshEditorMeshesList } from "./meshes";
import { NavMeshEditorObstacles } from "./obstacles";
import { getObstacleMeshes, getStaticMeshes } from "./tools";
import { NavMeshEditorInspector } from "./inspector";

export interface INavmeshEditorProps {
	editor: Editor;
	configuration: INavMeshConfiguration;

	absolutePath: string;
}

export interface INavmeshEditorState {
	initializing: boolean;
}

export class NavMeshEditor extends Component<INavmeshEditorProps, INavmeshEditorState> {
	public configuration: INavMeshConfiguration;
	public plugin: RecastNavigationJSPluginV2;

	public result: CreateNavMeshResult | null = null;

	private _debugNavMesh: Mesh | null = null;
	private _debugObstacles: { obstacle: IObstacle; mesh: Mesh }[] = [];

	public constructor(props: INavmeshEditorProps) {
		super(props);

		this.configuration = props.configuration;

		this.state = {
			initializing: true,
		};
	}

	public render(): ReactNode {
		if (this.state.initializing) {
			return this._getLoadingScreen();
		}

		return (
			<div className="flex flex-col w-full h-full">
				<NavMeshEditorToolbar navMeshEditor={this} />

				<div className="flex flex-1">
					<NavMeshEditorMeshesList editor={this.props.editor} navMeshEditor={this} />
					<NavMeshEditorObstacles editor={this.props.editor} navMeshEditor={this} />
					<NavMeshEditorInspector editor={this.props.editor} navMeshEditor={this} />
				</div>
			</div>
		);
	}

	public async componentDidMount(): Promise<void> {
		await this._createPlugin();

		const navMeshBinPath = join(this.props.absolutePath, "navmesh.bin");
		const tilecacheBinPath = join(this.props.absolutePath, "tilecache.bin");
		if ((await pathExists(navMeshBinPath)) && (await pathExists(tilecacheBinPath))) {
			this.plugin.buildFromNavmeshData(await readFile(navMeshBinPath));
			this.plugin.buildFromTileCacheData(await readFile(tilecacheBinPath));
			this._createDebugNavMesh();
			this.createDebugObstacles();
		}

		this.setState({
			initializing: false,
		});
	}

	public componentWillUnmount(): void {
		this._disposeDebugNavMesh();
		this._disposeDebugObstacles();
		this._disposePlugin();
	}

	public async refreshAll(): Promise<void> {}

	public async updateNavMesh(): Promise<void> {
		this._disposeDebugNavMesh();
		this._disposePlugin();

		if (this.configuration.staticMeshes.length) {
			await this._createPlugin();

			const meshes = getStaticMeshes(this.props.editor.layout.preview.scene, this.configuration.staticMeshes);

			try {
				this.result = await this.plugin.createNavMeshAsync(meshes.effectiveStaticMeshes, this.configuration.navMeshParameters);
				if (this.result) {
					WaitForFullTileCacheUpdate(this.result.navMesh, this.result.tileCache);
				}

				this._createDebugNavMesh();
			} catch (e) {
				toast.error("Failed to create NavMesh");
				this.props.editor.layout.console.error(`Failed to create NavMesh: ${e.message}`);
			}

			meshes.clonedMeshes.forEach((mesh) => {
				mesh.dispose(false, false);
			});

			this.createDebugObstacles();
		}

		this.forceUpdate();
	}

	public async createDebugObstacles(): Promise<void> {
		this._disposeDebugObstacles();

		if (this.configuration.obstacleMeshes.length && this.plugin) {
			const scene = this.props.editor.layout.preview.scene;
			const meshes = getObstacleMeshes(this.props.editor.layout.preview.scene, this.configuration.obstacleMeshes);

			const debugMaterial = new StandardMaterial("navmesh-obstacle-debug-material", scene);
			debugMaterial.emissiveColor = Color3.Green();
			debugMaterial.disableLighting = true;
			debugMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
			debugMaterial.alpha = 0.5;
			debugMaterial.zOffset = -10;

			const debugObstacles = meshes.map((entry) => {
				entry.clone.material = debugMaterial;

				const obstacle =
					entry.config.type === "box"
						? this.plugin.addBoxObstacle(entry.clone.position, entry.clone.getBoundingInfo().boundingBox.extendSizeWorld, 0, false)
						: this.plugin.addCylinderObstacle(
								entry.clone.position,
								entry.clone.getBoundingInfo().boundingBox.extendSizeWorld.x,
								entry.clone.getBoundingInfo().boundingBox.extendSizeWorld.y,
								false
							);

				if (!obstacle) {
					entry.clone.dispose(false, true);
					return null;
				}

				return {
					mesh: entry.clone,
					obstacle: obstacle,
				};
			});

			this._debugObstacles = debugObstacles.filter((entry) => entry !== null);
		}

		this.forceUpdate();
	}

	private _disposeDebugObstacles(): void {
		this._debugObstacles.forEach((entry) => {
			entry.mesh.dispose(false, true);
		});

		this._debugObstacles = [];
	}

	public async save(): Promise<void> {
		try {
			await Promise?.all([
				writeJSON(join(this.props.absolutePath, "config.json"), this.configuration, {
					spaces: "\t",
					encoding: "utf-8",
				}),
				writeFile(join(this.props.absolutePath, "navmesh.bin"), Buffer.from(this.plugin.getNavmeshData())),
				writeFile(join(this.props.absolutePath, "tilecache.bin"), Buffer.from(this.plugin.getTileCacheData())),
			]);

			toast.success("NavMesh saved successfully.");
		} catch (e) {
			toast.error(`Failed to save NavMesh: ${e.message}`);
		}
	}

	private async _createPlugin(): Promise<void> {
		const RecastCore = require("@recast-navigation/core");
		const RecastGenerators = require("@recast-navigation/generators");

		this.plugin = await CreateNavigationPluginAsync({
			instance: {
				...RecastCore,
				...RecastGenerators,
			},
		});
	}

	private _disposePlugin(): void {
		this.plugin?.dispose();
	}

	private _createDebugNavMesh(): void {
		this._disposeDebugNavMesh();

		const scene = this.props.editor.layout.preview.scene;

		this._debugNavMesh = this.plugin.createDebugNavMesh(scene);
		setNodeSerializable(this._debugNavMesh, false);
		setNodeVisibleInGraph(this._debugNavMesh, false);

		const debugMaterial = new StandardMaterial("navmesh-debug-material", scene);
		debugMaterial.emissiveColor = Color3.Magenta();
		debugMaterial.disableLighting = true;
		debugMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
		debugMaterial.alpha = 0.35;
		debugMaterial.zOffset = -10;
		this._debugNavMesh.material = debugMaterial;
	}

	private _disposeDebugNavMesh(): void {
		this._debugNavMesh?.dispose(false, true);
	}

	private _getLoadingScreen(): ReactNode {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<SpinnerUIComponent width="64px" />;
			</div>
		);
	}
}
