import { writeJSON } from "fs-extra";

import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { Mesh, TransformNode } from "babylonjs";
import { IRagDollConfiguration } from "babylonjs-editor-tools";

import { toast } from "sonner";

import { showAlert } from "../../../ui/dialog";

import { Editor } from "../../main";

import { RagdollEditorToolbar } from "./toolbar";
import { RagdollEditorPreview } from "./preview";
import { RagdollEditorEmptyState } from "./empty";
import { RagdollEditorInspector } from "./inspector";

export interface IRagdollEditorProps {
	editor: Editor;
	absolutePath: string;
	configuration: IRagDollConfiguration;
}

export interface IIRagdollEditorPropsState {
	loading: boolean;
	assetRelativePath?: string;
}

export class RagdollEditor extends Component<IRagdollEditorProps, IIRagdollEditorPropsState> {
	public preview: RagdollEditorPreview;
	public inspector: RagdollEditorInspector;

	public constructor(props: IRagdollEditorProps) {
		super(props);

		this.state = {
			loading: false,
			assetRelativePath: props.configuration.assetRelativePath,
		};
	}

	public render(): ReactNode {
		return (
			<div className="relative flex flex-col gap-2 w-full h-full overflow-hidden">
				<RagdollEditorToolbar ragdollEditor={this} />

				{!this.state.assetRelativePath && <RagdollEditorEmptyState ragdollEditor={this} />}

				<div hidden={!this.state.assetRelativePath} className="w-full h-[400px]">
					<RagdollEditorPreview ref={(r) => (this.preview = r!)} editor={this.props.editor} ragdollEditor={this} />
				</div>

				<div hidden={!this.state.assetRelativePath} className="text-center">
					Ragdoll Configuration
				</div>

				<div hidden={!this.state.assetRelativePath} className="w-full pb-2 overflow-y-auto">
					<RagdollEditorInspector ref={(r) => (this.inspector = r!)} ragdollEditor={this} configuration={this.props.configuration} />
				</div>

				<div
					className={`
						flex flex-col justify-center items-center gap-5
						absolute top-0 left-0 w-full h-full z-50
						${this.state.loading ? "opacity-100 bg-black/50 backdrop-blur-sm" : "opacity-0 bg-transparent backdrop-blur-none pointer-events-none"}
						transition-all duration-300 ease-in-out
					`}
				>
					<Grid width={64} height={64} color="gray" />
					<div>Loading scene...</div>
				</div>
			</div>
		);
	}

	public componentDidMount(): void {
		if (this.state.assetRelativePath) {
			this.loadAsset(this.state.assetRelativePath);
		}
	}

	public async save(): Promise<void> {
		try {
			const configuration = {
				assetRelativePath: this.state.assetRelativePath,
				rootNodeId: this.inspector.state.selectedRootNode?.id ?? "",
				skeletonName: this.inspector.state.selectedSkeleton?.name ?? "",
				scalingFactor: this.props.configuration.scalingFactor,
				runtimeConfiguration: this.props.configuration.runtimeConfiguration.map((config) => ({
					...config,
					rotationAxis: config.rotationAxis?.asArray(),
					boneOffsetAxis: config.boneOffsetAxis?.asArray(),
				})),
			};

			await writeJSON(this.props.absolutePath, configuration, {
				spaces: "\t",
				encoding: "utf-8",
			});

			toast.success("Ragdoll saved successfully.");
		} catch (e) {
			toast.error(`Failed to save Ragdoll: ${e.message}`);
		}
	}

	public async loadAsset(relativePath: string): Promise<void> {
		this.setState({
			loading: true,
		});

		try {
			await this.preview.loadFromRelativePath(relativePath);

			this.inspector.setState({
				selectedSkeleton: this.preview.scene.skeletons.find((s) => s.name === this.props.configuration.skeletonName) ?? this.preview.scene.skeletons[0],
				selectedRootNode: (this.preview.scene.getNodeById(this.props.configuration.rootNodeId) as Mesh | TransformNode) ?? this.preview.scene.meshes[1],
			});
		} catch (e) {
			showAlert(`Failed to load asset`, `An error occurred while loading the asset: ${e.message}`);
		}

		this.setState({
			loading: false,
			assetRelativePath: relativePath,
		});
	}
}
