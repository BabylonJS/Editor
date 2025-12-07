import { Component, ReactNode, DragEvent } from "react";
import { extname } from "path/posix";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorVectorField } from "../../../layout/inspector/fields/vector";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { Button } from "../../../../ui/shadcn/ui/button";
import { AiOutlineClose } from "react-icons/ai";
import { getProjectAssetsRootUrl } from "../../../../project/configuration";

import { IFXParticleData } from "./types";

export interface IFXEditorEmitterShapePropertiesProps {
	particleData: IFXParticleData;
	onChange: () => void;
}

export interface IFXEditorEmitterShapePropertiesState {
	meshDragOver: boolean;
}

export class FXEditorEmitterShapeProperties extends Component<IFXEditorEmitterShapePropertiesProps, IFXEditorEmitterShapePropertiesState> {
	public constructor(props: IFXEditorEmitterShapePropertiesProps) {
		super(props);
		this.state = {
			meshDragOver: false,
		};
	}

	public render(): ReactNode {
		const { particleData } = this.props;
		const shape = particleData.emitterShape.shape;

		return (
			<>
				<EditorInspectorListField
					object={particleData.emitterShape}
					property="shape"
					label="Shape"
					items={[
						{ text: "Box", value: "Box" },
						{ text: "Cone", value: "Cone" },
						{ text: "Sphere", value: "Sphere" },
						{ text: "Cylinder", value: "Cylinder" },
						{ text: "Point", value: "Point" },
						{ text: "Hemispheric", value: "Hemispheric" },
						{ text: "Mesh", value: "Mesh" },
					]}
					onChange={() => this.props.onChange()}
				/>
				{this._getShapeProperties(shape)}
			</>
		);
	}

	private _getShapeProperties(shape: string): ReactNode {
		const { particleData } = this.props;

		if (shape === "Box") {
			return (
				<>
					<EditorInspectorBlockField>
						<div className="px-2">Direction</div>
						<EditorInspectorVectorField grayLabel object={particleData.emitterShape} property="direction1" label="Min" />
						<EditorInspectorVectorField grayLabel object={particleData.emitterShape} property="direction2" label="Max" />
					</EditorInspectorBlockField>
					<EditorInspectorBlockField>
						<div className="px-2">Emit Box</div>
						<EditorInspectorVectorField grayLabel object={particleData.emitterShape} property="minEmitBox" label="Min" />
						<EditorInspectorVectorField grayLabel object={particleData.emitterShape} property="maxEmitBox" label="Max" />
					</EditorInspectorBlockField>
				</>
			);
		}

		if (shape === "Cone") {
			return (
				<>
					<EditorInspectorNumberField object={particleData.emitterShape} property="radius" label="Radius" min={0} step={0.1} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="angle" label="Angle" asDegrees min={0} step={1} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="radiusRange" label="Radius Range" min={0} max={1} step={0.01} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="heightRange" label="Height Range" min={0} max={1} step={0.01} />
					<EditorInspectorSwitchField object={particleData.emitterShape} property="emitFromSpawnPointOnly" label="Emit From Spawn Point Only" />
				</>
			);
		}

		if (shape === "Sphere") {
			return (
				<>
					<EditorInspectorNumberField object={particleData.emitterShape} property="radius" label="Radius" min={0} step={0.1} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="radiusRange" label="Radius Range" min={0} max={1} step={0.01} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="directionRandomizer" label="Direction Randomizer" min={0} max={1} step={0.01} />
				</>
			);
		}

		if (shape === "Cylinder") {
			return (
				<>
					<EditorInspectorNumberField object={particleData.emitterShape} property="radius" label="Radius" min={0} step={0.1} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="height" label="Height" min={0} step={0.1} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="radiusRange" label="Radius Range" min={0} max={1} step={0.01} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="directionRandomizer" label="Direction Randomizer" min={0} max={1} step={0.01} />
				</>
			);
		}

		if (shape === "Hemispheric") {
			return (
				<>
					<EditorInspectorNumberField object={particleData.emitterShape} property="radius" label="Radius" min={0} step={0.1} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="radiusRange" label="Radius Range" min={0} max={1} step={0.01} />
					<EditorInspectorNumberField object={particleData.emitterShape} property="directionRandomizer" label="Direction Randomizer" min={0} max={1} step={0.01} />
				</>
			);
		}

		if (shape === "Mesh") {
			return this._getMeshEmitterField();
		}

		// Point - no properties
		return null;
	}

	private _getMeshEmitterField(): ReactNode {
		const { particleData } = this.props;

		return (
			<div className="flex gap-2 items-center px-2">
				<div className="w-1/3">Mesh</div>
				<div
					onDrop={(ev) => this._handleMeshEmitterDrop(ev)}
					onDragOver={this._handleMeshDragOver}
					onDragLeave={this._handleMeshDragLeave}
					className={`flex items-center px-5 py-2 rounded-lg w-2/3 ${
						this.state.meshDragOver ? "bg-muted-foreground/75 dark:bg-muted-foreground/20" : "bg-muted-foreground/10 dark:bg-muted-foreground/5"
					} transition-all duration-300 ease-in-out`}
				>
					<div className="flex-1 text-center text-ellipsis overflow-hidden whitespace-nowrap">{particleData.emitterShape.meshPath || "Drop mesh file here"}</div>
					{particleData.emitterShape.meshPath && (
						<Button
							variant="ghost"
							size="sm"
							className="w-6 h-6 p-0"
							onClick={() => {
								particleData.emitterShape.meshPath = null;
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

	private _handleMeshEmitterDrop = (ev: DragEvent<HTMLDivElement>): void => {
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
			this.props.particleData.emitterShape.meshPath = relativePath;
			this.props.onChange();
		} catch (e) {
			console.error("Failed to handle mesh emitter drop", e);
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
