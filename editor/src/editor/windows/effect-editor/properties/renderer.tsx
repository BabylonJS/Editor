import { Component, ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorTextureField } from "../../../layout/inspector/fields/texture";
import { EditorInspectorGeometryField } from "../../../layout/inspector/fields/geometry";

import { PBRMaterial, StandardMaterial, NodeMaterial, MultiMaterial, Material, ParticleSystem } from "babylonjs";

import { EditorPBRMaterialInspector } from "../../../layout/inspector/material/pbr";
import { EditorStandardMaterialInspector } from "../../../layout/inspector/material/standard";
import { EditorNodeMaterialInspector } from "../../../layout/inspector/material/node";
import { EditorMultiMaterialInspector } from "../../../layout/inspector/material/multi";
import { EditorSkyMaterialInspector } from "../../../layout/inspector/material/sky";
import { EditorGridMaterialInspector } from "../../../layout/inspector/material/grid";
import { EditorNormalMaterialInspector } from "../../../layout/inspector/material/normal";
import { EditorWaterMaterialInspector } from "../../../layout/inspector/material/water";
import { EditorLavaMaterialInspector } from "../../../layout/inspector/material/lava";
import { EditorTriPlanarMaterialInspector } from "../../../layout/inspector/material/tri-planar";
import { EditorCellMaterialInspector } from "../../../layout/inspector/material/cell";
import { EditorFireMaterialInspector } from "../../../layout/inspector/material/fire";
import { EditorGradientMaterialInspector } from "../../../layout/inspector/material/gradient";

import { type EffectNode, EffectSolidParticleSystem, EffectParticleSystem } from "babylonjs-editor-tools";
import { IEffectEditor } from "..";
import { Mesh } from "babylonjs";
import { EffectValueEditor } from "../editors/value";
import { CellMaterial, FireMaterial, GradientMaterial, GridMaterial, LavaMaterial, NormalMaterial, SkyMaterial, TriPlanarMaterial, WaterMaterial } from "babylonjs-materials";

export interface IEffectEditorParticleRendererPropertiesProps {
	nodeData: EffectNode;
	editor: IEffectEditor;
	onChange: () => void;
}

export interface IEffectEditorParticleRendererPropertiesState {
	meshDragOver: boolean;
}

export class EffectEditorParticleRendererProperties extends Component<IEffectEditorParticleRendererPropertiesProps, IEffectEditorParticleRendererPropertiesState> {
	public constructor(props: IEffectEditorParticleRendererPropertiesProps) {
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
		const isEffectSolidParticleSystem = system instanceof EffectSolidParticleSystem;
		const isEffectParticleSystem = system instanceof EffectParticleSystem;
		const systemType = isEffectSolidParticleSystem ? "solid" : "base";

		return (
			<>
				{/* System Mode */}
				<div className="px-2 text-sm text-muted-foreground">System Mode: {systemType === "solid" ? "Mesh (Solid)" : "Billboard (Base)"}</div>

				{/* Billboard Mode - только для base */}
				{isEffectParticleSystem && (
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
						<EditorInspectorSwitchField object={system} property="isBillboardBased" label="Is Billboard Based" onChange={() => this.props.onChange()} />
					</>
				)}

				{/* World Space */}
				{isEffectParticleSystem &&
					(() => {
						// Для VEffectParticleSystem, worldSpace = !isLocal
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
				{isEffectSolidParticleSystem && <EditorInspectorSwitchField object={system} property="worldSpace" label="World Space" onChange={() => this.props.onChange()} />}

				{/* Material Inspector - только для solid с материалом */}
				{isEffectSolidParticleSystem && this._getMaterialInspector()}

				{/* Blend Mode - только для base */}
				{isEffectParticleSystem && (
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

				{/* Texture */}
				{this._getTextureField()}

				{/* Render Order */}
				{this._getRenderOrderField()}

				{/* UV Tile */}
				{this._getUVTileSection()}

				{/* Start Tile Index */}
				{this._getStartTileIndexField()}

				{/* Soft Particles */}
				{isEffectParticleSystem && <EditorInspectorSwitchField object={system} property="softParticles" label="Soft Particles" onChange={() => this.props.onChange()} />}
				{isEffectSolidParticleSystem && (
					<EditorInspectorSwitchField object={system} property="softParticles" label="Soft Particles" onChange={() => this.props.onChange()} />
				)}

				{/* Geometry - только для solid */}
				{isEffectSolidParticleSystem && this._getGeometryField()}
			</>
		);
	}

	private _getMaterialInspector(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;

		// Получаем material только для VEffectSolidParticleSystem
		if (!(system instanceof EffectSolidParticleSystem) || !system.mesh || !system.mesh.material) {
			return null;
		}

		const material = system.mesh.material;
		return this._getMaterialInspectorComponent(material, system.mesh);
	}

	private _getMaterialInspectorComponent(material: Material, mesh?: any): ReactNode {
		switch (material.getClassName()) {
			case "PBRMaterial":
				return <EditorPBRMaterialInspector mesh={mesh} material={material as PBRMaterial} />;

			case "StandardMaterial":
				return <EditorStandardMaterialInspector mesh={mesh} material={material as StandardMaterial} />;

			case "NodeMaterial":
				return <EditorNodeMaterialInspector mesh={mesh} material={material as NodeMaterial} />;

			case "MultiMaterial":
				return <EditorMultiMaterialInspector material={material as MultiMaterial} />;

			case "SkyMaterial":
				return <EditorSkyMaterialInspector mesh={mesh} material={material as SkyMaterial} />;

			case "GridMaterial":
				return <EditorGridMaterialInspector mesh={mesh} material={material as GridMaterial} />;

			case "NormalMaterial":
				return <EditorNormalMaterialInspector mesh={mesh} material={material as NormalMaterial} />;

			case "WaterMaterial":
				return <EditorWaterMaterialInspector mesh={mesh} material={material as WaterMaterial} />;

			case "LavaMaterial":
				return <EditorLavaMaterialInspector mesh={mesh} material={material as LavaMaterial} />;

			case "TriPlanarMaterial":
				return <EditorTriPlanarMaterialInspector mesh={mesh} material={material as TriPlanarMaterial} />;

			case "CellMaterial":
				return <EditorCellMaterialInspector mesh={mesh} material={material as CellMaterial} />;

			case "FireMaterial":
				return <EditorFireMaterialInspector mesh={mesh} material={material as FireMaterial} />;

			case "GradientMaterial":
				return <EditorGradientMaterialInspector mesh={mesh} material={material as GradientMaterial} />;

			default:
				return null;
		}
	}

	private _getTextureField(): ReactNode {
		const { nodeData, editor } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system || !editor.preview?.scene) {
			return null;
		}

		const system = nodeData.system;

		// For VEffectParticleSystem, use particleTexture
		// For VEffectSolidParticleSystem, textures are handled by the material inspector
		if (system instanceof EffectParticleSystem) {
			return <EditorInspectorTextureField object={system} property="particleTexture" title="Texture" scene={editor.preview.scene} onChange={() => this.props.onChange()} />;
		}

		return null;
	}

	private _getRenderOrderField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;

		// Для VEffectParticleSystem, renderOrder хранится в renderingGroupId
		if (system instanceof EffectParticleSystem) {
			return <EditorInspectorNumberField object={system} property="renderingGroupId" label="Render Order" min={0} step={1} onChange={() => this.props.onChange()} />;
		}

		// Для VEffectSolidParticleSystem, renderOrder хранится в system.renderOrder и применяется к mesh.renderingGroupId
		if (system instanceof EffectSolidParticleSystem) {
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

			return <EditorInspectorNumberField object={proxy} property="renderingGroupId" label="Render Order" min={0} step={1} onChange={() => this.props.onChange()} />;
		}

		return null;
	}

	private _getUVTileSection(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;

		// Для VEffectParticleSystem, используем spriteCellWidth и spriteCellHeight
		if (system instanceof EffectParticleSystem) {
			return (
				<EditorInspectorSectionField title="UV Tile">
					<EditorInspectorNumberField object={system} property="spriteCellWidth" label="U Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
					<EditorInspectorNumberField object={system} property="spriteCellHeight" label="V Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
					{/* TODO: Add blendTiles if available for VEffectParticleSystem */}
				</EditorInspectorSectionField>
			);
		}

		// Для VEffectSolidParticleSystem, используем uTileCount и vTileCount
		if (system instanceof EffectSolidParticleSystem) {
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

		// Для VEffectParticleSystem, используем startSpriteCellID
		if (system instanceof EffectParticleSystem) {
			return <EditorInspectorNumberField object={system} property="startSpriteCellID" label="Start Tile Index" min={0} step={1} onChange={() => this.props.onChange()} />;
		}

		// Для VEffectSolidParticleSystem, используем startTileIndex (VEffectValue)
		if (system instanceof EffectSolidParticleSystem && system.startTileIndex !== undefined) {
			const getValue = () => system.startTileIndex!;
			const setValue = (value: any) => {
				system.startTileIndex = value;
				this.props.onChange();
			};

			return (
				<div className="px-2">
					<EffectValueEditor value={getValue()} onChange={setValue} label="Start Tile Index" />
				</div>
			);
		}

		return null;
	}

	private _getGeometryField(): ReactNode {
		const { nodeData, editor } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system || !(nodeData.system instanceof EffectSolidParticleSystem) || !editor.preview?.scene) {
			return null;
		}

		const system = nodeData.system as EffectSolidParticleSystem;

		// Store reference to source mesh in a custom property
		// Since SPS disposes the source mesh after addShape, we need to store it separately
		// We'll use a WeakMap or store it in the system itself
		if (!(system as any)._sourceMesh) {
			(system as any)._sourceMesh = null;
		}

		const proxy = {
			get particleMesh() {
				// Return stored source mesh or null
				return (system as any)._sourceMesh || null;
			},
			set particleMesh(value: Mesh | null) {
				// Store reference to source mesh
				(system as any)._sourceMesh = value;

				if (value) {
					// Clone mesh to avoid disposing the original
					const clonedMesh = value.clone(`${system.name}_particleMesh`);
					clonedMesh.setEnabled(false); // Hide the source mesh

					// Clear existing shapes and add new one
					// Note: SPS doesn't have a clearShapes method, so we need to rebuild
					const capacity = (system as any).getCapacity();
					system.addShape(clonedMesh, capacity);
					system.buildMesh();
					(system as any)._setupMeshProperties();

					// Don't dispose cloned mesh - SPS will manage it
				}
			},
		};

		return <EditorInspectorGeometryField object={proxy} property="particleMesh" title="Geometry" scene={editor.preview.scene} onChange={() => this.props.onChange()} />;
	}
}
