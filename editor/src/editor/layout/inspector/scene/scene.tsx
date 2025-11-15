import { Component, DragEvent, ReactNode } from "react";

import { IoMdCube } from "react-icons/io";
import { Divider } from "@blueprintjs/core";

import { DepthOfFieldEffectBlurLevel, Scene, TonemappingOperator, AnimationGroup, VolumetricLightScatteringPostProcess } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { isMesh } from "../../../../tools/guards/nodes";
import { isScene } from "../../../../tools/guards/scene";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { updateAllLights } from "../../../../tools/light/shadows";
import { updateIblShadowsRenderPipeline } from "../../../../tools/light/ibl";

import { createVLSPostProcess, disposeVLSPostProcess, getVLSPostProcess, parseVLSPostProcess, serializeVLSPostProcess } from "../../../rendering/vls";
import { createSSRRenderingPipeline, disposeSSRRenderingPipeline, getSSRRenderingPipeline, parseSSRRenderingPipeline, serializeSSRRenderingPipeline } from "../../../rendering/ssr";
import {
	createSSAO2RenderingPipeline,
	disposeSSAO2RenderingPipeline,
	getSSAO2RenderingPipeline,
	parseSSAO2RenderingPipeline,
	serializeSSAO2RenderingPipeline,
} from "../../../rendering/ssao";
import {
	createMotionBlurPostProcess,
	disposeMotionBlurPostProcess,
	getMotionBlurPostProcess,
	parseMotionBlurPostProcess,
	serializeMotionBlurPostProcess,
} from "../../../rendering/motion-blur";
import {
	createDefaultRenderingPipeline,
	disposeDefaultRenderingPipeline,
	getDefaultRenderingPipeline,
	parseDefaultRenderingPipeline,
	serializeDefaultRenderingPipeline,
} from "../../../rendering/default-pipeline";
import {
	createIblShadowsRenderingPipeline,
	disposeIblShadowsRenderingPipeline,
	getIblShadowsRenderingPipeline,
	parseIblShadowsRenderingPipeline,
	serializeIblShadowsRenderingPipeline,
} from "../../../rendering/ibl-shadows";

import { EditorInspectorSectionField } from "../fields/section";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorSliderField } from "../fields/slider";
import { EditorInspectorTextureField } from "../fields/texture";

import { ScriptInspectorComponent } from "../script/script";

import { IEditorInspectorImplementationProps } from "../inspector";
import { EditorSceneAnimationGroupsInspector } from "./animation-groups";

export interface IEditorSceneInspectorState {
	dragOverVlsMesh: boolean;

	animationGroupsSearch: string;
	selectedAnimationGroups: AnimationGroup[];
}

export class EditorSceneInspector extends Component<IEditorInspectorImplementationProps<Scene>, IEditorSceneInspectorState> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isScene(object);
	}

	public constructor(props: IEditorInspectorImplementationProps<Scene>) {
		super(props);

		this.state = {
			dragOverVlsMesh: false,

			animationGroupsSearch: "",
			selectedAnimationGroups: [],
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Colors">
					<EditorInspectorColorField object={this.props.object} property="clearColor" label={<div className="w-14">Clear</div>} />
					<EditorInspectorColorField object={this.props.object} property="ambientColor" label={<div className="w-14">Ambient</div>} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Environment">
					<EditorInspectorTextureField
						acceptCubeTexture
						object={this.props.object}
						property="environmentTexture"
						title="Environment Texture"
						onChange={() => this.forceUpdate()}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Fog">
					<EditorInspectorSwitchField object={this.props.object} property="fogEnabled" label="Enabled" onChange={() => this.forceUpdate()} />

					{this.props.object.fogEnabled && (
						<>
							<EditorInspectorListField
								object={this.props.object}
								property="fogMode"
								label="Mode"
								items={[
									{ text: "None", value: Scene.FOGMODE_NONE },
									{ text: "Linear", value: Scene.FOGMODE_LINEAR },
									{ text: "Exp", value: Scene.FOGMODE_EXP },
									{ text: "Exp2", value: Scene.FOGMODE_EXP2 },
								]}
								onChange={() => this.forceUpdate()}
							/>

							{this.props.object.fogMode === Scene.FOGMODE_LINEAR && (
								<>
									<EditorInspectorNumberField object={this.props.object} property="fogStart" label="Start" />
									<EditorInspectorNumberField object={this.props.object} property="fogEnd" label="End" />
								</>
							)}

							{(this.props.object.fogMode === Scene.FOGMODE_EXP || this.props.object.fogMode === Scene.FOGMODE_EXP2) && (
								<EditorInspectorNumberField object={this.props.object} property="fogDensity" label="Density" />
							)}

							<EditorInspectorColorField object={this.props.object} property="fogColor" label="Color" />
						</>
					)}
				</EditorInspectorSectionField>

				<ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

				{this._getPhysicsComponent()}

				{this._getDefaultRenderingPipelineComponent()}
				{this._getSSAO2RenderingPipelineComponent()}
				{this._getMotionBlurPostProcessComponent()}
				{this._getSSRPipelineComponent()}
				{this._getVLSComponent()}

				{/* {this.props.editor.state.enableExperimentalFeatures && this._getIblShadowsRenderingPipelineComponent()} */}

				<EditorSceneAnimationGroupsInspector editor={this.props.editor} object={this.props.object} />
			</>
		);
	}

	private _getPhysicsComponent(): ReactNode {
		const physicsEngine = this.props.editor.layout.preview.scene.getPhysicsEngine();
		if (!physicsEngine) {
			return null;
		}

		const o = {
			gravity: physicsEngine.gravity.clone(),
		};

		return (
			<EditorInspectorSectionField title="Physics">
				<EditorInspectorVectorField
					noUndoRedo
					object={o}
					property="gravity"
					label="Gravity"
					onFinishChange={() => {
						const oldGravity = physicsEngine.gravity.clone();

						registerUndoRedo({
							executeRedo: true,
							undo: () => {
								physicsEngine.setGravity(oldGravity);
								physicsEngine.gravity.copyFrom(oldGravity);
							},
							redo: () => {
								physicsEngine.setGravity(o.gravity);
								physicsEngine.gravity.copyFrom(o.gravity);
							},
						});
					}}
				/>
			</EditorInspectorSectionField>
		);
	}

	private _getDefaultRenderingPipelineComponent(): ReactNode {
		const defaultRenderingPipeline = getDefaultRenderingPipeline();

		const config = {
			enabled: defaultRenderingPipeline ? true : false,
		};

		return (
			<>
				<EditorInspectorSectionField title="Rendering Pipeline">
					<EditorInspectorSwitchField
						object={config}
						property="enabled"
						label="Enabled"
						noUndoRedo
						onChange={() => {
							const pipeline = defaultRenderingPipeline;
							const serializedPipeline = serializeDefaultRenderingPipeline();

							registerUndoRedo({
								executeRedo: true,
								undo: () => {
									if (!pipeline) {
										disposeDefaultRenderingPipeline();
									} else if (serializedPipeline) {
										parseDefaultRenderingPipeline(this.props.editor, serializedPipeline);
									}
								},
								redo: () => {
									if (pipeline) {
										disposeDefaultRenderingPipeline();
									} else if (serializedPipeline) {
										parseDefaultRenderingPipeline(this.props.editor, serializedPipeline);
									} else {
										createDefaultRenderingPipeline(this.props.editor);
									}
								},
							});

							this.forceUpdate();
						}}
					/>

					{defaultRenderingPipeline && <EditorInspectorSwitchField object={defaultRenderingPipeline} property="fxaaEnabled" label="FXAA Enabled" />}
				</EditorInspectorSectionField>

				{defaultRenderingPipeline && (
					<>
						<EditorInspectorSectionField title="Image Processing">
							<EditorInspectorSwitchField object={defaultRenderingPipeline} property="imageProcessingEnabled" label="Enabled" onChange={() => this.forceUpdate()} />
							{defaultRenderingPipeline.imageProcessingEnabled && (
								<>
									<EditorInspectorNumberField object={defaultRenderingPipeline.imageProcessing} property="exposure" label="Exposure" />
									<EditorInspectorNumberField object={defaultRenderingPipeline.imageProcessing} property="contrast" label="Contrast" />
									<EditorInspectorSwitchField object={defaultRenderingPipeline.imageProcessing} property="fromLinearSpace" label="From Linear Space" />
									<EditorInspectorSwitchField
										object={defaultRenderingPipeline.imageProcessing}
										property="toneMappingEnabled"
										label="Tone Mapping Enabled"
										onChange={() => this.forceUpdate()}
									/>

									{defaultRenderingPipeline.imageProcessing.toneMappingEnabled && (
										<EditorInspectorListField
											object={defaultRenderingPipeline.imageProcessing}
											property="toneMappingType"
											label="Tone Mapping Type"
											items={[
												{ text: "Hable", value: TonemappingOperator.Hable },
												{ text: "Reinhard", value: TonemappingOperator.Reinhard },
												{ text: "Heji Dawson", value: TonemappingOperator.HejiDawson },
												{ text: "Photographic", value: TonemappingOperator.Photographic },
											]}
										/>
									)}

									<EditorInspectorSwitchField
										object={defaultRenderingPipeline.imageProcessing}
										property="ditheringEnabled"
										label="Dithering Enabled"
										onChange={() => this.forceUpdate()}
									/>
									{defaultRenderingPipeline.imageProcessing.ditheringEnabled && (
										<EditorInspectorNumberField object={defaultRenderingPipeline.imageProcessing} property="ditheringIntensity" label="Dithering Intensity" />
									)}
								</>
							)}
						</EditorInspectorSectionField>

						{defaultRenderingPipeline.imageProcessingEnabled && (
							<>
								<EditorInspectorSectionField title="Color Grading">
									<EditorInspectorSwitchField
										object={defaultRenderingPipeline.imageProcessing}
										property="colorGradingEnabled"
										label="Enabled"
										onChange={() => this.forceUpdate()}
									/>

									{defaultRenderingPipeline.imageProcessing.colorGradingEnabled && (
										<>
											<EditorInspectorTextureField
												accept3dlTexture
												title="Texture"
												property="colorGradingTexture"
												scene={this.props.editor.layout.preview.scene}
												object={defaultRenderingPipeline.imageProcessing}
											>
												<EditorInspectorSwitchField
													object={defaultRenderingPipeline.imageProcessing.imageProcessingConfiguration}
													property="colorGradingWithGreenDepth"
													label="Use Green Depth"
												/>
											</EditorInspectorTextureField>
										</>
									)}
								</EditorInspectorSectionField>

								<EditorInspectorSectionField title="Color Curves">
									<EditorInspectorSwitchField
										object={defaultRenderingPipeline.imageProcessing}
										property="colorCurvesEnabled"
										label="Enabled"
										onChange={() => this.forceUpdate()}
									/>

									{defaultRenderingPipeline.imageProcessing.colorCurvesEnabled && (
										<>
											<div className="text-xl font-semibold px-2 text-center">Global</div>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="globalHue"
												min={0}
												max={360}
												defaultValue={30}
												label={<div className="w-16">Hue</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="globalExposure"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Exposure</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="globalDensity"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Density</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="globalSaturation"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Saturation</div>}
											/>

											<div className="text-xl font-semibold px-2 text-center">Highlights</div>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="highlightsHue"
												min={0}
												max={360}
												defaultValue={30}
												label={<div className="w-16">Hue</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="highlightsExposure"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Exposure</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="highlightsDensity"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Density</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="highlightsSaturation"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Saturation</div>}
											/>

											<div className="text-xl font-semibold px-2 text-center">Midtones</div>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="midtonesHue"
												min={0}
												max={360}
												defaultValue={30}
												label={<div className="w-16">Hue</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="midtonesExposure"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Exposure</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="midtonesDensity"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Density</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="midtonesSaturation"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Saturation</div>}
											/>

											<div className="text-xl font-semibold px-2 text-center">Shadows</div>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="shadowsHue"
												min={0}
												max={360}
												defaultValue={30}
												label={<div className="w-16">Hue</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="shadowsExposure"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Exposure</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="shadowsDensity"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Density</div>}
											/>
											<EditorInspectorSliderField
												object={defaultRenderingPipeline.imageProcessing.colorCurves}
												property="shadowsSaturation"
												min={-100}
												max={100}
												defaultValue={0}
												label={<div className="w-16">Saturation</div>}
											/>
										</>
									)}
								</EditorInspectorSectionField>
							</>
						)}

						<EditorInspectorSectionField title="Bloom">
							<EditorInspectorSwitchField object={defaultRenderingPipeline} property="bloomEnabled" label="Enabled" onChange={() => this.forceUpdate()} />
							{defaultRenderingPipeline.bloomEnabled && (
								<>
									<EditorInspectorNumberField object={defaultRenderingPipeline} property="bloomThreshold" label="Threshold" />
									<EditorInspectorNumberField object={defaultRenderingPipeline} property="bloomWeight" label="Weight" />
									<EditorInspectorNumberField object={defaultRenderingPipeline} property="bloomScale" label="Scale" min={0} max={1} />
									<EditorInspectorNumberField object={defaultRenderingPipeline} property="bloomKernel" label="Kernal" step={1} min={0} max={512} />
								</>
							)}
						</EditorInspectorSectionField>

						<EditorInspectorSectionField title="Sharpen">
							<EditorInspectorSwitchField object={defaultRenderingPipeline} property="sharpenEnabled" label="Enabled" onChange={() => this.forceUpdate()} />
							{defaultRenderingPipeline.sharpenEnabled && (
								<>
									<EditorInspectorNumberField object={defaultRenderingPipeline.sharpen} property="edgeAmount" label="Edge Amount" />
									<EditorInspectorNumberField object={defaultRenderingPipeline.sharpen} property="colorAmount" label="Color Amount" />
								</>
							)}
						</EditorInspectorSectionField>

						<EditorInspectorSectionField title="Grain">
							<EditorInspectorSwitchField object={defaultRenderingPipeline} property="grainEnabled" label="Enabled" onChange={() => this.forceUpdate()} />
							{defaultRenderingPipeline.grainEnabled && (
								<>
									<EditorInspectorNumberField object={defaultRenderingPipeline.grain} property="intensity" label="Intensity" />
									<EditorInspectorSwitchField object={defaultRenderingPipeline.grain} property="animated" label="Animated" />
								</>
							)}
						</EditorInspectorSectionField>

						<EditorInspectorSectionField title="Depth-of-field">
							<EditorInspectorSwitchField object={defaultRenderingPipeline} property="depthOfFieldEnabled" label="Enabled" onChange={() => this.forceUpdate()} />

							{defaultRenderingPipeline.depthOfFieldEnabled && (
								<>
									<EditorInspectorListField
										object={defaultRenderingPipeline}
										property="depthOfFieldBlurLevel"
										label="Blur Level"
										items={[
											{ text: "Low", value: DepthOfFieldEffectBlurLevel.Low },
											{ text: "Medium", value: DepthOfFieldEffectBlurLevel.Medium },
											{ text: "High", value: DepthOfFieldEffectBlurLevel.High },
										]}
										onChange={() => this.forceUpdate()}
									/>

									<EditorInspectorNumberField object={defaultRenderingPipeline.depthOfField} property="lensSize" label="Lens Size" step={0.1} min={0} />
									<EditorInspectorNumberField object={defaultRenderingPipeline.depthOfField} property="fStop" label="F-stop" step={0.01} min={0} />
									<EditorInspectorNumberField
										min={0}
										label="Focus Distance"
										property="focusDistance"
										object={defaultRenderingPipeline.depthOfField}
										step={(this.props.editor.layout.preview.scene.activeCamera?.maxZ ?? 0) / 1000}
										max={(this.props.editor.layout.preview.scene.activeCamera?.maxZ ?? 0) * 1000}
									/>
									<EditorInspectorNumberField object={defaultRenderingPipeline.depthOfField} property="focalLength" label="Focal Length" step={0.01} min={0} />
								</>
							)}
						</EditorInspectorSectionField>

						{defaultRenderingPipeline.imageProcessingEnabled && (
							<EditorInspectorSectionField title="Vignette">
								<EditorInspectorSwitchField
									object={defaultRenderingPipeline.imageProcessing}
									property="vignetteEnabled"
									label="Enabled"
									onChange={() => this.forceUpdate()}
								/>

								{defaultRenderingPipeline.imageProcessing.vignetteEnabled && (
									<>
										<EditorInspectorNumberField
											object={defaultRenderingPipeline.imageProcessing}
											property="vignetteWeight"
											label="Weight"
											step={0.01}
											min={0}
										/>
										<EditorInspectorColorField object={defaultRenderingPipeline.imageProcessing} property="vignetteColor" label="Color" />
									</>
								)}
							</EditorInspectorSectionField>
						)}

						<EditorInspectorSectionField title="Chromatic Aberration">
							<EditorInspectorSwitchField
								object={defaultRenderingPipeline}
								property="chromaticAberrationEnabled"
								label="Enabled"
								onChange={() => this.forceUpdate()}
							/>

							{defaultRenderingPipeline.chromaticAberrationEnabled && (
								<>
									<EditorInspectorNumberField
										object={defaultRenderingPipeline.chromaticAberration}
										property="aberrationAmount"
										label="Aberration Amount"
										step={0.01}
										min={0}
									/>
									<EditorInspectorNumberField
										object={defaultRenderingPipeline.chromaticAberration}
										property="radialIntensity"
										label="Radial Intensity"
										step={0.01}
										min={0}
									/>

									<EditorInspectorVectorField object={defaultRenderingPipeline.chromaticAberration} property="direction" label="Direction" />
									<EditorInspectorVectorField object={defaultRenderingPipeline.chromaticAberration} property="centerPosition" label="Center" />
								</>
							)}
						</EditorInspectorSectionField>

						<EditorInspectorSectionField title="Glow Layer">
							<EditorInspectorSwitchField object={defaultRenderingPipeline} property="glowLayerEnabled" label="Enabled" onChange={() => this.forceUpdate()} />

							{defaultRenderingPipeline.glowLayerEnabled && defaultRenderingPipeline.glowLayer && (
								<>
									<EditorInspectorNumberField object={defaultRenderingPipeline.glowLayer} property="intensity" label="Intensity" step={0.01} min={0} />
									<EditorInspectorNumberField
										object={defaultRenderingPipeline.glowLayer}
										property="blurKernelSize"
										label="Blur Kernel Size"
										step={1}
										min={0}
										max={512}
									/>
								</>
							)}
						</EditorInspectorSectionField>
					</>
				)}
			</>
		);
	}

	private _getSSAO2RenderingPipelineComponent(): ReactNode {
		const ssao2RenderingPipeline = getSSAO2RenderingPipeline();

		const config = {
			enabled: ssao2RenderingPipeline ? true : false,
		};

		return (
			<EditorInspectorSectionField title="SSAO2">
				<EditorInspectorSwitchField
					object={config}
					property="enabled"
					label="Enabled"
					noUndoRedo
					onChange={() => {
						const pipeline = ssao2RenderingPipeline;
						const serializedPipeline = serializeSSAO2RenderingPipeline();

						registerUndoRedo({
							executeRedo: true,
							undo: () => {
								if (!pipeline) {
									disposeSSAO2RenderingPipeline();
								} else if (serializedPipeline) {
									parseSSAO2RenderingPipeline(this.props.editor, serializedPipeline);
								}
							},
							redo: () => {
								if (pipeline) {
									disposeSSAO2RenderingPipeline();
								} else if (serializedPipeline) {
									parseSSAO2RenderingPipeline(this.props.editor, serializedPipeline);
								} else {
									createSSAO2RenderingPipeline(this.props.editor);
								}
							},
						});

						this.forceUpdate();
					}}
				/>

				{ssao2RenderingPipeline && (
					<>
						<EditorInspectorNumberField object={ssao2RenderingPipeline} property="radius" label="Radius" />
						<EditorInspectorNumberField object={ssao2RenderingPipeline} property="totalStrength" label="Total Strength" />
						<EditorInspectorNumberField object={ssao2RenderingPipeline} property="maxZ" label="Max Z" step={1} />

						<Divider />

						<EditorInspectorNumberField object={ssao2RenderingPipeline} property="minZAspect" label="Min Z Aspect" />
						<EditorInspectorNumberField object={ssao2RenderingPipeline} property="epsilon" label="epsilon" />

						<Divider />

						<EditorInspectorNumberField object={ssao2RenderingPipeline} property="bilateralSamples" label="Bilateral Samples" step={1} />
						<EditorInspectorNumberField object={ssao2RenderingPipeline} property="bilateralSoften" label="Bilateral Soften" />
						<EditorInspectorNumberField object={ssao2RenderingPipeline} property="bilateralTolerance" label="Bilateral Tolerance" />
						<EditorInspectorSwitchField object={ssao2RenderingPipeline} property="bypassBlur" label="Bypass Blur" />
						<EditorInspectorSwitchField object={ssao2RenderingPipeline} property="expensiveBlur" label="Expensive Blur" />
					</>
				)}
			</EditorInspectorSectionField>
		);
	}

	private _getMotionBlurPostProcessComponent(): ReactNode {
		const motionBlurPostProcess = getMotionBlurPostProcess();

		const config = {
			enabled: motionBlurPostProcess ? true : false,
		};

		return (
			<EditorInspectorSectionField title="Motion Blur">
				<EditorInspectorSwitchField
					object={config}
					property="enabled"
					label="Enabled"
					noUndoRedo
					onChange={() => {
						const pipeline = motionBlurPostProcess;
						const serializedPipeline = serializeMotionBlurPostProcess();

						registerUndoRedo({
							executeRedo: true,
							undo: () => {
								if (!pipeline) {
									disposeMotionBlurPostProcess();
								} else if (serializedPipeline) {
									parseMotionBlurPostProcess(this.props.editor, serializedPipeline);
								}
							},
							redo: () => {
								if (pipeline) {
									disposeMotionBlurPostProcess();
								} else if (serializedPipeline) {
									parseMotionBlurPostProcess(this.props.editor, serializedPipeline);
								} else {
									createMotionBlurPostProcess(this.props.editor);
								}
							},
						});

						this.forceUpdate();
					}}
				/>

				{motionBlurPostProcess && (
					<>
						<EditorInspectorSwitchField object={motionBlurPostProcess} property="isObjectBased" label="Object Based" />
						<EditorInspectorNumberField object={motionBlurPostProcess} property="motionStrength" label="Motion Strength" />
						<EditorInspectorNumberField object={motionBlurPostProcess} property="motionBlurSamples" label="Motion Blur Samples" min={0} step={1} />
					</>
				)}
			</EditorInspectorSectionField>
		);
	}

	private _getSSRPipelineComponent(): ReactNode {
		const ssrRenderingPipeline = getSSRRenderingPipeline();

		const config = {
			enabled: ssrRenderingPipeline ? true : false,
		};

		return (
			<EditorInspectorSectionField title="Reflections">
				<EditorInspectorSwitchField
					object={config}
					property="enabled"
					label="Enabled"
					noUndoRedo
					onChange={() => {
						const pipeline = ssrRenderingPipeline;
						const serializedPipeline = serializeSSRRenderingPipeline();

						registerUndoRedo({
							executeRedo: true,
							undo: () => {
								if (!pipeline) {
									disposeSSRRenderingPipeline();
								} else if (serializedPipeline) {
									parseSSRRenderingPipeline(this.props.editor, serializedPipeline);
								}
							},
							redo: () => {
								if (pipeline) {
									disposeSSRRenderingPipeline();
								} else if (serializedPipeline) {
									parseSSRRenderingPipeline(this.props.editor, serializedPipeline);
								} else {
									createSSRRenderingPipeline(this.props.editor);
								}
							},
						});

						this.forceUpdate();
					}}
				/>

				{ssrRenderingPipeline && (
					<>
						<EditorInspectorNumberField object={ssrRenderingPipeline} property="step" label="Step" min={0} />
						<EditorInspectorNumberField object={ssrRenderingPipeline} property="thickness" label="Thickness" />
						<EditorInspectorNumberField object={ssrRenderingPipeline} property="strength" label="Strength" min={0} />
						<EditorInspectorNumberField
							object={ssrRenderingPipeline}
							property="reflectionSpecularFalloffExponent"
							label="Reflection Specular Falloff Exponent"
							min={0}
						/>
						<EditorInspectorNumberField object={ssrRenderingPipeline} property="maxSteps" label="Max Steps" min={0} />
						<EditorInspectorNumberField object={ssrRenderingPipeline} property="maxDistance" label="Max Distance" min={0} />

						<Divider />

						<EditorInspectorNumberField object={ssrRenderingPipeline} property="roughnessFactor" label="Roughness Factors" min={0} max={1} />
						<EditorInspectorNumberField object={ssrRenderingPipeline} property="reflectivityThreshold" label="Reflectivity Threshold" min={0} />
						<EditorInspectorNumberField object={ssrRenderingPipeline} property="blurDispersionStrength" label="Blur Dispersion Strength" min={0} />

						<Divider />

						<EditorInspectorSwitchField object={ssrRenderingPipeline} property="clipToFrustum" label="Clip To Frustum" />
						<EditorInspectorSwitchField object={ssrRenderingPipeline} property="enableSmoothReflections" label="Enable Smooth Reflections" />
						<EditorInspectorSwitchField object={ssrRenderingPipeline} property="enableAutomaticThicknessComputation" label="Enable Automatic Thickness Computation" />

						<EditorInspectorSwitchField object={ssrRenderingPipeline} property="attenuateFacingCamera" label="Attenuate Facing Camera" />
						<EditorInspectorSwitchField object={ssrRenderingPipeline} property="attenuateScreenBorders" label="Attenuate Screen Borders" />
						<EditorInspectorSwitchField object={ssrRenderingPipeline} property="attenuateIntersectionDistance" label="Attenuate Intersection Distance" />
						<EditorInspectorSwitchField object={ssrRenderingPipeline} property="attenuateBackfaceReflection" label="Attenuate Backface Reflection" />

						<Divider />

						<EditorInspectorNumberField object={ssrRenderingPipeline} property="blurDownsample" label="Blur Down Sample" step={1} min={1} max={5} />
						<EditorInspectorNumberField object={ssrRenderingPipeline} property="selfCollisionNumSkip" label="Self Collision Num Skip" step={1} min={1} max={3} />
						<EditorInspectorNumberField object={ssrRenderingPipeline} property="ssrDownsample" label="SSR Down Sample" step={1} min={1} max={5} />
						<EditorInspectorNumberField
							object={ssrRenderingPipeline}
							property="backfaceDepthTextureDownsample"
							label="Backface Depth Texture Sample"
							step={1}
							min={1}
							max={5}
						/>
					</>
				)}
			</EditorInspectorSectionField>
		);
	}

	private _getVLSComponent(): ReactNode {
		const vlsPostProcess = getVLSPostProcess();

		const config = {
			enabled: vlsPostProcess ? true : false,
		};

		return (
			<EditorInspectorSectionField title="Volumetric Light Scattering">
				<EditorInspectorSwitchField
					object={config}
					property="enabled"
					label="Enabled"
					noUndoRedo
					onChange={() => {
						const pipeline = vlsPostProcess;
						const serializedPostProcess = serializeVLSPostProcess();

						registerUndoRedo({
							executeRedo: true,
							undo: () => {
								if (!pipeline) {
									disposeVLSPostProcess(this.props.editor);
								} else if (serializedPostProcess) {
									parseVLSPostProcess(this.props.editor, serializedPostProcess);
								}
							},
							redo: () => {
								if (pipeline) {
									disposeVLSPostProcess(this.props.editor);
								} else if (serializedPostProcess) {
									parseVLSPostProcess(this.props.editor, serializedPostProcess);
								} else {
									createVLSPostProcess(this.props.editor);
								}
							},
						});

						this.forceUpdate();
					}}
				/>

				{vlsPostProcess && (
					<>
						<EditorInspectorNumberField object={vlsPostProcess} property="exposure" label="Exposure" min={0} />
						<EditorInspectorNumberField object={vlsPostProcess} property="weight" label="Weight" min={0} />
						<EditorInspectorNumberField object={vlsPostProcess} property="decay" label="Decay" step={0.001} min={0} />
						<EditorInspectorNumberField object={vlsPostProcess} property="density" label="Density" step={0.001} min={0} />

						<EditorInspectorSwitchField object={vlsPostProcess} property="invert" label="Invert" />

						<EditorInspectorSwitchField object={vlsPostProcess} property="useCustomMeshPosition" label="Use Custom Mesh Position" onChange={() => this.forceUpdate()} />

						{vlsPostProcess.useCustomMeshPosition && (
							<EditorInspectorVectorField object={vlsPostProcess} property="customMeshPosition" label="Custom Mesh Position" step={1} />
						)}

						<div
							onDrop={(ev) => this._handleDropVlsMesh(ev, vlsPostProcess)}
							onDragOver={(ev) => this._handleDragOverVlsMesh(ev)}
							onDragLeave={() => this.setState({ dragOverVlsMesh: false })}
							className={`flex flex-col justify-center items-center w-full h-[64px] rounded-lg border-[1px] border-secondary-foreground/35 border-dashed ${this.state.dragOverVlsMesh ? "bg-secondary-foreground/35" : ""} transition-all duration-300 ease-in-out`}
						>
							{!vlsPostProcess.mesh && <div>Drag'n'drop a mesh here</div>}

							{vlsPostProcess.mesh && (
								<div className="flex flex-col items-center gap-2">
									<div className="flex items-center gap-2">
										<IoMdCube className="w-4 h-4" />
										{vlsPostProcess.mesh.name}
									</div>
									<div className="text-xs">Drag'n'drop a mesh here</div>
								</div>
							)}
						</div>
					</>
				)}
			</EditorInspectorSectionField>
		);
	}

	private _handleDragOverVlsMesh(event: DragEvent<HTMLDivElement>): void {
		event.preventDefault();
		event.stopPropagation();

		this.setState({
			dragOverVlsMesh: true,
		});
	}

	private _handleDropVlsMesh(event: DragEvent<HTMLDivElement>, vlsPostProcess: VolumetricLightScatteringPostProcess): void {
		event.preventDefault();
		event.stopPropagation();

		this.setState({
			dragOverVlsMesh: false,
		});

		const eventData = event.dataTransfer.getData("graph/node");
		const node = this.props.editor.layout.graph.getSelectedNodes()[0].nodeData;

		if (eventData && node && isMesh(node)) {
			const oldMesh = vlsPostProcess.mesh;

			registerUndoRedo({
				executeRedo: true,
				undo: () => {
					vlsPostProcess.mesh = oldMesh;
					const serializationObject = serializeVLSPostProcess();
					disposeVLSPostProcess(this.props.editor);
					parseVLSPostProcess(this.props.editor, serializationObject);
				},
				redo: () => {
					vlsPostProcess.mesh = node;
					const serializationObject = serializeVLSPostProcess();
					disposeVLSPostProcess(this.props.editor);
					parseVLSPostProcess(this.props.editor, serializationObject);
				},
			});

			this.forceUpdate();
		}
	}

	// @ts-ignore
	private _getIblShadowsRenderingPipelineComponent(): ReactNode {
		const iblShadowsRenderPipeline = getIblShadowsRenderingPipeline();

		const config = {
			enabled: iblShadowsRenderPipeline ? true : false,
		};

		return (
			<EditorInspectorSectionField title="IBL Shadows">
				<EditorInspectorSwitchField
					object={config}
					property="enabled"
					label="Enabled"
					noUndoRedo
					onChange={() => {
						const pipeline = iblShadowsRenderPipeline;
						const serializedPipeline = serializeIblShadowsRenderingPipeline();

						registerUndoRedo({
							executeRedo: true,
							action: () => {
								updateAllLights(this.props.editor.layout.preview.scene);
							},
							undo: () => {
								if (!pipeline) {
									disposeIblShadowsRenderingPipeline();
								} else if (serializedPipeline) {
									parseIblShadowsRenderingPipeline(this.props.editor, serializedPipeline);
								}
							},
							redo: () => {
								if (pipeline) {
									disposeIblShadowsRenderingPipeline();
								} else if (serializedPipeline) {
									parseIblShadowsRenderingPipeline(this.props.editor, serializedPipeline);
								} else {
									createIblShadowsRenderingPipeline(this.props.editor);
								}
							},
						});

						this.forceUpdate();
					}}
				/>

				{iblShadowsRenderPipeline && (
					<>
						<EditorInspectorNumberField object={iblShadowsRenderPipeline} property="shadowRemanence" label="Shadow Remanence" min={0} max={1} />
						<EditorInspectorNumberField object={iblShadowsRenderPipeline} property="shadowOpacity" label="Shadow Opacity" min={0} max={1} />
						<EditorInspectorNumberField object={iblShadowsRenderPipeline} property="resolutionExp" label="Resolution Exponent" step={1} min={1} max={14} />
						<EditorInspectorNumberField object={iblShadowsRenderPipeline} property="sampleDirections" label="Sample Directions" step={1} min={1} max={4} />

						<Button variant="ghost" size="sm" onClick={() => updateIblShadowsRenderPipeline(this.props.editor.layout.preview.scene, true)}>
							Update voxelization
						</Button>
					</>
				)}
			</EditorInspectorSectionField>
		);
	}
}
