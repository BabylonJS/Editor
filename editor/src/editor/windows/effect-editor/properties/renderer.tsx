import { Component, ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorTextureField } from "../../../layout/inspector/fields/texture";
import { EditorInspectorGeometryField } from "../../../layout/inspector/fields/geometry";

import { Material } from "@babylonjs/core/Materials/material";
import { Constants } from "@babylonjs/core/Engines/constants";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ShaderMaterial, Scene as BjsScene } from "babylonjs";
import { ConstantValue, RenderMode as QuarksRenderMode, type ParticleSystem as QuarksParticleSystem } from "babylon.quarks";

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
import { EditorShaderMaterialInspector } from "../../../layout/inspector/material/shader";

import type { IQuarksNode } from "../quarks-bridge";
import type { Editor } from "../../../main";
import { IEffectEditor } from "..";
import {
	applyMeshGeometryToQuarksSystem,
	getEditorGeometryPreviewMesh,
	getEditorGeometrySourceLabel,
	getParticleInstancingTriangleCount,
	getParticleInstancingVertexCount,
	setEditorGeometryPreviewMesh,
} from "../quarks-mesh-geometry";
import {
	isQuarksBillboardFamilyRenderMode,
	isQuarksMeshRenderMode,
	usesQuarksNonMeshBatchInspector,
} from "../quarks-render-mode";

export interface IEffectEditorParticleRendererPropertiesProps {
	nodeData: IQuarksNode;
	editor: IEffectEditor;
	onChange: () => void;
}

export interface IEffectEditorParticleRendererPropertiesState {
	meshDragOver: boolean;
}

function getUiBlendMode(system: QuarksParticleSystem): number {
	if (system.blending === Constants.ALPHA_ADD) {
		return ParticleSystem.BLENDMODE_ADD;
	}
	if (system.blending === Constants.ALPHA_MULTIPLY) {
		return ParticleSystem.BLENDMODE_MULTIPLY;
	}
	if (system.blending === Constants.ALPHA_ONEONE) {
		return ParticleSystem.BLENDMODE_ONEONE;
	}
	return ParticleSystem.BLENDMODE_STANDARD;
}

function setUiBlendMode(system: QuarksParticleSystem, value: number): void {
	system.blending =
		value === ParticleSystem.BLENDMODE_ADD
			? Constants.ALPHA_ADD
			: value === ParticleSystem.BLENDMODE_MULTIPLY
				? Constants.ALPHA_MULTIPLY
				: value === ParticleSystem.BLENDMODE_ONEONE
					? Constants.ALPHA_ONEONE
					: Constants.ALPHA_COMBINE;
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
		const renderMode = system.renderMode as QuarksRenderMode;
		const renderModeLabel = this._getRenderModeLabel(renderMode);
		const isMeshMode = isQuarksMeshRenderMode(system);
		const usesNonMeshBatchInspector = usesQuarksNonMeshBatchInspector(system);
		const showSpriteStyleBatchControls = usesNonMeshBatchInspector || isMeshMode;

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

				{isQuarksBillboardFamilyRenderMode(renderMode) && (
					<div className="px-2 text-sm text-muted-foreground">Billboard orientation is controlled by selected Render Mode.</div>
				)}

				<EditorInspectorSwitchField object={system} property="worldSpace" label="World Space" onChange={() => this.props.onChange()} />

				{/* Mesh: material on batch mesh */}
				{isMeshMode && this._getMaterialInspector()}

				{/* Blend on particle batch (billboard / trail / stretched / mesh) */}
				{showSpriteStyleBatchControls && (
					<EditorInspectorListField
						object={{
							get blendMode() {
								return getUiBlendMode(system);
							},
							set blendMode(value: number) {
								setUiBlendMode(system, value);
							},
						}}
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

				{/* Soft particles: sprite batch path only */}
				{usesNonMeshBatchInspector && <EditorInspectorSwitchField object={system} property="softParticles" label="Soft Particles" onChange={() => this.props.onChange()} />}

				{/* Instanced mesh geometry */}
				{isMeshMode && this._getGeometryField()}
			</>
		);
	}

	private _getMaterialInspector(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data) {
			return null;
		}

		const system = nodeData.data as QuarksParticleSystem;

		const batchMesh = (system as unknown as { mesh?: { material?: Material } }).mesh;
		const material = (batchMesh?.material ?? (system as unknown as { material?: Material }).material) as Material | undefined;

		if (!material) {
			return (
				<div className="px-2 py-2 text-sm text-muted-foreground">
					No material on this system yet. Press Play once if the effect was just imported, or pick a mesh material below after assigning geometry.
				</div>
			);
		}

		return this._getMaterialInspectorComponent(material, batchMesh);
	}

	private _handleRenderModeChanged(system: QuarksParticleSystem, renderMode: QuarksRenderMode): void {
		system.renderMode = renderMode;

		// Mesh mode uses instancing buffers (see babylon.quarks examples / meshMaterial.babylon.js).
		if (renderMode === QuarksRenderMode.Mesh) {
			applyMeshGeometryToQuarksSystem(system, getEditorGeometryPreviewMesh(system));
		} else {
			system.neededToUpdateRender = true;
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
		/**
		 * QuarksLoader resolves serialized materials into Babylon types. Scene meshes often become
		 * {@link StandardMaterial} (`QuarksLoader.createMeshNode`). Particle systems may get
		 * `materialMeta?.sourceMaterial` from that pass — often undefined — and the batch uses an internal
		 * {@link ShaderMaterial} for the VFX draw path.
		 */
		switch (material.getClassName()) {
			case "PBRMaterial":
				return <EditorPBRMaterialInspector mesh={mesh} material={material as any} />;

			case "StandardMaterial":
				return <EditorStandardMaterialInspector mesh={mesh} material={material as any} />;

			case "ShaderMaterial": {
				const scene = this.props.editor.preview?.scene as BjsScene | undefined;
				if (!scene) {
					return <div className="px-2 py-2 text-sm text-muted-foreground">Preview scene is not ready.</div>;
				}
				return <EditorShaderMaterialInspector mesh={mesh} material={material as unknown as ShaderMaterial} scene={scene} onChange={() => this.props.onChange()} />;
			}

			case "NodeMaterial":
				return <EditorNodeMaterialInspector mesh={mesh} material={material as any} />;

			case "MultiMaterial":
				return (
					<EditorMultiMaterialInspector
						material={material as any}
						editor={{ layout: { preview: { lastPickingInfo: null } } } as unknown as Editor}
					/>
				);

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
				return (
					<div className="px-2 py-2 text-sm text-muted-foreground">
						No dedicated inspector for <span className="font-mono">{material.getClassName()}</span>. Quarks imports normally expose StandardMaterial (scene meshes), PBR/Standard on the system when set, or ShaderMaterial on the batch mesh.
					</div>
				);
		}
	}

	private _getTextureField(): ReactNode {
		const { nodeData, editor } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data || !editor.preview?.scene) {
			return null;
		}

		const system = nodeData.data as QuarksParticleSystem;

		if (usesQuarksNonMeshBatchInspector(system) || isQuarksMeshRenderMode(system)) {
			return <EditorInspectorTextureField object={system} property="texture" title="Texture" scene={editor.preview.scene as any} onChange={() => this.props.onChange()} />;
		}

		return null;
	}

	private _getRenderOrderField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data) {
			return null;
		}

		const system = nodeData.data as QuarksParticleSystem;

		if (usesQuarksNonMeshBatchInspector(system)) {
			return (
				<EditorInspectorNumberField
					object={{
						get renderingGroupId() {
							return system.renderOrder;
						},
						set renderingGroupId(value: number) {
							system.renderOrder = value;
						},
					}}
					property="renderingGroupId"
					label="Render Order"
					min={0}
					step={1}
					onChange={() => this.props.onChange()}
				/>
			);
		}

		if (isQuarksMeshRenderMode(system)) {
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

		const system = nodeData.data as QuarksParticleSystem;

		if (usesQuarksNonMeshBatchInspector(system)) {
			return (
				<EditorInspectorSectionField title="UV Tile">
					<EditorInspectorNumberField object={system} property="uTileCount" label="U Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
					<EditorInspectorNumberField object={system} property="vTileCount" label="V Tile Count" min={1} step={1} onChange={() => this.props.onChange()} />
				</EditorInspectorSectionField>
			);
		}

		return null;
	}

	private _getStartTileIndexField(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data) {
			return null;
		}

		const system = nodeData.data as QuarksParticleSystem;

		if (usesQuarksNonMeshBatchInspector(system)) {
			const target = system as QuarksParticleSystem;
			return (
				<EditorInspectorNumberField
					object={{
						get startSpriteCellID() {
							const json = (target.startTileIndex as any)?.toJSON?.();
							if (json?.type === "ConstantValue") {
								return Number(json.value ?? 0);
							}
							return 0;
						},
						set startSpriteCellID(value: number) {
							const safeValue = Math.max(0, Math.floor(value));
							target.startTileIndex = new ConstantValue(safeValue);
						},
					}}
					property="startSpriteCellID"
					label="Start Tile Index"
					min={0}
					step={1}
					onChange={() => this.props.onChange()}
				/>
			);
		}

		return null;
	}

	private _getGeometryField(): ReactNode {
		const { nodeData, editor, onChange } = this.props;

		if (nodeData.type !== "particle" || !nodeData.data || !isQuarksMeshRenderMode(nodeData.data as QuarksParticleSystem) || !editor.preview?.scene) {
			return null;
		}

		const system = nodeData.data as QuarksParticleSystem;

		const previewMesh = getEditorGeometryPreviewMesh(system);
		const sourceLabel = getEditorGeometrySourceLabel(system);
		const verts = getParticleInstancingVertexCount(system);
		const tris = getParticleInstancingTriangleCount(system);
		const embeddedPlaceholder = !previewMesh && sourceLabel ? sourceLabel : undefined;
		const embeddedInstancingCounts =
			!previewMesh && (verts > 0 || tris > 0) ? { vertices: verts, triangles: tris } : undefined;
		const title = previewMesh ? "Geometry" : sourceLabel ? `Geometry (${sourceLabel})` : "Geometry";

		const proxy = {
			get particleMesh() {
				return getEditorGeometryPreviewMesh(system);
			},
			set particleMesh(value: Mesh | null) {
				if (!value) {
					setEditorGeometryPreviewMesh(system, null);
					applyMeshGeometryToQuarksSystem(system, null);
					onChange();
					return;
				}

				setEditorGeometryPreviewMesh(system, value);
				applyMeshGeometryToQuarksSystem(system, value);
				onChange();
			},
		};

		return (
			<EditorInspectorGeometryField
				object={proxy}
				property="particleMesh"
				title={title}
				embeddedPlaceholderText={embeddedPlaceholder}
				embeddedInstancingCounts={embeddedInstancingCounts}
				scene={editor.preview.scene as any}
				onChange={() => onChange()}
			/>
		);
	}
}
