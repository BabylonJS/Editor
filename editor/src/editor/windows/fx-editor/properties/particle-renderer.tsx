import { Component, ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorTextureField } from "../../../layout/inspector/fields/texture";
import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";
import { EditorInspectorStringField } from "../../../layout/inspector/fields/string";

import { ParticleSystem, Constants, Material } from "babylonjs";
import type { VFXEffectNode } from "../VFX";
import { VFXParticleSystem, VFXSolidParticleSystem } from "../VFX";
import { IFXEditor } from "..";
import { VFXValueUtils } from "../VFX/utils/valueParser";
import { VFXValueEditor } from "./vfx-value-editor";

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
		const systemType = isVFXSolidParticleSystem ? "solid" : "base";

		return (
			<>
				{/* System Mode */}
				<div className="px-2 text-sm text-muted-foreground">System Mode: {systemType === "solid" ? "Mesh (Solid)" : "Billboard (Base)"}</div>

				{/* Billboard Mode - только для base */}
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
						<EditorInspectorSwitchField
							object={system}
							property="isBillboardBased"
							label="Is Billboard Based"
							onChange={() => this.props.onChange()}
						/>
					</>
				)}

				{/* World Space */}
				{isVFXParticleSystem && (() => {
					// Для VFXParticleSystem, worldSpace = !isLocal
					const proxy = {
						get worldSpace() {
							return !system.isLocal;
						},
						set worldSpace(value: boolean) {
							system.isLocal = !value;
						},
					};
					return <EditorInspectorSwitchField object={proxy} property="worldSpace" label="World Space" onChange={() => this.props.onChange()} />;
				})()}
				{isVFXSolidParticleSystem && (
					<EditorInspectorSwitchField
						object={system}
						property="worldSpace"
						label="World Space"
						onChange={() => this.props.onChange()}
					/>
				)}

				{/* Material - для обеих систем */}
				{this._getMaterialField()}

				{/* Blend Mode - только для base */}
				{isVFXParticleSystem && (
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
				)}

				{/* Material Properties - только для solid */}
				{isVFXSolidParticleSystem && this._getMaterialProperties()}

				{/* Texture */}
				{this._getTextureField()}

				{/* Render Order */}
				{this._getRenderOrderField()}

				{/* UV Tile */}
				{this._getUVTileSection()}

				{/* Start Tile Index */}
				{this._getStartTileIndexField()}

				{/* Soft Particles */}
				{isVFXParticleSystem && (
					<EditorInspectorSwitchField object={system} property="softParticles" label="Soft Particles" onChange={() => this.props.onChange()} />
				)}
				{isVFXSolidParticleSystem && (
					<EditorInspectorSwitchField object={system} property="softParticles" label="Soft Particles" onChange={() => this.props.onChange()} />
				)}

				{/* Geometry - только для solid */}
				{isVFXSolidParticleSystem && this._getGeometryField()}
			</>
		);
	}

	private _getMaterialField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;

		// Для VFXSolidParticleSystem, material ID хранится в system.material
		if (system instanceof VFXSolidParticleSystem) {
			return (
				<EditorInspectorStringField
					object={system}
					property="material"
					label="Material"
					onChange={() => this.props.onChange()}
				/>
			);
		}

		// Для VFXParticleSystem, material может быть в config или на texture
		// Пока просто показываем, что material управляется через texture
		return null;
	}

	private _getMaterialProperties(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;
		let material: Material | null = null;

		// Получаем material в зависимости от типа системы
		if (system instanceof VFXSolidParticleSystem && system.mesh && system.mesh.material) {
			material = system.mesh.material;
		} else if (system instanceof VFXParticleSystem) {
			// Для VFXParticleSystem material управляется через blendMode и texture
			// Material properties не доступны напрямую
			return null;
		}

		if (!material) {
			return null;
		}

		const pbrMaterial = material as any;

		return (
			<EditorInspectorSectionField title="Material Properties">
				{/* Transparent */}
				{pbrMaterial.transparencyMode !== undefined && (() => {
					// Proxy для transparent property
					const transparentProxy = {
						get transparent() {
							return pbrMaterial.transparencyMode !== Constants.ALPHA_DISABLE;
						},
						set transparent(value: boolean) {
							pbrMaterial.transparencyMode = value ? Constants.ALPHA_COMBINE : Constants.ALPHA_DISABLE;
						},
					};
					return <EditorInspectorSwitchField object={transparentProxy} property="transparent" label="Transparent" onChange={() => this.props.onChange()} />;
				})()}

				{/* Opacity */}
				{pbrMaterial.alpha !== undefined && (
					<EditorInspectorNumberField
						object={pbrMaterial}
						property="alpha"
						label="Opacity"
						min={0}
						max={1}
						step={0.01}
						onChange={() => this.props.onChange()}
					/>
				)}

				{/* Side */}
				{pbrMaterial.sideOrientation !== undefined && (
					<EditorInspectorListField
						object={pbrMaterial}
						property="sideOrientation"
						label="Side"
						items={[
							{ text: "Front", value: Material.FrontSide },
							{ text: "Back", value: Material.BackSide },
							{ text: "Double", value: Material.DoubleSide },
						]}
						onChange={() => this.props.onChange()}
					/>
				)}

				{/* Blending */}
				{pbrMaterial.alphaMode !== undefined && (
					<EditorInspectorListField
						object={pbrMaterial}
						property="alphaMode"
						label="Blending"
						items={[
							{ text: "Disable", value: Constants.ALPHA_DISABLE },
							{ text: "Combine", value: Constants.ALPHA_COMBINE },
							{ text: "Add", value: Constants.ALPHA_ADD },
							{ text: "Subtract", value: Constants.ALPHA_SUBTRACT },
							{ text: "Multiply", value: Constants.ALPHA_MULTIPLY },
							{ text: "Maximized", value: Constants.ALPHA_MAXIMIZED },
							{ text: "One One", value: Constants.ALPHA_ONEONE },
							{ text: "Pre-multiplied", value: Constants.ALPHA_PREMULTIPLIED },
							{ text: "Pre-multiplied Pixels", value: Constants.ALPHA_PREMULTIPLIED_PORTPONE },
							{ text: "Interpolate", value: Constants.ALPHA_INTERPOLATE },
							{ text: "Screen Mode", value: Constants.ALPHA_SCREENMODE },
						]}
						onChange={() => this.props.onChange()}
					/>
				)}

				{/* Color */}
				{pbrMaterial.albedoColor !== undefined && (
					<EditorInspectorColorField
						object={pbrMaterial}
						property="albedoColor"
						label="Color"
						onChange={() => this.props.onChange()}
					/>
				)}
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

	private _getRenderOrderField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;

		// Для VFXParticleSystem, renderOrder хранится в renderingGroupId
		if (system instanceof VFXParticleSystem) {
			return (
				<EditorInspectorNumberField
					object={system}
					property="renderingGroupId"
					label="Render Order"
					min={0}
					step={1}
					onChange={() => this.props.onChange()}
				/>
			);
		}

		// Для VFXSolidParticleSystem, renderOrder хранится в system.renderOrder и применяется к mesh.renderingGroupId
		if (system instanceof VFXSolidParticleSystem) {
			// Создаем proxy объект для доступа к renderOrder через mesh.renderingGroupId
			const proxy = {
				get renderingGroupId() {
					return system.mesh?.renderingGroupId ?? system.renderOrder ?? 0;
				},
				set renderingGroupId(value: number) {
					if (system.mesh) {
						system.mesh.renderingGroupId = value;
					}
					system.renderOrder = value;
				},
			};

			return (
				<EditorInspectorNumberField
					object={proxy}
					property="renderingGroupId"
					label="Render Order"
					min={0}
					step={1}
					onChange={() => this.props.onChange()}
				/>
			);
		}

		return null;
	}

	private _getUVTileSection(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;

		// Для VFXParticleSystem, используем spriteCellWidth и spriteCellHeight
		if (system instanceof VFXParticleSystem) {
			return (
				<EditorInspectorSectionField title="UV Tile">
					<EditorInspectorNumberField object={system} property="spriteCellWidth" label="U Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
					<EditorInspectorNumberField object={system} property="spriteCellHeight" label="V Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
					{/* TODO: Add blendTiles if available for VFXParticleSystem */}
				</EditorInspectorSectionField>
			);
		}

		// Для VFXSolidParticleSystem, используем uTileCount и vTileCount
		if (system instanceof VFXSolidParticleSystem) {
			return (
				<EditorInspectorSectionField title="UV Tile">
					<EditorInspectorNumberField object={system} property="uTileCount" label="U Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
					<EditorInspectorNumberField object={system} property="vTileCount" label="V Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
					{system.blendTiles !== undefined && (
						<EditorInspectorSwitchField object={system} property="blendTiles" label="Blend Tiles" onChange={() => this.props.onChange()} />
					)}
				</EditorInspectorSectionField>
			);
		}

		return null;
	}

	private _getStartTileIndexField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;

		// Для VFXParticleSystem, используем startSpriteCellID
		if (system instanceof VFXParticleSystem) {
			return (
				<EditorInspectorNumberField
					object={system}
					property="startSpriteCellID"
					label="Start Tile Index"
					min={0}
					step={1}
					onChange={() => this.props.onChange()}
				/>
			);
		}

		// Для VFXSolidParticleSystem, используем startTileIndex (VFXValue)
		if (system instanceof VFXSolidParticleSystem && system.startTileIndex !== undefined) {
			const getValue = () => system.startTileIndex!;
			const setValue = (value: any) => {
				system.startTileIndex = value;
				this.props.onChange();
			};

			return (
				<div className="px-2">
					<VFXValueEditor value={getValue()} onChange={setValue} label="Start Tile Index" />
				</div>
			);
		}

		return null;
	}

	private _getGeometryField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system || !(nodeData.system instanceof VFXSolidParticleSystem)) {
			return null;
		}

		const system = nodeData.system as VFXSolidParticleSystem;
		const mesh = system.mesh;

		return (
			<div className="flex gap-2 items-center px-2">
				<div className="w-1/3 text-sm">Geometry</div>
				<div className="w-2/3 px-2">
					{system.instancingGeometry ? (
						<div className="text-sm">{system.instancingGeometry}</div>
					) : mesh ? (
						<div className="text-sm">{mesh.name}</div>
					) : (
						<div className="text-sm text-muted-foreground">No geometry</div>
					)}
				</div>
			</div>
		);
	}
}
