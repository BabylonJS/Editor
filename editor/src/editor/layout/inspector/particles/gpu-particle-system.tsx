import { Component, ReactNode } from "react";

import { IoPlay, IoStop, IoRefresh } from "react-icons/io5";

import {
	GPUParticleSystem,
	ParticleSystem,
	IParticleEmitterType,
	BoxParticleEmitter,
	ConeParticleEmitter,
	ConeDirectedParticleEmitter,
	CylinderParticleEmitter,
	CylinderDirectedParticleEmitter,
	SphereParticleEmitter,
	SphereDirectedParticleEmitter,
	PointParticleEmitter,
	HemisphericParticleEmitter,
	MeshParticleEmitter,
} from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getPowerOfTwoSizesUntil } from "../../../../tools/maths/scalar";
import { isGPUParticleSystem } from "../../../../tools/guards/particles";
import { onParticleSystemModifiedObservable } from "../../../../tools/observables";
import { createGpuParticleSystemRandomTexture } from "../../../../tools/particles/texture";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorBlockField } from "../fields/block";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorListField, IEditorInspectorListFieldItem } from "../fields/list";

import { IEditorInspectorImplementationProps } from "../inspector";

export interface IEditorGPUParticleSystemInspectorState {
	started: boolean;
}

export class EditorGPUParticleSystemInspector extends Component<IEditorInspectorImplementationProps<GPUParticleSystem>, IEditorGPUParticleSystemInspectorState> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isGPUParticleSystem(object);
	}

	protected _randomTextureSize: number = 1024;
	protected _sizes: IEditorInspectorListFieldItem[] = getPowerOfTwoSizesUntil(this.props.editor.layout.preview.engine.getCaps().maxTextureSize, 256).map(
		(s) =>
			({
				value: s,
				text: `${s}px`,
			}) as IEditorInspectorListFieldItem
	);

	public constructor(props: IEditorInspectorImplementationProps<GPUParticleSystem>) {
		super(props);

		this.state = {
			started: props.object.isStarted(),
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Common">
					<div className="flex justify-between items-center px-2 py-2">
						<div className="w-1/2">Type</div>

						<div className="text-white/50">{this.props.object.getClassName()}</div>
					</div>

					<EditorInspectorStringField
						label="Name"
						object={this.props.object}
						property="name"
						onChange={() => onParticleSystemModifiedObservable.notifyObservers(this.props.object)}
					/>
					<EditorInspectorSwitchField object={this.props.object} property="preventAutoStart" label="Prevent Auto Start" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Actions">
					<div className="flex justify-center items-center gap-2">
						<Button
							onClick={() => this._handleStartOrStop()}
							className={`
                                w-10 h-10 bg-muted/50 !rounded-lg p-0.5
                                ${this.state.started ? "!bg-red-500/35" : "hover:!bg-green-500/35"}
                                transition-all duration-300 ease-in-out
                            `}
						>
							{this.state.started ? <IoStop className="w-6 h-6" strokeWidth={1} color="red" /> : <IoPlay className="w-6 h-6" strokeWidth={1} color="green" />}
						</Button>

						<Button onClick={() => this.props.object.reset()} className="w-10 h-10 bg-muted/50 !rounded-lg p-0.5">
							<IoRefresh className="w-6 h-6" strokeWidth={1} color="red" />
						</Button>
					</div>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Transforms">
					<EditorInspectorVectorField object={this.props.object} property="worldOffset" label="Offset" />
					<EditorInspectorVectorField object={this.props.object} property="gravity" label="Gravity" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Textures">
					<EditorInspectorTextureField hideLevel hideSize object={this.props.object} property="particleTexture" title="Base Texture" />

					<EditorInspectorListField
						object={this.props.object}
						property="blendMode"
						label="Blend Mode"
						items={[
							{ text: "Add", value: ParticleSystem.BLENDMODE_ADD },
							{ text: "Multiply", value: ParticleSystem.BLENDMODE_MULTIPLY },
							{ text: "Multiply Add", value: ParticleSystem.BLENDMODE_MULTIPLYADD },
							{ text: "One-one", value: ParticleSystem.BLENDMODE_ONEONE },
							{ text: "Standard", value: ParticleSystem.BLENDMODE_STANDARD },
						]}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Emission">
					{this._getCapacityInspector()}
					{this._getRandomTextureSizeInspector()}

					<EditorInspectorNumberField object={this.props.object} property="emitRate" label="Rate" />

					<EditorInspectorBlockField>
						<div className="px-2">Emit Power</div>
						<div className="flex items-center">
							<EditorInspectorNumberField grayLabel object={this.props.object} property="minEmitPower" label="Min" min={0} />
							<EditorInspectorNumberField grayLabel object={this.props.object} property="maxEmitPower" label="Max" min={0} />
						</div>
					</EditorInspectorBlockField>

					<EditorInspectorBlockField>
						<div className="px-2">Lifetime</div>
						<div className="flex items-center">
							<EditorInspectorNumberField grayLabel object={this.props.object} property="minLifeTime" label="Min" min={0} />
							<EditorInspectorNumberField grayLabel object={this.props.object} property="maxLifeTime" label="Max" min={0} />
						</div>
					</EditorInspectorBlockField>

					<EditorInspectorBlockField>
						<div className="px-2">Angular Speed</div>
						<div className="flex items-center">
							<EditorInspectorNumberField grayLabel asDegrees object={this.props.object} property="minAngularSpeed" label="Min" step={0.1} />
							<EditorInspectorNumberField grayLabel asDegrees object={this.props.object} property="maxAngularSpeed" label="Max" step={0.1} />
						</div>
					</EditorInspectorBlockField>

					<EditorInspectorBlockField>
						<div className="px-2">Size</div>
						<div className="flex items-center">
							<EditorInspectorNumberField grayLabel object={this.props.object} property="minSize" label="Min" min={0} />
							<EditorInspectorNumberField grayLabel object={this.props.object} property="maxSize" label="Max" min={0} />
						</div>
					</EditorInspectorBlockField>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Colors">
					<EditorInspectorColorField object={this.props.object} property="color1" label="Color 1" />
					<EditorInspectorColorField object={this.props.object} property="color2" label="Color 2" />
					<EditorInspectorColorField object={this.props.object} property="colorDead" label="Dead" />
				</EditorInspectorSectionField>

				{this._getEmitterTypeInspector()}

				<EditorInspectorSectionField title="Animation Sheet">
					<EditorInspectorSwitchField
						object={this.props.object}
						property="isAnimationSheetEnabled"
						label="Is Animation Sheet Enabled"
						onChange={() => this.forceUpdate()}
					/>

					{this.props.object.isAnimationSheetEnabled && (
						<>
							<EditorInspectorNumberField object={this.props.object} property="startSpriteCellID" label="Start Cell Id" min={0} />
							<EditorInspectorNumberField object={this.props.object} property="endSpriteCellID" label="End Cell Id" min={0} />
							<EditorInspectorNumberField object={this.props.object} property="spriteCellChangeSpeed" label="Cell Change Speed" min={0} />
							<EditorInspectorNumberField object={this.props.object} property="spriteCellWidth" label="Cell Width" min={0} />
							<EditorInspectorNumberField object={this.props.object} property="spriteCellHeight" label="Cell Height" min={0} />
							<EditorInspectorSwitchField object={this.props.object} property="spriteRandomStartCell" label="Random Start Cell" />
						</>
					)}
				</EditorInspectorSectionField>
			</>
		);
	}

	private _handleStartOrStop(): void {
		if (this.state.started) {
			this.props.object.stop();
			this.setState({
				started: false,
			});
		} else {
			this.props.object.start();
			this.setState({
				started: true,
			});
		}
	}

	private _getCapacityInspector(): ReactNode {
		const o = {
			capacity: this.props.object.getCapacity(),
		};

		const onCapacityChanged = (value: number) => {
			this.props.object["_capacity"] = value >> 0;
			this.props.object.reset();
			this.props.object["_reset"]();
		};

		return (
			<EditorInspectorNumberField
				noUndoRedo
				object={o}
				property="capacity"
				label="Capacity"
				min={1}
				max={1_000_000}
				step={100}
				onFinishChange={(value) => {
					value = value >> 0;
					const oldValue = this.props.object.getCapacity();

					if (value === oldValue) {
						return;
					}

					registerUndoRedo({
						executeRedo: true,
						undo: () => onCapacityChanged(oldValue),
						redo: () => onCapacityChanged(value),
					});
				}}
			/>
		);
	}

	private _getRandomTextureSizeInspector(): ReactNode {
		this._randomTextureSize = this.props.object._randomTexture.getSize().width ?? 1024;

		const onRandomTextureSizeChanged = (value: number) => {
			const texture1 = createGpuParticleSystemRandomTexture(value, this.props.editor.layout.preview.scene);
			const texture2 = createGpuParticleSystemRandomTexture(value, this.props.editor.layout.preview.scene);

			texture1.name = this.props.object._randomTexture.name;
			texture2.name = this.props.object._randomTexture2.name;

			this.props.object._randomTexture.dispose();
			this.props.object._randomTexture2.dispose();

			this.props.object._randomTexture = texture1;
			this.props.object._randomTexture2 = texture2;
		};

		return (
			<EditorInspectorListField object={this} property="_randomTextureSize" label="Random Texture Size" onChange={(v) => onRandomTextureSizeChanged(v)} items={this._sizes} />
		);
	}

	private _getEmitterTypeInspector(): ReactNode {
		const o = {
			particleEmitterType: this.props.object.particleEmitterType.getClassName(),
		};

		const emitter = this.props.object.particleEmitterType;

		return (
			<EditorInspectorSectionField title="Emitter">
				<EditorInspectorListField
					noUndoRedo
					object={o}
					property="particleEmitterType"
					label="Type"
					items={[
						{ text: "Box", value: "BoxParticleEmitter" },
						{ text: "Cone", value: "ConeParticleEmitter" },
						{ text: "Cone Directed", value: "ConeDirectedParticleEmitter" },
						{ text: "Cylinder", value: "CylinderParticleEmitter" },
						{ text: "Cylinder Directed", value: "CylinderDirectedParticleEmitter" },
						{ text: "Sphere", value: "SphereParticleEmitter" },
						{ text: "Sphere Directed", value: "SphereDirectedParticleEmitter" },
						{ text: "Point", value: "PointParticleEmitter" },
						{ text: "Hemispheric", value: "HemisphericParticleEmitter" },
					]}
					onChange={(value) => {
						let emitterType: IParticleEmitterType | null = null;

						switch (value) {
							case "BoxParticleEmitter":
								emitterType = new BoxParticleEmitter();
								break;
							case "ConeParticleEmitter":
								emitterType = new ConeParticleEmitter();
								break;
							case "ConeDirectedParticleEmitter":
								emitterType = new ConeDirectedParticleEmitter();
								break;
							case "CylinderParticleEmitter":
								emitterType = new CylinderParticleEmitter();
								break;
							case "CylinderDirectedParticleEmitter":
								emitterType = new CylinderDirectedParticleEmitter();
								break;
							case "SphereParticleEmitter":
								emitterType = new SphereParticleEmitter();
								break;
							case "SphereDirectedParticleEmitter":
								emitterType = new SphereDirectedParticleEmitter();
								break;
							case "PointParticleEmitter":
								emitterType = new PointParticleEmitter();
								break;
							case "HemisphericParticleEmitter":
								emitterType = new HemisphericParticleEmitter();
								break;
							case "MeshParticleEmitter":
								emitterType = new MeshParticleEmitter();
								break;
						}

						if (emitterType) {
							const currentEmitter = this.props.object.particleEmitterType;
							registerUndoRedo({
								executeRedo: true,
								undo: () => (this.props.object.particleEmitterType = currentEmitter),
								redo: () => (this.props.object.particleEmitterType = emitterType),
							});

							this.forceUpdate();
						}
					}}
				/>

				{emitter.getClassName() === "BoxParticleEmitter" && (
					<>
						<EditorInspectorBlockField>
							<div className="px-2">Direction</div>
							<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" />
							<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" />
						</EditorInspectorBlockField>

						<EditorInspectorBlockField>
							<div className="px-2">Emit Box</div>
							<EditorInspectorVectorField grayLabel object={emitter} property="minEmitBox" label="Min" />
							<EditorInspectorVectorField grayLabel object={emitter} property="maxEmitBox" label="Max" />
						</EditorInspectorBlockField>
					</>
				)}

				{(emitter.getClassName() === "ConeParticleEmitter" || emitter.getClassName() === "ConeDirectedParticleEmitter") && (
					<>
						<EditorInspectorNumberField object={emitter} property="radius" label="Radius" />
						<EditorInspectorNumberField object={emitter} property="angle" label="Angle" />

						<EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" />
						<EditorInspectorNumberField object={emitter} property="heightRange" label="Height Range" />

						<EditorInspectorSwitchField object={emitter} property="emitFromSpawnPointOnly" label="Emit From Spawn Point Only" />

						{emitter.getClassName() === "ConeDirectedParticleEmitter" && (
							<>
								<EditorInspectorBlockField>
									<div className="px-2">Direction</div>
									<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" />
									<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" />
								</EditorInspectorBlockField>
							</>
						)}
					</>
				)}

				{(emitter.getClassName() === "CylinderParticleEmitter" || emitter.getClassName() === "CylinderDirectedParticleEmitter") && (
					<>
						<EditorInspectorNumberField object={emitter} property="radius" label="Radius" />
						<EditorInspectorNumberField object={emitter} property="height" label="Height" />

						<EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" />
						<EditorInspectorNumberField object={emitter} property="directionRandomizer" label="Direction Randomizer" />

						{emitter.getClassName() === "CylinderDirectedParticleEmitter" && (
							<>
								<EditorInspectorBlockField>
									<div className="px-2">Direction</div>
									<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" />
									<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" />
								</EditorInspectorBlockField>
							</>
						)}
					</>
				)}

				{(emitter.getClassName() === "SphereParticleEmitter" || emitter.getClassName() === "SphereDirectedParticleEmitter") && (
					<>
						<EditorInspectorNumberField object={emitter} property="radius" label="Radius" />
						<EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" />
						<EditorInspectorNumberField object={emitter} property="directionRandomizer" label="Direction Randomizer" />

						{emitter.getClassName() === "SphereDirectedParticleEmitter" && (
							<>
								<EditorInspectorBlockField>
									<div className="px-2">Direction</div>
									<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" />
									<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" />
								</EditorInspectorBlockField>
							</>
						)}
					</>
				)}

				{emitter.getClassName() === "PointParticleEmitter" && (
					<>
						<EditorInspectorBlockField>
							<div className="px-2">Direction</div>
							<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" />
							<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" />
						</EditorInspectorBlockField>
					</>
				)}

				{emitter.getClassName() === "HemisphericParticleEmitter" && (
					<>
						<EditorInspectorNumberField object={emitter} property="radius" label="Radius" />
						<EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" />
						<EditorInspectorNumberField object={emitter} property="directionRandomizer" label="Direction Randomizer" />
					</>
				)}
			</EditorInspectorSectionField>
		);
	}
}
