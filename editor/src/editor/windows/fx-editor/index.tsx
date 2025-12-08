import { ipcRenderer } from "electron";
import { readJSON, writeJSON } from "fs-extra";

import { toast } from "sonner";

import { Component, ReactNode } from "react";

import { Toaster } from "../../../ui/shadcn/ui/sonner";

import { FXEditorLayout } from "./layout";
import { FXEditorToolbar } from "./toolbar";

import { projectConfiguration, onProjectConfigurationChangedObservable, IProjectConfiguration } from "../../../project/configuration";

export interface IFXEditorWindowProps {
	filePath?: string;
	projectConfiguration?: IProjectConfiguration;
}

export interface IFXEditorWindowState {
	filePath: string | null;
}

export default class FXEditorWindow extends Component<IFXEditorWindowProps, IFXEditorWindowState> {
	private layout: FXEditorLayout | null = null;

	public constructor(props: IFXEditorWindowProps) {
		super(props);

		this.state = {
			filePath: props.filePath || null,
		};
	}

	public render(): ReactNode {
		return (
			<>
				<div className="flex flex-col w-screen h-screen">
					<FXEditorToolbar fxEditor={this} />

					<div className="w-full h-full overflow-hidden">
						<FXEditorLayout ref={(r) => (this.layout = r)} filePath={this.state.filePath || ""} />
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
			toast.success("FX saved");
			ipcRenderer.send("editor:asset-updated", "fx", data);
		} catch (error) {
			toast.error("Failed to save FX");
		}
	}

	public async saveAs(filePath: string): Promise<void> {
		this.setState({ filePath });
		await this.save();
	}

	public async importFile(filePath: string): Promise<void> {
		try {
			// Get graph component reference from layout
			if (this.layout && this.layout.graph) {
				await this.layout.graph.loadFromFile(filePath);
				toast.success("FX imported");
			} else {
				toast.error("Failed to import FX: Graph not available");
			}
		} catch (error) {
			console.error("Failed to import FX:", error);
			toast.error("Failed to import FX");
		}
	}
}
