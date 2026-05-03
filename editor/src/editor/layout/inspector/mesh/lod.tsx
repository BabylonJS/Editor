import { TreeNodeInfo } from "@blueprintjs/core";
import { Component, DragEvent, ReactNode } from "react";

import { XMarkIcon } from "@heroicons/react/20/solid";

import { Mesh } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { Editor } from "../../../main";

import { isMesh } from "../../../../tools/guards/nodes";
import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";

export interface IMeshLODInspectorProps {
	mesh: Mesh;
	editor: Editor;
}

export interface IIMeshLODInspectorState {
	dragOver: boolean;
	lodsEnabled: boolean;
}

export class MeshLODInspector extends Component<IMeshLODInspectorProps, IIMeshLODInspectorState> {
	public constructor(props: IMeshLODInspectorProps) {
		super(props);

		this.state = {
			dragOver: false,
			lodsEnabled: props.mesh.getLODLevels().length > 0,
		};
	}

	public render(): ReactNode {
		return (
			<EditorInspectorSectionField title="LODs">
				<EditorInspectorSwitchField noUndoRedo label="Enabled" object={this.state} property="lodsEnabled" onChange={() => this._handleLODsEnabledChange()} />
				{this.state.lodsEnabled && this._getLODsComponent()}
			</EditorInspectorSectionField>
		);
	}

	private _handleLODsEnabledChange(): void {
		const lods = this.props.mesh.getLODLevels().slice();

		registerUndoRedo({
			executeRedo: true,
			undo: () => lods.forEach((lod) => this.props.mesh.addLODLevel(lod.distanceOrScreenCoverage ?? 0, lod.mesh!)),
			redo: () => lods.forEach((lod) => this.props.mesh.removeLODLevel(lod.mesh!)),
		});

		this.forceUpdate();
		this.props.editor.layout.graph.refresh();
	}

	private _getLODsComponent(): ReactNode {
		const lods = this.props.mesh.getLODLevels();

		const o = {
			distance: this._getDistance(),
		};

		const sortLods = (value: number) => {
			const lods = this.props.mesh.getLODLevels().slice();
			lods.forEach((lod) => this.props.mesh.removeLODLevel(lod.mesh!));

			lods.reverse().forEach((lod, index) => {
				this.props.mesh.addLODLevel(value * (index + 1), lod.mesh);
			});
		};

		return (
			<>
				<EditorInspectorNumberField
					object={o}
					property="distance"
					label="Linear Distance"
					tooltip="Defines the distance that separates each LODs"
					step={1}
					noUndoRedo
					onChange={(v) => sortLods(v)}
					onFinishChange={(value, oldValue) => {
						registerUndoRedo({
							executeRedo: true,
							undo: () => sortLods(oldValue),
							redo: () => sortLods(value),
						});
					}}
				/>

				{lods.map((lod) => (
					<div
						key={lod.mesh?.id ?? "null"}
						className={`
							flex justify-between items-center p-2 rounded-lg bg-muted-foreground/35 dark:bg-muted-foreground/5 cursor-pointer
							hover:bg-muted dark:hover:bg-muted
							transition-all duration-300 ease-in-out
						`}
					>
						<div className="flex flex-col justify-center">
							<div>{lod.mesh?.name}</div>
							<div className="text-sm text-muted-foreground">
								{lod.mesh?.geometry?.getTotalVertices() ?? 0} vertices, {lod.mesh?.geometry?.getTotalIndices() ?? 0} indices
							</div>
						</div>
						<Button variant="ghost" className="p-0.5 w-8 h-8" onClick={() => this._handleRemoveLOD(lod.mesh)}>
							<XMarkIcon className="w-6 h-6" />
						</Button>
					</div>
				))}

				<div
					onDrop={(ev) => this._handleDrop(ev)}
					onDragOver={(ev) => this._handleDragOver(ev)}
					onDragLeave={() => this.setState({ dragOver: false })}
					className={`
						flex flex-col justify-center items-center w-full h-[64px] rounded-lg border-[1px] border-secondary-foreground/35 border-dashed font-semibold text-muted-foreground
						${this.state.dragOver ? "bg-secondary-foreground/35" : ""}
						transition-all duration-300 ease-in-out
					`}
				>
					Drop LOD meshes here to add them to the list of LODs.
				</div>
			</>
		);
	}

	private _handleDragOver(ev: DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		ev.stopPropagation();

		this.setState({
			dragOver: true,
		});
	}

	private _handleDrop(ev: DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		ev.stopPropagation();

		this.setState({
			dragOver: false,
		});

		const node = ev.dataTransfer.getData("graph/node");
		if (!node) {
			return;
		}

		const nodesToMove = this.props.editor.layout.graph
			.getSelectedNodes()
			.filter((n) => n.nodeData && isMesh(n.nodeData) && n.nodeData !== this.props.mesh) as TreeNodeInfo<Mesh>[];

		const savedNodesData = nodesToMove.map((n) => ({
			oldParent: n.nodeData!.parent,
			oldPosition: n.nodeData!.position.clone(),
			oldRotation: n.nodeData!.rotation.clone(),
			oldScaling: n.nodeData!.scaling.clone(),
			oldRotationQuaternion: n.nodeData!.rotationQuaternion?.clone(),
		}));

		registerUndoRedo({
			executeRedo: true,
			action: () => this._autoSortLODs(),
			undo: () => {
				nodesToMove.forEach((node, index) => {
					const mesh = node.nodeData as Mesh;
					this.props.mesh.removeLODLevel(mesh);

					const configuration = savedNodesData[index];
					mesh.parent = configuration.oldParent;
					mesh.position.copyFrom(configuration.oldPosition);
					mesh.rotation.copyFrom(configuration.oldRotation);
					mesh.scaling.copyFrom(configuration.oldScaling);
					if (configuration.oldRotationQuaternion) {
						mesh.rotationQuaternion?.copyFrom(configuration.oldRotationQuaternion);
					}
				});
			},
			redo: () => {
				nodesToMove.forEach((node) => {
					const mesh = node.nodeData as Mesh;
					this.props.mesh.addLODLevel(300, mesh);

					mesh.parent = null;
					mesh.position.set(0, 0, 0);
					mesh.rotation.set(0, 0, 0);
					mesh.scaling.set(1, 1, 1);
					mesh.rotationQuaternion?.set(0, 0, 0, 1);
				});
			},
		});

		this.forceUpdate();
		this.props.editor.layout.graph.refresh();
	}

	private _handleRemoveLOD(mesh: Mesh | null): void {
		const lods = this.props.mesh.getLODLevels();
		const lodToRemove = lods.find((lod) => lod.mesh === mesh);
		if (!lodToRemove) {
			return;
		}

		registerUndoRedo({
			executeRedo: true,
			action: () => this._autoSortLODs(),
			undo: () => this.props.mesh.addLODLevel(lodToRemove.distanceOrScreenCoverage ?? 0, lodToRemove.mesh!),
			redo: () => this.props.mesh.removeLODLevel(lodToRemove.mesh!),
		});

		this.forceUpdate();
		this.props.editor.layout.graph.refresh();
	}

	private _getDistance(): number {
		const lods = this.props.mesh.getLODLevels();
		return lods[lods.length - 1]?.distanceOrScreenCoverage ?? 1000;
	}

	private _autoSortLODs(): void {
		const lods = this.props.mesh.getLODLevels().slice();

		const sortedLODs = lods.sort((a, b) => {
			const aIndices = a.mesh?.geometry?.getIndices()?.length ?? Infinity;
			const bIndices = b.mesh?.geometry?.getIndices()?.length ?? Infinity;

			return aIndices - bIndices;
		});

		lods.forEach((lod) => this.props.mesh.removeLODLevel(lod.mesh!));

		const distance = this._getDistance();

		sortedLODs.reverse().forEach((lod, index) => {
			this.props.mesh.addLODLevel(distance * (index + 1), lod.mesh);
		});
	}
}
