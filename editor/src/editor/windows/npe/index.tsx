import { ipcRenderer } from "electron";
import { readJSON, writeJSON } from "fs-extra";

import { toast } from "sonner";

import { Component, ReactNode } from "react";

import { NodeParticleEditor } from "babylonjs-node-particle-editor";
import { NullEngine, Scene, NodeParticleSystemSet } from "babylonjs";

import { ToolbarComponent } from "../../../ui/toolbar";

import { Toaster } from "../../../ui/shadcn/ui/sonner";

export interface INodeMaterialEditorWindowProps {
	filePath: string;
	rootUrl?: string;
}

export default class NodeMaterialEditorWindow extends Component<INodeMaterialEditorWindowProps> {
	private _divRef: HTMLDivElement | null = null;

	private _scene!: Scene;
	private _nodeParticleSystem: NodeParticleSystemSet | null = null;

	public constructor(props: INodeMaterialEditorWindowProps) {
		super(props);
	}

	public render(): ReactNode {
		return (
			<>
				<div className="flex flex-col w-screen h-screen">
					<ToolbarComponent>
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
							<div className="flex items-center gap-1 font-semibold text-lg select-none">
								Node Particle System Editor
								<div className="text-sm font-thin">(...{this.props.filePath.substring(this.props.filePath.length - 30)})</div>
							</div>
						</div>
					</ToolbarComponent>

					<div ref={(r) => (this._divRef = r)} className="w-full h-full overflow-hidden" />
				</div>

				<Toaster />
			</>
		);
	}

	public async componentDidMount(): Promise<void> {
		if (!this._divRef) {
			return;
		}

		// Force dark theme here as Node Material Editor doesn't support light theme
		if (!document.body.classList.contains("dark")) {
			document.body.classList.add("dark");
		}

		const data = await readJSON(this.props.filePath);

		const engine = new NullEngine();
		this._scene = new Scene(engine);

		this._nodeParticleSystem = NodeParticleSystemSet.Parse(data);
		this._nodeParticleSystem.id = data.id;
		this._nodeParticleSystem.uniqueId = data.uniqueId;

		NodeParticleEditor.Show({
			hostScene: this._scene,
			hostElement: this._divRef,
			nodeParticleSet: this._nodeParticleSystem,
			customSave: {
				label: "Save",
				action: () => this._save(),
			},
		});

		ipcRenderer.on("save", () => this._save());

		ipcRenderer.on("editor:close-window", () => this.close());
	}

	public close(): void {
		ipcRenderer.send("window:close");
	}

	private async _save(): Promise<void> {
		if (!this._nodeParticleSystem) {
			return;
		}

		await this._nodeParticleSystem.buildAsync(this._scene, false);

		NodeParticleEditor["_CurrentState"].stateManager.onRebuildRequiredObservable.notifyObservers();

		const data = {
			...this._nodeParticleSystem.serialize(),
			id: this._nodeParticleSystem.id,
			uniqueId: this._nodeParticleSystem.uniqueId,
		};

		await writeJSON(this.props.filePath, data, {
			spaces: 4,
			encoding: "utf-8",
		});

		toast.success("Particle System saved");

		ipcRenderer.send("editor:asset-updated", "particle-system", data);
	}
}
