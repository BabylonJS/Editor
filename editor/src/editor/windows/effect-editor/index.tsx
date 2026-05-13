import { ipcRenderer } from "electron";
import { writeJSON } from "fs-extra";

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

		// Load file if filePath is provided (wait for graph to be ready)
		if (this.props.filePath) {
			// Wait a bit for graph component to mount
			setTimeout(async () => {
				if (this.editor.graph) {
					await this.editor.graph.loadFromFile(this.props.filePath!);
				}
			}, 100);
		}
	}

	public close(): void {
		ipcRenderer.send("window:close");
	}

	public async loadFile(filePath: string): Promise<void> {
		this.setState({ filePath });
		if (this.editor.graph) {
			await this.editor.graph.loadFromFile(filePath);
		}
	}

	public async save(filePath: string = this.state.filePath ?? ""): Promise<void> {
		if (!filePath || !this.editor.graph) {
			return;
		}

		try {
			const fileData = this.editor.graph.serializeToFileFormat();
			await writeJSON(filePath, fileData, { spaces: "\t", encoding: "utf-8" });
			if (filePath !== this.state.filePath) {
				this.setState({ filePath });
			}
			toast.success("Effect saved");
			ipcRenderer.send("editor:asset-updated", "Effect", fileData);
		} catch (error) {
			console.error("Failed to save Effect:", error);
			toast.error("Failed to save Effect");
		}
	}

	public async saveAs(filePath: string): Promise<void> {
		await this.save(filePath);
	}

	public async importFile(filePath: string): Promise<void> {
		try {
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

	public async importQuarksFile(filePath: string): Promise<void> {
		try {
			if (this.editor.graph) {
				await this.editor.graph.loadFromQuarksFile(filePath);
				toast.success("Quarks file imported");
			} else {
				toast.error("Failed to import Quarks file: Graph not available");
			}
		} catch (error) {
			console.error("Failed to import Quarks file:", error);
			toast.error("Failed to import Quarks file");
		}
	}
}
