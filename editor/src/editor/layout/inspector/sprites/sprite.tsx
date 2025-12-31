import { Component, ReactNode } from "react";

import { LuRefreshCcw } from "react-icons/lu";
import { IoPlay, IoStop } from "react-icons/io5";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";

import { Sprite, Observer } from "babylonjs";
import { ISpriteAnimation } from "babylonjs-editor-tools";

import { Button } from "../../../../ui/shadcn/ui/button";

import { isSprite } from "../../../../tools/guards/sprites";
import { registerUndoRedo } from "../../../../tools/undoredo";
import { onSpriteModifiedObservable } from "../../../../tools/observables";
import { getSpriteManagerNodeFromSprite } from "../../../../tools/sprite/tools";
import { computeSpriteManagerPreviews } from "../../../../tools/sprite/preview";

import { SpriteManagerNode } from "../../../nodes/sprite-manager";

import { onGizmoNodeChangedObservable } from "../../preview/gizmo";

import { ScriptInspectorComponent } from "../script/script";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorDimensionsField } from "../fields/dimensions";

import { IEditorInspectorImplementationProps } from "../inspector";

export interface IEditorSpriteInspectorState {
	selectedAnimation: ISpriteAnimation | null;
}

export class EditorSpriteInspector extends Component<IEditorInspectorImplementationProps<Sprite>, IEditorSpriteInspectorState> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isSprite(object);
	}

	private _spriteManagerNode: SpriteManagerNode | null = null;

	public constructor(props: IEditorInspectorImplementationProps<Sprite>) {
		super(props);

		this._spriteManagerNode = getSpriteManagerNodeFromSprite(this.props.object);

		this.props.object.metadata ??= {};
		this.props.object.metadata.spriteAnimations ??= [];

		this.state = {
			selectedAnimation: this.props.object.metadata.spriteAnimations[0] ?? null,
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Common">
					<EditorInspectorStringField
						label="Name"
						object={this.props.object}
						property="name"
						onChange={() => onSpriteModifiedObservable.notifyObservers(this.props.object)}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Transforms">
					<EditorInspectorVectorField label="position" object={this.props.object} property="position" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Dimensions">
					<EditorInspectorDimensionsField object={this.props} property="object" label="Size" onFinishChange={() => this.forceUpdate()} />
					{this._spriteManagerNode?.atlasJson && (
						<Button variant="ghost" className="flex gap-2 items-center" onClick={() => this._resetDimensionsFromAtlasJson()}>
							<LuRefreshCcw className="w-4 h-4" /> Reset to source size
						</Button>
					)}
				</EditorInspectorSectionField>

				<ScriptInspectorComponent object={this.props.object} editor={this.props.editor} />

				<EditorInspectorSectionField title="Sprite">
					<EditorInspectorNumberField object={this.props.object} property="angle" label="Angle" asDegrees onFinishChange={() => this.forceUpdate()} />

					<EditorInspectorSwitchField object={this.props.object} property="invertU" label="Invert U" />
					<EditorInspectorSwitchField object={this.props.object} property="invertV" label="Invert V" />
					<EditorInspectorSwitchField object={this.props.object} property="isVisible" label="is Visible" />

					{this._spriteManagerNode?.atlasJson && (
						<EditorInspectorListField
							search
							object={this.props.object}
							property="cellRef"
							label="Texture"
							items={Object.keys(this._spriteManagerNode.atlasJson.frames).map((frame) => ({
								text: frame,
								value: frame,
								icon: (
									<div className="flex justify-center items-center w-[24px] h-[24px] bg-secondary rounded-sm">
										<img src={this._spriteManagerNode!.atlasJson.frames[frame]["_preview"]} className="w-full h-full object-contain" />
									</div>
								),
							}))}
						/>
					)}

					{this._spriteManagerNode?.spritesheet && !this._spriteManagerNode.atlasJson && (
						<EditorInspectorListField
							search
							object={this.props.object}
							property="cellIndex"
							label="Texture"
							items={this._spriteManagerNode._previews.map((f, index) => ({
								value: index,
								text: `Frame ${index}`,
								key: `${index}_${this._spriteManagerNode?.spriteManager?.cellWidth}_${this._spriteManagerNode?.spriteManager?.cellHeight}`,
								icon: (
									<div className="flex justify-center items-center w-[24px] h-[24px] bg-secondary rounded-sm">
										<img src={f} className="w-full h-full object-contain" />
									</div>
								),
							}))}
						/>
					)}

					<EditorInspectorColorField object={this.props.object} property="color" label="Color" />
				</EditorInspectorSectionField>

				{this._getSpriteAnimationsInspector()}
			</>
		);
	}

	private _gizmoObserver: Observer<Sprite> | null = null;

	public async componentDidMount(): Promise<void> {
		this._gizmoObserver = onGizmoNodeChangedObservable.add((sprite) => {
			if (sprite === this.props.object) {
				this.props.editor.layout.inspector.forceUpdate();
			}
		});

		if (this._spriteManagerNode) {
			await computeSpriteManagerPreviews(this._spriteManagerNode);
			this.forceUpdate();
		}
	}

	public componentWillUnmount(): void {
		if (this._gizmoObserver) {
			onGizmoNodeChangedObservable.remove(this._gizmoObserver);
		}
	}

	private _getSpriteAnimationsInspector(): ReactNode {
		let maxFrame = 0;

		if (this._spriteManagerNode?.atlasJson) {
			maxFrame = Object.keys(this._spriteManagerNode.atlasJson.frames).length - 1;
		} else if (this._spriteManagerNode) {
			maxFrame = this._spriteManagerNode._previews?.length;
			if (maxFrame !== undefined) {
				maxFrame -= 1;
			}
		}

		const spriteAnimations = this.props.object.metadata.spriteAnimations as ISpriteAnimation[];

		return (
			<EditorInspectorSectionField title="Animations">
				<div className="flex justify-between items-center">
					<div className="p-2 font-bold">Sprite Animations</div>

					<div className="flex gap-2">
						<Button variant="ghost" disabled={spriteAnimations.length === 0} className="p-0.5 w-6 h-6" onClick={() => this._handleRemoveAnimation()}>
							<AiOutlineMinus className="w-4 h-4" />
						</Button>

						<Button variant="ghost" className="p-0.5 w-6 h-6" onClick={() => this._handleAddAnimation()}>
							<AiOutlinePlus className="w-4 h-4" />
						</Button>
					</div>
				</div>

				<div className="flex flex-col rounded-lg bg-black/50 text-white/75 h-96">
					{spriteAnimations.map((animation, index) => (
						<div
							key={`${animation.name}-${index}`}
							onClick={() => this.setState({ selectedAnimation: animation })}
							className={`p-2 hover:bg-muted/35 ${this.state.selectedAnimation === animation ? "bg-muted" : ""} transition-all duration-300 ease-in-out`}
						>
							{animation.name}
						</div>
					))}
				</div>

				{this.state.selectedAnimation && (
					<>
						<Button
							variant="secondary"
							onClick={() => this._playOrStopAnimation()}
							className={`
								${this.props.object.animationStarted ? "!bg-red-500/35" : "hover:!bg-green-500/35"}
								transition-all duration-300 ease-in-out
							`}
						>
							{this.props.object.animationStarted && <IoStop className="w-6 h-6" strokeWidth={1} color="red" />}
							{!this.props.object.animationStarted && <IoPlay className="w-6 h-6" strokeWidth={1} color="green" />}
							{this.props.object.animationStarted ? " Stop" : " Play"}
						</Button>

						<EditorInspectorStringField object={this.state.selectedAnimation} property="name" label="Name" onChange={() => this.forceUpdate()} />
						<EditorInspectorNumberField
							object={this.state.selectedAnimation}
							property="from"
							label="From Frame"
							step={1}
							min={0}
							max={maxFrame}
							onChange={() => this._handleAnimationPropertiesChanged()}
						/>
						<EditorInspectorNumberField
							object={this.state.selectedAnimation}
							property="to"
							label="To Frame"
							step={1}
							min={0}
							max={maxFrame}
							onChange={() => this._handleAnimationPropertiesChanged()}
						/>
						<EditorInspectorNumberField
							object={this.state.selectedAnimation}
							property="delay"
							label="Delay (ms)"
							min={0}
							step={1}
							onChange={() => this._handleAnimationPropertiesChanged()}
						/>
						<EditorInspectorSwitchField object={this.state.selectedAnimation} property="loop" label="Loop" />
					</>
				)}
			</EditorInspectorSectionField>
		);
	}

	private _resetDimensionsFromAtlasJson(): void {
		if (!this._spriteManagerNode?.atlasJson) {
			return;
		}

		const sourceSize = this._spriteManagerNode.atlasJson.frames[this.props.object.cellRef].sourceSize;
		if (sourceSize) {
			this.props.object.width = sourceSize.w;
			this.props.object.height = sourceSize.h;
			this.forceUpdate();
		}
	}

	private _handleAddAnimation(): void {
		const spriteAnimations = this.props.object.metadata.spriteAnimations as ISpriteAnimation[];
		const newAnimation: ISpriteAnimation = {
			name: `Animation ${spriteAnimations.length + 1}`,
			from: 0,
			to: 1,
			loop: true,
			delay: 100,
		};

		registerUndoRedo({
			executeRedo: true,
			undo: () => spriteAnimations.pop(),
			redo: () => spriteAnimations.push(newAnimation),
		});

		this.setState({
			selectedAnimation: newAnimation,
		});
	}

	private _handleRemoveAnimation(): void {
		const selectedAnimation = this.state.selectedAnimation;
		if (!selectedAnimation) {
			return;
		}

		const spriteAnimations = this.props.object.metadata.spriteAnimations as ISpriteAnimation[];

		const index = spriteAnimations.indexOf(selectedAnimation);
		if (index === -1) {
			return;
		}

		registerUndoRedo({
			executeRedo: true,
			undo: () => spriteAnimations.splice(index, 0, selectedAnimation),
			redo: () => spriteAnimations.splice(index, 1),
		});

		this.setState({
			selectedAnimation: spriteAnimations[0] ?? null,
		});
	}

	private _playOrStopAnimation(): void {
		if (this.props.object.animationStarted) {
			this.props.object.stopAnimation();
		} else {
			this.props.object.playAnimation(
				this.state.selectedAnimation!.from,
				this.state.selectedAnimation!.to,
				this.state.selectedAnimation!.loop,
				this.state.selectedAnimation!.delay
			);
		}
		this.forceUpdate();
	}

	private _handleAnimationPropertiesChanged(): void {
		if (this.props.object.animationStarted) {
			this.props.object.stopAnimation();
			this.props.object.playAnimation(
				this.state.selectedAnimation!.from,
				this.state.selectedAnimation!.to,
				this.state.selectedAnimation!.loop,
				this.state.selectedAnimation!.delay
			);
		}
	}
}
