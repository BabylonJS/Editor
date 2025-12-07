import { Component, ReactNode, DragEvent } from "react";
import { Scene } from "babylonjs";
import { extname } from "path/posix";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorTextureField } from "../../../layout/inspector/fields/texture";

import { Button } from "../../../../ui/shadcn/ui/button";
import { AiOutlineClose } from "react-icons/ai";
import { getProjectAssetsRootUrl } from "../../../../project/configuration";

import { IFXParticleData } from "./types";

export interface IFXEditorParticleRendererPropertiesProps {
	particleData: IFXParticleData;
	scene?: Scene;
	onChange: () => void;
}

export interface IFXEditorParticleRendererPropertiesState {
	meshDragOver: boolean;
}

export class FXEditorParticleRendererProperties extends Component<IFXEditorParticleRendererPropertiesProps, IFXEditorParticleRendererPropertiesState> {
	public constructor(props: IFXEditorParticleRendererPropertiesProps) {
		super(props);
		this.state = {
			meshDragOver: false,
		};
	}

	public render(): ReactNode {
		const { particleData } = this.props;
		const renderMode = particleData.particleRenderer.renderMode;

		return (
			<>
				<EditorInspectorListField
					object={particleData.particleRenderer}
					property="renderMode"
					label="RenderMode"
					items={[
						{ text: "Billboard", value: "Billboard" },
						{ text: "Stretched Billboard", value: "StretchedBillboard" },
						{ text: "Mesh", value: "Mesh" },
						{ text: "Trail", value: "Trail" },
					]}
					onChange={() => this.props.onChange()}
				/>
				<EditorInspectorSwitchField object={particleData.particleRenderer} property="worldSpace" label="World Space" />
				{/* TODO: Material field */}
				<EditorInspectorListField
					object={particleData.particleRenderer}
					property="type"
					label="Type"
					items={[
						{ text: "Standard", value: "Standard" },
						{ text: "Additive", value: "Additive" },
						{ text: "Multiply", value: "Multiply" },
					]}
				/>
				<EditorInspectorSwitchField object={particleData.particleRenderer} property="transparent" label="Transparent" />
				<EditorInspectorNumberField object={particleData.particleRenderer} property="opacity" label="Opacity" min={0} max={1} step={0.01} />
				<EditorInspectorListField
					object={particleData.particleRenderer}
					property="side"
					label="Side"
					items={[
						{ text: "Front", value: "Front" },
						{ text: "Back", value: "Back" },
						{ text: "Double", value: "Double" },
					]}
				/>
				<EditorInspectorListField
					object={particleData.particleRenderer}
					property="blending"
					label="Blending"
					items={[
						{ text: "Add", value: "Add" },
						{ text: "Multiply", value: "Multiply" },
						{ text: "Standard", value: "Standard" },
					]}
				/>
				<EditorInspectorColorField object={particleData.particleRenderer} property="color" label="Color" />
				<EditorInspectorNumberField object={particleData.particleRenderer} property="renderOrder" label="RenderOrder" step={1} />
				{this._getUVTileSection()}
				{this._getTextureField()}
				{this._getRenderModeSpecificProperties(renderMode)}
				<EditorInspectorSwitchField object={particleData.particleRenderer} property="softParticles" label="Soft Particles" />
			</>
		);
	}

	private _getUVTileSection(): ReactNode {
		const { particleData } = this.props;

		return (
			<EditorInspectorSectionField title="UV Tile">
				<EditorInspectorNumberField object={particleData.particleRenderer.uvTile} property="column" label="Column" min={1} step={1} />
				<EditorInspectorNumberField object={particleData.particleRenderer.uvTile} property="row" label="Row" min={1} step={1} />
				<EditorInspectorNumberField object={particleData.particleRenderer.uvTile} property="startTileIndex" label="Start Tile Index" min={0} step={1} />
				<EditorInspectorSwitchField object={particleData.particleRenderer.uvTile} property="blendTiles" label="Blend Tiles" />
			</EditorInspectorSectionField>
		);
	}

	private _getTextureField(): ReactNode {
		const { particleData, scene } = this.props;

		if (!scene) {
			return null;
		}

		return (
			<EditorInspectorTextureField
				object={particleData.particleRenderer}
				property="texture"
				title="Texture"
				scene={scene}
				onChange={() => this.props.onChange()}
			/>
		);
	}

	private _getRenderModeSpecificProperties(renderMode: string): ReactNode {
		if (renderMode === "Mesh") {
			return this._getMeshField();
		}

		// TODO: Add properties for other render modes (StretchedBillboard, Trail, etc.)
		return null;
	}

	private _getMeshField(): ReactNode {
		const { particleData } = this.props;

		return (
			<div className="flex gap-2 items-center px-2">
				<div className="w-1/3">Mesh</div>
				<div
					onDrop={(ev) => this._handleMeshDrop(ev)}
					onDragOver={this._handleMeshDragOver}
					onDragLeave={this._handleMeshDragLeave}
					className={`flex items-center px-5 py-2 rounded-lg w-2/3 ${
						this.state.meshDragOver ? "bg-muted-foreground/75 dark:bg-muted-foreground/20" : "bg-muted-foreground/10 dark:bg-muted-foreground/5"
					} transition-all duration-300 ease-in-out`}
				>
					<div className="flex-1 text-center text-ellipsis overflow-hidden whitespace-nowrap">
						{particleData.particleRenderer.meshPath || "Drop mesh file here"}
					</div>
					{particleData.particleRenderer.meshPath && (
						<Button
							variant="ghost"
							size="sm"
							className="w-6 h-6 p-0"
							onClick={() => {
								particleData.particleRenderer.meshPath = null;
								this.props.onChange();
							}}
						>
							<AiOutlineClose className="w-4 h-4" />
						</Button>
					)}
				</div>
			</div>
		);
	}

	private _handleMeshDrop = (ev: DragEvent<HTMLDivElement>): void => {
		ev.preventDefault();
		ev.stopPropagation();
		this.setState({ meshDragOver: false });

		try {
			const data = JSON.parse(ev.dataTransfer.getData("assets")) as string[];
			if (!data || !data.length) {
				return;
			}

			const absolutePath = data[0];
			const extension = extname(absolutePath).toLowerCase();

			const meshExtensions = [".x", ".b3d", ".dae", ".glb", ".gltf", ".fbx", ".stl", ".lwo", ".dxf", ".obj", ".3ds", ".ms3d", ".blend", ".babylon"];
			if (!meshExtensions.includes(extension)) {
				return;
			}

			const rootUrl = getProjectAssetsRootUrl();
			if (!rootUrl) {
				return;
			}

			const relativePath = absolutePath.replace(rootUrl, "");
			this.props.particleData.particleRenderer.meshPath = relativePath;
			this.props.onChange();
		} catch (e) {
			console.error("Failed to handle mesh drop", e);
		}
	};

	private _handleMeshDragOver = (ev: DragEvent<HTMLDivElement>): void => {
		ev.preventDefault();
		ev.stopPropagation();
		if (ev.dataTransfer.types.includes("assets")) {
			this.setState({ meshDragOver: true });
		}
	};

	private _handleMeshDragLeave = (ev: DragEvent<HTMLDivElement>): void => {
		ev.preventDefault();
		ev.stopPropagation();
		this.setState({ meshDragOver: false });
	};
}

