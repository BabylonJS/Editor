import { Component, ReactNode } from "react";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";

import { Reorder } from "framer-motion";

import { Ragdoll, Skeleton, Axis, Vector3, Mesh, TransformNode } from "babylonjs";
import { IRagDollConfiguration, IRagdollRuntimeConfiguration } from "babylonjs-editor-tools";

import { Button } from "../../../ui/shadcn/ui/button";

import { isMesh, isTransformNode } from "../../../tools/guards/nodes";

import { EditorInspectorListField, IEditorInspectorListFieldItem } from "../inspector/fields/list";
import { EditorInspectorNumberField } from "../inspector/fields/number";
import { EditorInspectorSectionField } from "../inspector/fields/section";

import { RagdollEditor } from "./editor";

export interface IRagdollEditorInspectorProps {
	ragdollEditor: RagdollEditor;
	configuration: IRagDollConfiguration;
}

export interface IRagdollEditorInspectorState {
	selectedSkeleton?: Skeleton;
	selectedRootNode?: Mesh | TransformNode;

	isRagdollApplied: boolean;
	selectedConfiguration?: IRagdollRuntimeConfiguration;
}

export class RagdollEditorInspector extends Component<IRagdollEditorInspectorProps, IRagdollEditorInspectorState> {
	private _selectedSkeleton: string = "";
	private _selectedRootNode: string = "";

	private _lastRootNodeScaling: Vector3 = Vector3.Zero();

	public constructor(props: IRagdollEditorInspectorProps) {
		super(props);

		this.state = {
			isRagdollApplied: false,
		};
	}

	public render(): ReactNode {
		return (
			<div className="flex flex-col gap-2 w-full h-full overflow-y-auto">
				{this._getRagdollInspector()}
				{this._getConfigurationListInspector()}
				{this._getConfigurationInspector()}
			</div>
		);
	}

	private _getRagdollInspector(): ReactNode {
		this._selectedRootNode = this.state.selectedRootNode?.id ?? "";
		this._selectedSkeleton = this.state.selectedSkeleton?.name ?? "";

		const preview = this.props.ragdollEditor.preview;

		const skeletons = preview?.scene.skeletons.map((skeleton, index) => ({
			key: index,
			text: skeleton.name,
			value: skeleton.name,
		}));

		const meshes = preview?.scene.meshes.filter((m) => m !== preview.ground);
		const transformNodes = preview?.scene.transformNodes.filter((t) => t !== preview.scalingNode);
		const rootNodes = [...(meshes ?? []), ...(transformNodes ?? [])].map((node, index) => ({
			key: index,
			text: node.name,
			value: node.id,
		}));

		return (
			<EditorInspectorSectionField title="Ragdoll">
				<EditorInspectorListField noUndoRedo object={this} property="_selectedSkeleton" label="Skeleton" items={skeletons ?? []} onChange={() => this._handleChange()} />
				<EditorInspectorListField noUndoRedo search object={this} property="_selectedRootNode" label="Root Node" items={rootNodes} onChange={() => this._handleChange()} />
				<EditorInspectorNumberField noUndoRedo object={this.props.configuration} property="scalingFactor" label="Scaling Factor" onChange={() => this._handleChange()} />

				<Button variant={this.state.isRagdollApplied ? "destructive" : "default"} onClick={() => this._handleApplyOrStopRagdollPreview()}>
					Apply and preview Ragdoll
				</Button>
			</EditorInspectorSectionField>
		);
	}

	private _handleApplyOrStopRagdollPreview(): void {
		const ragdoll = this.props.ragdollEditor.preview?.ragdoll;

		if (this.state.isRagdollApplied) {
			if (ragdoll) {
				this.state.selectedRootNode?.scaling.copyFrom(this._lastRootNodeScaling);
			}
			this.state.selectedSkeleton?.returnToRest();
			this._handleChange();
		} else if (ragdoll) {
			this._lastRootNodeScaling.copyFrom(this.state.selectedRootNode?.scaling ?? Vector3.Zero());
			this.state.selectedRootNode?.scaling.scaleInPlace(100);
			ragdoll?.ragdoll();
			ragdoll?.getAggregate(0)?.body.applyImpulse(new Vector3(200, 200, 200), Vector3.ZeroReadOnly);
		}
		this.setState({
			isRagdollApplied: !this.state.isRagdollApplied,
		});
	}

	private _getConfigurationListInspector(): ReactNode {
		if (!this.state.selectedSkeleton) {
			return null;
		}

		return (
			<EditorInspectorSectionField title="Configuration">
				<div className="flex justify-between items-center">
					<div className="p-2 font-bold"></div>

					<div className="flex gap-2">
						<Button variant="ghost" disabled={this.state.selectedConfiguration === null} className="p-0.5 w-6 h-6" onClick={() => this._handleRemoveConfiguration()}>
							<AiOutlineMinus className="w-4 h-4" />
						</Button>

						<Button variant="ghost" className="p-0.5 w-6 h-6" onClick={() => this._handleAddConfiguration()}>
							<AiOutlinePlus className="w-4 h-4" />
						</Button>
					</div>
				</div>

				<Reorder.Group
					axis="y"
					values={this.props.configuration.runtimeConfiguration}
					onReorder={(items) => {
						this.props.configuration.runtimeConfiguration = items;
						this._handleChange();
					}}
					className="flex flex-col rounded-lg bg-black/50 text-white/75 h-96"
				>
					{this.props.configuration.runtimeConfiguration.map((config) => {
						const id = `${config.name}-${config.bones.join(",")}`;
						return (
							<Reorder.Item key={id} id={id} value={config}>
								<div
									onClick={() => this.setState({ selectedConfiguration: config })}
									className={`p-2 hover:bg-muted/35 ${this.state.selectedConfiguration === config ? "bg-muted" : ""} transition-all duration-300 ease-in-out`}
								>
									{config.name}
								</div>
							</Reorder.Item>
						);
					})}
				</Reorder.Group>
			</EditorInspectorSectionField>
		);
	}

	private _handleAddConfiguration(): void {
		if (!this.state.selectedSkeleton) {
			return;
		}

		const newConfiguration: IRagdollRuntimeConfiguration = {
			bones: [this.state.selectedSkeleton.bones[0].name],
			name: `Configuration ${this.props.configuration.runtimeConfiguration.length + 1}`,
		};

		this.props.configuration.runtimeConfiguration.push(newConfiguration);

		this.setState({
			selectedConfiguration: newConfiguration,
		});
	}

	private _handleRemoveConfiguration(): void {
		if (!this.state.selectedConfiguration) {
			return;
		}

		const index = this.props.configuration.runtimeConfiguration.indexOf(this.state.selectedConfiguration);
		if (index === -1) {
			return;
		}

		this.props.configuration.runtimeConfiguration.splice(index, 1);

		this.setState({
			selectedConfiguration: this.props.configuration.runtimeConfiguration[0],
		});
	}

	private _getConfigurationInspector(): ReactNode {
		if (!this.state.selectedConfiguration) {
			return null;
		}

		const bones = this.state.selectedSkeleton?.bones.map((bone, index) => ({
			key: index,
			text: bone.name,
			value: bone.name,
		}));

		const axis: IEditorInspectorListFieldItem[] = [
			{
				text: "None",
				value: undefined,
			},
			{
				text: "Axis X",
				value: Axis.X,
			},
			{
				text: "Axis Y",
				value: Axis.Y,
			},
			{
				text: "Axis Z",
				value: Axis.Z,
			},
		];

		return (
			<EditorInspectorSectionField title="Configuration Details">
				<div className="flex flex-col gap-2 rounded-lg bg-black/50 text-white/75 p-2">
					{this.state.selectedConfiguration.bones.map((bone, index) => {
						const o = {
							bone,
						};

						return (
							<div key={bone} className="flex items-center gap-2 w-full">
								<div className="flex-1">
									<EditorInspectorListField
										noUndoRedo
										search
										object={o}
										property="bone"
										label={bone}
										items={bones ?? []}
										onChange={() => {
											this.state.selectedConfiguration!.bones[index] = o.bone;
											this.forceUpdate();
											this._handleChange();
										}}
									/>
								</div>
								<Button
									variant="ghost"
									className="p-0.5 w-6 h-6"
									disabled={this.state.selectedConfiguration!.bones.length < 2}
									onClick={() => {
										this.state.selectedConfiguration!.bones.splice(index, 1);
										this.forceUpdate();
										this._handleChange();
									}}
								>
									<AiOutlineMinus className="w-4 h-4" />
								</Button>
							</div>
						);
					})}

					<div className="flex justify-center items-center pb-1 w-full">
						<Button
							variant="ghost"
							className="p-0.5 w-full"
							onClick={() => {
								this.state.selectedConfiguration!.bones.push(this.state.selectedSkeleton!.bones[0].name);
								this.forceUpdate();
								this._handleChange();
							}}
						>
							<AiOutlinePlus className="w-4 h-4" />
						</Button>
					</div>
				</div>
				<EditorInspectorNumberField noUndoRedo object={this.state.selectedConfiguration} property="width" label="Width" onChange={() => this._handleChange()} />
				<EditorInspectorNumberField noUndoRedo object={this.state.selectedConfiguration} property="height" label="Height" onChange={() => this._handleChange()} />
				<EditorInspectorNumberField noUndoRedo object={this.state.selectedConfiguration} property="depth" label="Depth" onChange={() => this._handleChange()} />
				<EditorInspectorListField
					noUndoRedo
					object={this.state.selectedConfiguration}
					property="rotationAxis"
					label="Rotation Axis"
					items={axis}
					onChange={() => this._handleChange()}
				/>
				<EditorInspectorNumberField noUndoRedo object={this.state.selectedConfiguration} property="min" label="Min" onChange={() => this._handleChange()} />
				<EditorInspectorNumberField noUndoRedo object={this.state.selectedConfiguration} property="max" label="Max" onChange={() => this._handleChange()} />
				<EditorInspectorNumberField noUndoRedo object={this.state.selectedConfiguration} property="boxOffset" label="Box Offset" onChange={() => this._handleChange()} />
				<EditorInspectorListField
					noUndoRedo
					object={this.state.selectedConfiguration}
					property="boneOffsetAxis"
					label="Offset Axis"
					items={axis}
					onChange={() => this._handleChange()}
				/>
			</EditorInspectorSectionField>
		);
	}

	private _handleChange(): void {
		const preview = this.props.ragdollEditor.preview;
		preview.ragdoll?.dispose();
		preview.ragdoll = null;

		preview.scalingNode.scaling.setAll(this.props.configuration.scalingFactor);

		const skeleton = preview.scene.skeletons.find((s) => s.name === this._selectedSkeleton);
		if (!skeleton) {
			return;
		}

		const rootNode = preview.scene.getNodeById(this._selectedRootNode);
		if (!rootNode || (!isMesh(rootNode) && !isTransformNode(rootNode))) {
			return;
		}

		this.setState({
			selectedSkeleton: skeleton,
			selectedRootNode: rootNode,
		});

		skeleton.returnToRest();

		preview.ragdoll = new Ragdoll(skeleton, rootNode, this.props.configuration.runtimeConfiguration as any);
		preview.resetViewer();
	}
}
