import { ipcRenderer } from "electron";
import { readJSON, writeJSON } from "fs-extra";

import { toast } from "sonner";

import { Component, ReactNode } from "react";

import { Toaster } from "../../../ui/shadcn/ui/sonner";

import { EffectEditorLayout } from "./layout";
import { EffectEditorToolbar } from "./toolbar";

import { projectConfiguration, onProjectConfigurationChangedObservable, IProjectConfiguration } from "../../../project/configuration";
import { EffectEditorAnimation } from "./animation";
import { EffectEditorGraph } from "./graph";
import { EffectEditorPreview } from "./preview";
import { EffectEditorResources } from "./resources";

export interface IEffectEditorWindowProps {
	filePath?: string;
	projectConfiguration?: IProjectConfiguration;
}

export interface IEffectEditorWindowState {
	filePath: string | null;
}

export interface IEffectEditor {
	layout: EffectEditorLayout | null;
	preview: EffectEditorPreview | null;
	graph: EffectEditorGraph | null;
	animation: EffectEditorAnimation | null;
	resources: EffectEditorResources | null;
}
export default class EffectEditorWindow extends Component<IEffectEditorWindowProps, IEffectEditorWindowState> {
	public editor: IEffectEditor = {
		layout: null,
		preview: null,
		graph: null,
		animation: null,
		resources: null,
	};

	public constructor(props: IEffectEditorWindowProps) {
		super(props);

		this.state = {
			filePath: props.filePath || null,
		};
	}

	public render(): ReactNode {
		return (
			<>
				<div className="flex flex-col w-screen h-screen">
					<EffectEditorToolbar editor={this} />

					<div className="w-full h-full overflow-hidden">
						<EffectEditorLayout ref={(r) => (this.editor.layout = r)} filePath={this.state.filePath || ""} editor={this.editor} />
					</div>
				</div>

				<Toaster />
			</>
		);
	}

	public async componentDidMount(): Promise<void> {
		ipcRenderer.on("save", () => this.save());
		ipcRenderer.on("editor:close-window", () => this.close());

		// Set project configuration if provided
		if (this.props.projectConfiguration) {
			projectConfiguration.path = this.props.projectConfiguration.path;
			projectConfiguration.compressedTexturesEnabled = this.props.projectConfiguration.compressedTexturesEnabled;
			onProjectConfigurationChangedObservable.notifyObservers(projectConfiguration);
		}
	}

	public close(): void {
		ipcRenderer.send("window:close");
	}

	public async loadFile(filePath: string): Promise<void> {
		this.setState({ filePath });
		// TODO: Load file data into editor
	}

	public async save(): Promise<void> {
		if (!this.state.filePath) {
			return;
		}

		try {
			const data = await readJSON(this.state.filePath);
			await writeJSON(this.state.filePath, data, { spaces: 4 });
			toast.success("Effect saved");
			ipcRenderer.send("editor:asset-updated", "Effect", data);
		} catch (error) {
			toast.error("Failed to save Effect");
		}
	}

	public async saveAs(filePath: string): Promise<void> {
		this.setState({ filePath });
		await this.save();
	}

	public async importFile(filePath: string): Promise<void> {
		try {
			// Get graph component reference from layout
			if (this.editor.graph) {
				await this.editor.graph.loadFromFile(filePath);
				toast.success("Effect imported");
			} else {
				toast.error("Failed to import Effect: Graph not available");
			}
		} catch (error) {
			console.error("Failed to import Effect:", error);
			toast.error("Failed to import Effect");
		}
	}
}
