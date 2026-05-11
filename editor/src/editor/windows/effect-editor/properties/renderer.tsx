import { Component, ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorTextureField } from "../../../layout/inspector/fields/texture";
import { EditorInspectorGeometryField } from "../../../layout/inspector/fields/geometry";

import { Material } from "@babylonjs/core/Materials/material";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { RenderMode as QuarksRenderMode } from "babylon.quarks";

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

import { createParticleUiProxy, isBaseParticleSystem, isSolidParticleSystem } from "../compat-lite";
import type { IQuarksNode } from "../quarks-bridge";
import type { ParticleSystem as QuarksParticleSystem } from "babylon.quarks";
import { IEffectEditor } from "..";

export interface IEffectEditorParticleRendererPropertiesProps {
	nodeData: IQuarksNode;
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

		if (nodeData.type !== "particle" || !nodeData.data) {
			return null;
		}

		const system = nodeData.data as QuarksParticleSystem;
		const particle = createParticleUiProxy(system);
		const isSolidSystem = isSolidParticleSystem(system);
		const isBaseSystem = isBaseParticleSystem(system);
		const renderMode = system.renderMode as QuarksRenderMode;
		const renderModeLabel = this._getRenderModeLabel(renderMode);
		const isBillboardRenderMode =
			renderMode === QuarksRenderMode.BillBoard ||
			renderMode === QuarksRenderMode.StretchedBillBoard ||
			renderMode === QuarksRenderMode.HorizontalBillBoard ||
			renderMode === QuarksRenderMode.VerticalBillBoard;

		return (
			<>
				<div className="px-2 text-sm text-muted-foreground">Render Mode: {renderModeLabel}</div>
				<EditorInspectorListField
					object={system}
					property="renderMode"
					label="Render Mode"
					items={[
						{ text: "Billboard", value: QuarksRenderMode.BillBoard },
						{ text: "Stretched Billboard", value: QuarksRenderMode.StretchedBillBoard },
						{ text: "Mesh", value: QuarksRenderMode.Mesh },
						{ text: "Trail", value: QuarksRenderMode.Trail },
						{ text: "Horizontal Billboard", value: QuarksRenderMode.HorizontalBillBoard },
						{ text: "Vertical Billboard", value: QuarksRenderMode.VerticalBillBoard },
					]}
					onChange={(value) => this._handleRenderModeChanged(system as QuarksParticleSystem, value as QuarksRenderMode)}
				/>

				{/* Billboard Mode - только для base */}
				{isBaseSystem && isBillboardRenderMode && (
					<>
						<EditorInspectorListField
							object={particle}
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
						<EditorInspectorSwitchField object={particle} property="isBillboardBased" label="Is Billboard Based" onChange={() => this.props.onChange()} />
					</>
				)}

				{/* World Space (isLocal inverted) */}
				{(() => {
					const proxy = {
						get worldSpace() {
							return !particle.isLocal;
						},
						set worldSpace(value: boolean) {
							particle.isLocal = !value;
						},
					};
					return <EditorInspectorSwitchField object={proxy} property="worldSpace" label="World Space" onChange={() => this.props.onChange()} />;
				})()}

				{/* Material Inspector - только для solid с материалом */}
				{isSolidSystem && this._getMaterialInspector()}

				{/* Blend Mode - только для base */}
				{isBaseSystem && (
					<EditorInspectorListField
						object={particle}
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

				{/* Soft Particles - only for ParticleSystem */}
				{isBaseSystem && <EditorInspectorSwitchField object={system} property="softParticles" label="Soft Particles" onChange={() => this.props.onChange()} />}

				{/* Geometry - только для solid */}
				{isSolidSystem && this._getGeometryField()}
			</>
		);
	}

	private _getMaterialInspector(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data) {
			return null;
		}

		const system = nodeData.data;

		// Material inspector for solid-mode particle systems.
		if (!isSolidParticleSystem(system) || !(system as any).mesh || !(system as any).mesh.material) {
			return null;
		}

		const material = (system as any).mesh.material;
		return this._getMaterialInspectorComponent(material, (system as any).mesh);
	}

	private _handleRenderModeChanged(system: QuarksParticleSystem, renderMode: QuarksRenderMode): void {
		const particle = createParticleUiProxy(system);
		system.renderMode = renderMode;

		// Keep emitter shape model aligned with selected render mode.
		if (renderMode === QuarksRenderMode.Mesh) {
			if (!isSolidParticleSystem(system)) {
				particle.createSphereEmitter(1, Math.PI * 2, 1);
			}
		} else if (isSolidParticleSystem(system)) {
			particle.createPointEmitter();
		}

		this.props.onChange();
	}

	private _getRenderModeLabel(mode: QuarksRenderMode): string {
		switch (mode) {
			case QuarksRenderMode.BillBoard:
				return "Billboard";
			case QuarksRenderMode.StretchedBillBoard:
				return "Stretched Billboard";
			case QuarksRenderMode.Mesh:
				return "Mesh";
			case QuarksRenderMode.Trail:
				return "Trail";
			case QuarksRenderMode.HorizontalBillBoard:
				return "Horizontal Billboard";
			case QuarksRenderMode.VerticalBillBoard:
				return "Vertical Billboard";
			default:
				return "Unknown";
		}
	}

	private _getMaterialInspectorComponent(material: Material, mesh?: any): ReactNode {
		switch (material.getClassName()) {
			case "PBRMaterial":
				return <EditorPBRMaterialInspector mesh={mesh} material={material as any} />;

			case "StandardMaterial":
				return <EditorStandardMaterialInspector mesh={mesh} material={material as any} />;

			case "NodeMaterial":
				return <EditorNodeMaterialInspector mesh={mesh} material={material as any} />;

			case "MultiMaterial":
				return <EditorMultiMaterialInspector material={material as any} />;

			case "SkyMaterial":
				return <EditorSkyMaterialInspector mesh={mesh} material={material as any} />;

			case "GridMaterial":
				return <EditorGridMaterialInspector mesh={mesh} material={material as any} />;

			case "NormalMaterial":
				return <EditorNormalMaterialInspector mesh={mesh} material={material as any} />;

			case "WaterMaterial":
				return <EditorWaterMaterialInspector mesh={mesh} material={material as any} />;

			case "LavaMaterial":
				return <EditorLavaMaterialInspector mesh={mesh} material={material as any} />;

			case "TriPlanarMaterial":
				return <EditorTriPlanarMaterialInspector mesh={mesh} material={material as any} />;

			case "CellMaterial":
				return <EditorCellMaterialInspector mesh={mesh} material={material as any} />;

			case "FireMaterial":
				return <EditorFireMaterialInspector mesh={mesh} material={material as any} />;

			case "GradientMaterial":
				return <EditorGradientMaterialInspector mesh={mesh} material={material as any} />;

			default:
				return null;
		}
	}

	private _getTextureField(): ReactNode {
		const { nodeData, editor } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data || !editor.preview?.scene) {
			return null;
		}

		const system = nodeData.data;

		// Base mode uses particleTexture, solid mode texture is driven by material.
		if (isBaseParticleSystem(system)) {
			return (
				<EditorInspectorTextureField
					object={createParticleUiProxy(system)}
					property="particleTexture"
					title="Texture"
					scene={editor.preview.scene as any}
					onChange={() => this.props.onChange()}
				/>
			);
		}

		return null;
	}

	private _getRenderOrderField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data) {
			return null;
		}

		const system = nodeData.data;

		// Base mode stores render order in renderingGroupId.
		if (isBaseParticleSystem(system)) {
			return <EditorInspectorNumberField object={createParticleUiProxy(system)} property="renderingGroupId" label="Render Order" min={0} step={1} onChange={() => this.props.onChange()} />;
		}

		// Solid mode keeps renderOrder and mirrors it to mesh.renderingGroupId.
		if (isSolidParticleSystem(system)) {
			// Создаем proxy объект для доступа к renderOrder через mesh.renderingGroupId
			const proxy = {
				get renderingGroupId() {
					return (system as any).mesh?.renderingGroupId ?? system.renderOrder ?? 0;
				},
				set renderingGroupId(value: number) {
					if ((system as any).mesh) {
						(system as any).mesh.renderingGroupId = value;
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

		if (nodeData.type !== "particle" || !nodeData.data) {
			return null;
		}

		const system = nodeData.data;

		// UV Tile only available for ParticleSystem (sprite sheets)
		if (isBaseParticleSystem(system)) {
			return (
				<EditorInspectorSectionField title="UV Tile">
					<EditorInspectorNumberField object={createParticleUiProxy(system)} property="spriteCellWidth" label="U Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
					<EditorInspectorNumberField object={createParticleUiProxy(system)} property="spriteCellHeight" label="V Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
				</EditorInspectorSectionField>
			);
		}

		// SolidParticleSystem uses mesh UVs, no tile settings
		return null;
	}

	private _getStartTileIndexField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data) {
			return null;
		}

		const system = nodeData.data;

		// Start Tile Index only available for ParticleSystem (sprite sheets)
		if (isBaseParticleSystem(system)) {
			return <EditorInspectorNumberField object={createParticleUiProxy(system)} property="startSpriteCellID" label="Start Tile Index" min={0} step={1} onChange={() => this.props.onChange()} />;
		}

		// SolidParticleSystem uses mesh UVs, no tile index
		return null;
	}

	private _getGeometryField(): ReactNode {
		const { nodeData, editor } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data || !isSolidParticleSystem(nodeData.data) || !editor.preview?.scene) {
			return null;
		}

		const system = nodeData.data as QuarksParticleSystem;

		// Store reference to source mesh in a custom property
		// Since SPS disposes the source mesh after addShape, we need to store it separately
		if (!(system as any)._sourceMesh) {
			(system as any)._sourceMesh = null;
		}

		const proxy = {
			get particleMesh() {
				// Return stored source mesh or null
				return (system as any)._sourceMesh || null;
			},
			set particleMesh(value: Mesh | null) {
				if (!value) {
					// Clear geometry
					(system as any)._sourceMesh = null;
					return;
				}

				// Clone mesh to avoid disposing the original asset
				const clonedMesh = value.clone(`${nodeData.name}_particleMesh_temp`, null, false, false);
				if (!clonedMesh) {
					console.error("[Geometry Field] Failed to clone mesh");
					return;
				}

				// Store reference to source mesh for UI display
				(system as any)._sourceMesh = value;

				// Replace the particle mesh (this will rebuild the entire SPS)
				createParticleUiProxy(system).replaceParticleMesh(clonedMesh);

				// Notify change
				this.props.onChange();
			},
		};

		return <EditorInspectorGeometryField object={proxy} property="particleMesh" title="Geometry" scene={editor.preview.scene as any} onChange={() => this.props.onChange()} />;
	}
}
