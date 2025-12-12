import { Component, ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorTextureField } from "../../../layout/inspector/fields/texture";

import { ParticleSystem, SolidParticleSystem } from "babylonjs";
import type { VFXEffectNode } from "../VFX";
import { VFXParticleSystem, VFXSolidParticleSystem } from "../VFX";
import { IFXEditor } from "..";

export interface IFXEditorParticleRendererPropertiesProps {
	nodeData: VFXEffectNode;
	editor: IFXEditor;
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
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;
		const isVFXSolidParticleSystem = system instanceof VFXSolidParticleSystem;
		const isVFXParticleSystem = system instanceof VFXParticleSystem;

		return (
			<>
				{isVFXParticleSystem && (
					<>
						<EditorInspectorListField
							object={system}
							property="billboardMode"
							label="Billboard Mode"
							items={[
								{ text: "All", value: ParticleSystem.BILLBOARDMODE_ALL },
								{ text: "Y", value: ParticleSystem.BILLBOARDMODE_Y },
								{ text: "Stretched", value: ParticleSystem.BILLBOARDMODE_STRETCHED },
								{ text: "Stretched Local", value: ParticleSystem.BILLBOARDMODE_STRETCHED_LOCAL },
							]}
							onChange={() => this.props.onChange()}
						/>
						<EditorInspectorSwitchField object={system} property="isLocal" label="World Space" onChange={() => this.props.onChange()} />
					</>
				)}
				{isVFXSolidParticleSystem && (
					<>
						<div className="px-2 text-sm text-muted-foreground">Render Mode: Mesh</div>
						{/* For VFXSolidParticleSystem, material properties are on mesh.material */}
					</>
				)}
				{this._getTextureField()}
				{isVFXParticleSystem && (
					<>
						<EditorInspectorListField
							object={system}
							property="blendMode"
							label="Blend Mode"
							items={[
								{ text: "Add", value: ParticleSystem.BLENDMODE_ADD },
								{ text: "Multiply", value: ParticleSystem.BLENDMODE_MULTIPLY },
								{ text: "Multiply Add", value: ParticleSystem.BLENDMODE_MULTIPLYADD },
								{ text: "One-one", value: ParticleSystem.BLENDMODE_ONEONE },
								{ text: "Standard", value: ParticleSystem.BLENDMODE_STANDARD },
							]}
							onChange={() => this.props.onChange()}
						/>
						{this._getUVTileSection()}
						<EditorInspectorSwitchField object={system} property="softParticles" label="Soft Particles" />
					</>
				)}
				{isVFXSolidParticleSystem && this._getRenderModeSpecificProperties("Mesh")}
			</>
		);
	}

	private _getUVTileSection(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system || !(nodeData.system instanceof VFXParticleSystem)) {
			return null;
		}

		const system = nodeData.system as VFXParticleSystem;

		return (
			<EditorInspectorSectionField title="UV Tile">
				<EditorInspectorNumberField object={system} property="uTileCount" label="U Tile Count" min={1} step={1} />
				<EditorInspectorNumberField object={system} property="vTileCount" label="V Tile Count" min={1} step={1} />
				{/* TODO: Add startTileIndex and blendTiles if available */}
			</EditorInspectorSectionField>
		);
	}

	private _getTextureField(): ReactNode {
		const { nodeData, editor } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system || !editor.preview?.scene) {
			return null;
		}

		const system = nodeData.system;

		// For VFXParticleSystem, use particleTexture
		if (system instanceof VFXParticleSystem) {
			return <EditorInspectorTextureField object={system} property="particleTexture" title="Texture" scene={editor.preview.scene} onChange={() => this.props.onChange()} />;
		}

		// For VFXSolidParticleSystem, texture is on the mesh material
		if (system instanceof VFXSolidParticleSystem && system.mesh && system.mesh.material) {
			const material = system.mesh.material;
			// Check if material has diffuseTexture or other texture properties
			if ((material as any).diffuseTexture) {
				return (
					<EditorInspectorTextureField object={material} property="diffuseTexture" title="Texture" scene={editor.preview.scene} onChange={() => this.props.onChange()} />
				);
			}
		}

		return null;
	}

	private _getRenderModeSpecificProperties(renderMode: string): ReactNode {
		if (renderMode === "Mesh") {
			return this._getMeshField();
		}

		// TODO: Add properties for other render modes (StretchedBillboard, Trail, etc.)
		return null;
	}

	private _getMeshField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system || !(nodeData.system instanceof VFXSolidParticleSystem)) {
			return null;
		}

		const system = nodeData.system as VFXSolidParticleSystem;
		const mesh = system.mesh;

		return (
			<div className="flex gap-2 items-center px-2">
				<div className="w-1/3">Mesh</div>
				<div className="w-2/3 px-2">{mesh ? <div className="text-sm">{mesh.name}</div> : <div className="text-sm text-muted-foreground">No mesh</div>}</div>
			</div>
		);
	}
}
