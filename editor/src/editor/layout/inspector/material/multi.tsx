import { extname } from "path/posix";

import { Component, DragEvent, ReactNode } from "react";

import { Material, MultiMaterial, PBRMaterial, StandardMaterial } from "babylonjs";
import { SkyMaterial, GridMaterial, NormalMaterial, WaterMaterial, TriPlanarMaterial, LavaMaterial, CellMaterial, FireMaterial, GradientMaterial } from "babylonjs-materials";

import { Table, TableBody, TableCaption, TableCell, TableRow } from "../../../../ui/shadcn/ui/table";

import { loadImportedMaterial } from "../../preview/import/import";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorSectionField } from "../fields/section";

import { EditorSkyMaterialInspector } from "./sky";
import { EditorPBRMaterialInspector } from "./pbr";
import { EditorCellMaterialInspector } from "./cell";
import { EditorGridMaterialInspector } from "./grid";
import { EditorFireMaterialInspector } from "./fire";
import { EditorLavaMaterialInspector } from "./lava";
import { EditorWaterMaterialInspector } from "./water";
import { EditorNormalMaterialInspector } from "./normal";
import { EditorGradientMaterialInspector } from "./gradient";
import { EditorStandardMaterialInspector } from "./standard";
import { EditorTriPlanarMaterialInspector } from "./tri-planar";

export interface IEditorPBRMaterialInspectorProps {
	material: MultiMaterial;
}

export interface IEditorMultiMaterialInspectorState {
	material: Material | null;
}

export class EditorMultiMaterialInspector extends Component<IEditorPBRMaterialInspectorProps, IEditorMultiMaterialInspectorState> {
	public constructor(props: IEditorPBRMaterialInspectorProps) {
		super(props);

		this.state = {
			material: props.material.subMaterials[0] ?? null,
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Multi Material">{this._getMaterialSelectorComponent()}</EditorInspectorSectionField>

				{this._getMaterialComponent()}
			</>
		);
	}

	private _getMaterialSelectorComponent(): ReactNode {
		return (
			<Table>
				<TableCaption>Select the material to edit.</TableCaption>
				<TableBody>
					{this.props.material.subMaterials.map((material, index) => (
						<TableRow
							onDrop={(ev) => {
								ev.preventDefault();
								ev.currentTarget.classList.remove("bg-muted");
								this._handleAssetDropped(ev, index);
							}}
							onDragOver={(ev) => {
								ev.preventDefault();
								ev.currentTarget.classList.add("bg-muted");
							}}
							onDragLeave={(ev) => {
								ev.preventDefault();
								ev.currentTarget.classList.remove("bg-muted");
							}}
							onClick={() => this.setState({ material: this.props.material.subMaterials[index] })}
							className={`cursor-pointer ${material === this.state.material ? "bg-secondary" : ""} transition-all duration-300 ease-in-out`}
						>
							<TableCell className="font-medium">{index}</TableCell>
							<TableCell>{material?.name ?? material?.constructor.name ?? "None"}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}

	private async _handleAssetDropped(ev: DragEvent<HTMLDivElement>, index: number): Promise<void> {
		const absolutePath = JSON.parse(ev.dataTransfer.getData("assets"))[0];
		const extension = extname(absolutePath).toLowerCase();

		if (extension !== ".material") {
			return;
		}

		const subMaterial = await loadImportedMaterial(this.props.material.getScene(), absolutePath);
		if (subMaterial) {
			const oldSubMaterial = this.props.material.subMaterials[index];
			registerUndoRedo({
				executeRedo: true,
				undo: () => {
					this.props.material.subMaterials[index] = oldSubMaterial;
				},
				redo: () => {
					this.props.material.subMaterials[index] = subMaterial;
				},
				onLost: () => subMaterial.dispose(),
			});

			this.forceUpdate();
		}
	}

	private _getMaterialComponent(): ReactNode {
		if (!this.state.material) {
			return (
				<div className="flex flex-col gap-2 px-2">
					<div className="text-center text-xl">No material</div>
				</div>
			);
		}

		switch (this.state.material.getClassName()) {
			case "PBRMaterial":
				return <EditorPBRMaterialInspector key={this.state.material.id} material={this.state.material as PBRMaterial} />;

			case "StandardMaterial":
				return <EditorStandardMaterialInspector key={this.state.material.id} material={this.state.material as StandardMaterial} />;

			case "SkyMaterial":
				return <EditorSkyMaterialInspector key={this.state.material.id} material={this.state.material as SkyMaterial} />;

			case "GridMaterial":
				return <EditorGridMaterialInspector key={this.state.material.id} material={this.state.material as GridMaterial} />;

			case "NormalMaterial":
				return <EditorNormalMaterialInspector key={this.state.material.id} material={this.state.material as NormalMaterial} />;

			case "WaterMaterial":
				return <EditorWaterMaterialInspector key={this.state.material.id} material={this.state.material as WaterMaterial} />;

			case "LavaMaterial":
				return <EditorLavaMaterialInspector key={this.state.material.id} material={this.state.material as LavaMaterial} />;

			case "TriPlanarMaterial":
				return <EditorTriPlanarMaterialInspector key={this.state.material.id} material={this.state.material as TriPlanarMaterial} />;

			case "CellMaterial":
				return <EditorCellMaterialInspector key={this.state.material.id} material={this.state.material as CellMaterial} />;

			case "FireMaterial":
				return <EditorFireMaterialInspector key={this.state.material.id} material={this.state.material as FireMaterial} />;

			case "GradientMaterial":
				return <EditorGradientMaterialInspector key={this.state.material.id} material={this.state.material as GradientMaterial} />;
		}
	}
}
