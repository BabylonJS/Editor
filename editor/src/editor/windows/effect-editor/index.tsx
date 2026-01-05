import { ipcRenderer } from "electron";
import { readJSON, writeJSON } from "fs-extra";

import { toast } from "sonner";

import { Component, ReactNode } from "react";

import { Toaster } from "../../../ui/shadcn/ui/sonner";

import { EffectEditorLayout } from "./layout";
import { EffectEditorToolbar } from "./toolbar";
import { UnityImportModal } from "./modals/unity-import-modal";

import { projectConfiguration, onProjectConfigurationChangedObservable, IProjectConfiguration } from "../../../project/configuration";
import { EffectEditorAnimation } from "./animation";
import { EffectEditorGraph } from "./graph";
import { EffectEditorPreview } from "./preview";
import { EffectEditorResources } from "./resources";
import { convertUnityPrefabToData } from "./converters";

export interface IEffectEditorWindowProps {
	filePath?: string;
	projectConfiguration?: IProjectConfiguration;
}

export interface IEffectEditorWindowState {
	filePath: string | null;
	isUnityImportModalOpen: boolean;
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
			isUnityImportModalOpen: false,
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

				{/* Unity Import Modal */}
				<UnityImportModal
					isOpen={this.state.isUnityImportModalOpen}
					onClose={() => this.setState({ isUnityImportModalOpen: false })}
					onImport={(contexts, prefabNames) => this.importUnityData(contexts, prefabNames)}
				/>

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

	/**
	 * Import Unity prefab data and create Effect
	 * @param contexts - Array of Unity asset contexts (parsed components + dependencies)
	 * @param prefabNames - Array of prefab names corresponding to contexts
	 */
	public async importUnityData(contexts: any[], prefabNames: string[]): Promise<void> {
		try {
			// Get Scene from preview for model loading
			let scene = this.editor.preview?.scene || undefined;
			if (!scene) {
				// Try waiting a bit for preview to initialize
				await new Promise((resolve) => setTimeout(resolve, 100));
				scene = this.editor.preview?.scene || undefined;
			}
			if (!scene) {
				console.warn("Scene not available for model loading, models will be placeholders");
			}

			// Convert each prefab with its dependencies
			let successCount = 0;
			for (let i = 0; i < contexts.length; i++) {
				try {
					const context = contexts[i];
					const prefabName = prefabNames[i];

					// Validate context structure
					if (!context) {
						console.error("Context is null/undefined:", context);
						toast.error(`Invalid prefab data for ${prefabName}`);
						continue;
					}

					if (!context.prefabComponents) {
						console.error("prefabComponents is missing in context:", context);
						toast.error(`Missing prefab components for ${prefabName}`);
						continue;
					}

					if (!(context.prefabComponents instanceof Map)) {
						console.error("prefabComponents is not a Map:", typeof context.prefabComponents, context.prefabComponents);
						toast.error(`Invalid prefab components type for ${prefabName}`);
						continue;
					}

					// Convert to IData (pass already parsed components, dependencies, and Scene for model parsing)
					const data = await convertUnityPrefabToData(context.prefabComponents, context.dependencies, scene as any);

					// Import into graph
					if (this.editor.graph) {
						await this.editor.graph.loadFromUnityData(data, prefabName);
						successCount++;
					} else {
						toast.error(`Failed to import ${prefabName}: Graph not available`);
					}
				} catch (error) {
					console.error(`Failed to import prefab ${prefabNames[i]}:`, error);
					toast.error(`Failed to import ${prefabNames[i]}`);
				}
			}

			if (successCount > 0) {
				toast.success(`Successfully imported ${successCount} prefab${successCount > 1 ? "s" : ""}`);
			}
		} catch (error) {
			console.error("Failed to import Unity prefabs:", error);
			toast.error("Failed to import Unity prefabs");
			throw error;
		}
	}

	/**
	 * Open Unity import modal
	 */
	public openUnityImportModal(): void {
		this.setState({ isUnityImportModalOpen: true });
	}
}
