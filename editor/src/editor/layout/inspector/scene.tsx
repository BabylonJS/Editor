import { DepthOfFieldEffectBlurLevel, Scene, TonemappingOperator } from "babylonjs";

import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";
import { IoPlay, IoStop } from "react-icons/io5";

import { Divider } from "@blueprintjs/core";

import { Button } from "../../../ui/shadcn/ui/button";

import { registerUndoRedo } from "../../../tools/undoredo";

import { createSSRRenderingPipeline, disposeSSRRenderingPipeline, getSSRRenderingPipeline, parseSSRRenderingPipeline, serializeSSRRenderingPipeline } from "../../rendering/ssr";
import { createSSAO2RenderingPipeline, disposeSSAO2RenderingPipeline, getSSAO2RenderingPipeline, parseSSAO2RenderingPipeline, serializeSSAO2RenderingPipeline } from "../../rendering/ssao";
import { createMotionBlurPostProcess, disposeMotionBlurPostProcess, getMotionBlurPostProcess, parseMotionBlurPostProcess, serializeMotionBlurPostProcess } from "../../rendering/motion-blur";
import { createDefaultRenderingPipeline, disposeDefaultRenderingPipeline, getDefaultRenderingPipeline, parseDefaultRenderingPipeline, serializeDefaultRenderingPipeline } from "../../rendering/default-pipeline";

import { isScene } from "../../../tools/guards/scene";

import { EditorInspectorSectionField } from "./fields/section";

import { EditorInspectorListField } from "./fields/list";
import { EditorInspectorColorField } from "./fields/color";
import { EditorInspectorSwitchField } from "./fields/switch";
import { EditorInspectorNumberField } from "./fields/number";
import { EditorInspectorTextureField } from "./fields/texture";

import { ScriptInspectorComponent } from "./script/script";

import { IEditorInspectorImplementationProps } from "./inspector";

export class EditorSceneInspector extends Component<IEditorInspectorImplementationProps<Scene>> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: unknown): boolean {
        return isScene(object);
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Colors">
                    <EditorInspectorColorField object={this.props.object} property="clearColor" label={<div className="w-14">Clear</div>} />
                    <EditorInspectorColorField object={this.props.object} property="ambientColor" label={<div className="w-14">Ambient</div>} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Environment">
                    <EditorInspectorTextureField acceptCubeTexture object={this.props.object} property="environmentTexture" title="Environment Texture" onChange={() => this.forceUpdate()} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Fog">
                    <EditorInspectorSwitchField object={this.props.object} property="fogEnabled" label="Enabled" onChange={() => this.forceUpdate()} />

                    {this.props.object.fogEnabled &&
                        <>
                            <EditorInspectorListField object={this.props.object} property="fogMode" label="Mode" items={[
                                { text: "None", value: Scene.FOGMODE_NONE },
                                { text: "Linear", value: Scene.FOGMODE_LINEAR },
                                { text: "Exp", value: Scene.FOGMODE_EXP },
                                { text: "Exp2", value: Scene.FOGMODE_EXP2 },
                            ]} onChange={() => this.forceUpdate()} />

                            {this.props.object.fogMode === Scene.FOGMODE_LINEAR &&
                                <>
                                    <EditorInspectorNumberField object={this.props.object} property="fogStart" label="Start" />
                                    <EditorInspectorNumberField object={this.props.object} property="fogEnd" label="End" />
                                </>
                            }

                            {(this.props.object.fogMode === Scene.FOGMODE_EXP || this.props.object.fogMode === Scene.FOGMODE_EXP2) &&
                                <EditorInspectorNumberField object={this.props.object} property="fogDensity" label="Density" />
                            }

                            <EditorInspectorColorField object={this.props.object} property="fogColor" label="Color" />
                        </>
                    }
                </EditorInspectorSectionField>

                <ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

                {this._getDefaultRenderingPipelineComponent()}
                {this._getSSAO2RenderingPipelineComponent()}
                {this._getMotionBlurPostProcessComponent()}
                {this._getSSRPipelineComponent()}

                {this._getAnimationGroupsComponent()}
            </>
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
                    <EditorInspectorSwitchField object={config} property="enabled" label="Enabled" noUndoRedo onChange={() => {
                        const pipeline = defaultRenderingPipeline;
                        const serializedPipeline = serializeDefaultRenderingPipeline();

                        registerUndoRedo({
                            executeRedo: true,
                            undo: () => {
                                if (!pipeline) {
                                    disposeDefaultRenderingPipeline();
                                } else {
                                    if (serializedPipeline) {
                                        parseDefaultRenderingPipeline(this.props.editor, serializedPipeline);
                                    }
                                }
                            },
                            redo: () => {
                                if (pipeline) {
                                    disposeDefaultRenderingPipeline();
                                } else {
                                    if (serializedPipeline) {
                                        parseDefaultRenderingPipeline(this.props.editor, serializedPipeline);
                                    } else {
                                        createDefaultRenderingPipeline(this.props.editor);
                                    }
                                }
                            },
                        });

                        this.forceUpdate();
                    }} />

                    {defaultRenderingPipeline &&
                        <EditorInspectorSwitchField object={defaultRenderingPipeline} property="fxaaEnabled" label="FXAA Enabled" />
                    }
                </EditorInspectorSectionField>

                {defaultRenderingPipeline &&
                    <>
                        <EditorInspectorSectionField title="Image Processing">
                            <EditorInspectorSwitchField object={defaultRenderingPipeline} property="imageProcessingEnabled" label="Image Processing Enabled" onChange={() => this.forceUpdate()} />
                            {defaultRenderingPipeline.imageProcessingEnabled &&
                                <>
                                    <EditorInspectorNumberField object={defaultRenderingPipeline.imageProcessing} property="exposure" label="Exposure" />
                                    <EditorInspectorNumberField object={defaultRenderingPipeline.imageProcessing} property="contrast" label="Contrast" />
                                    <EditorInspectorSwitchField object={defaultRenderingPipeline.imageProcessing} property="fromLinearSpace" label="From Linear Space" />
                                    <EditorInspectorSwitchField object={defaultRenderingPipeline.imageProcessing} property="toneMappingEnabled" label="Tone Mapping Enabled" onChange={() => this.forceUpdate()} />

                                    {defaultRenderingPipeline.imageProcessing.toneMappingEnabled &&
                                        <EditorInspectorListField object={defaultRenderingPipeline.imageProcessing} property="toneMappingType" label="Tone Mapping Type" items={[
                                            { text: "Hable", value: TonemappingOperator.Hable },
                                            { text: "Reinhard", value: TonemappingOperator.Reinhard },
                                            { text: "Heji Dawson", value: TonemappingOperator.HejiDawson },
                                            { text: "Photographic", value: TonemappingOperator.Photographic },
                                        ]} />
                                    }

                                    <EditorInspectorSwitchField object={defaultRenderingPipeline.imageProcessing} property="ditheringEnabled" label="Dithering Enabled" onChange={() => this.forceUpdate()} />
                                    {defaultRenderingPipeline.imageProcessing.ditheringEnabled &&
                                        <EditorInspectorNumberField object={defaultRenderingPipeline.imageProcessing} property="ditheringIntensity" label="Dithering Intensity" />
                                    }
                                </>
                            }
                        </EditorInspectorSectionField>

                        <EditorInspectorSectionField title="Bloom">
                            <EditorInspectorSwitchField object={defaultRenderingPipeline} property="bloomEnabled" label="Bloom Enabled" onChange={() => this.forceUpdate()} />
                            {defaultRenderingPipeline.bloomEnabled &&
                                <>
                                    <EditorInspectorNumberField object={defaultRenderingPipeline} property="bloomThreshold" label="Threshold" />
                                    <EditorInspectorNumberField object={defaultRenderingPipeline} property="bloomWeight" label="Weight" />
                                    <EditorInspectorNumberField object={defaultRenderingPipeline} property="bloomScale" label="Scale" min={0} max={1} />
                                    <EditorInspectorNumberField object={defaultRenderingPipeline} property="bloomKernel" label="Kernal" step={1} min={0} max={512} />
                                </>
                            }
                        </EditorInspectorSectionField>

                        <EditorInspectorSectionField title="Sharpen">
                            <EditorInspectorSwitchField object={defaultRenderingPipeline} property="sharpenEnabled" label="Sharpen Enabled" onChange={() => this.forceUpdate()} />
                            {defaultRenderingPipeline.sharpenEnabled &&
                                <>
                                    <EditorInspectorNumberField object={defaultRenderingPipeline.sharpen} property="edgeAmount" label="Edge Amount" />
                                    <EditorInspectorNumberField object={defaultRenderingPipeline.sharpen} property="colorAmount" label="Color Amount" />
                                </>
                            }
                        </EditorInspectorSectionField>

                        <EditorInspectorSectionField title="Grain">
                            <EditorInspectorSwitchField object={defaultRenderingPipeline} property="grainEnabled" label="Grain Enabled" onChange={() => this.forceUpdate()} />
                            {defaultRenderingPipeline.grainEnabled &&
                                <>
                                    <EditorInspectorNumberField object={defaultRenderingPipeline.grain} property="intensity" label="Intensity" />
                                    <EditorInspectorSwitchField object={defaultRenderingPipeline.grain} property="animated" label="Animated" />
                                </>
                            }
                        </EditorInspectorSectionField>

                        <EditorInspectorSectionField title="Depth-of-field">
                            <EditorInspectorSwitchField object={defaultRenderingPipeline} property="depthOfFieldEnabled" label="Depth-of-field Enabled" onChange={() => this.forceUpdate()} />

                            {defaultRenderingPipeline.depthOfFieldEnabled &&
                                <>
                                    <EditorInspectorListField object={defaultRenderingPipeline} property="depthOfFieldBlurLevel" label="Blur Level" items={[
                                        { text: "Low", value: DepthOfFieldEffectBlurLevel.Low },
                                        { text: "Medium", value: DepthOfFieldEffectBlurLevel.Medium },
                                        { text: "High", value: DepthOfFieldEffectBlurLevel.High },
                                    ]} onChange={() => this.forceUpdate()} />

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
                            }
                        </EditorInspectorSectionField>
                    </>
                }
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
                <EditorInspectorSwitchField object={config} property="enabled" label="Enabled" noUndoRedo onChange={() => {
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
                }} />

                {ssao2RenderingPipeline &&
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
                }
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
                <EditorInspectorSwitchField object={config} property="enabled" label="Enabled" noUndoRedo onChange={() => {
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
                }} />

                {motionBlurPostProcess &&
                    <>
                        <EditorInspectorSwitchField object={motionBlurPostProcess} property="isObjectBased" label="Object Based" />
                        <EditorInspectorNumberField object={motionBlurPostProcess} property="motionStrength" label="Motion Strength" />
                        <EditorInspectorNumberField object={motionBlurPostProcess} property="motionBlurSamples" label="Motion Blur Samples" min={0} step={1} />
                    </>
                }
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
                <EditorInspectorSwitchField object={config} property="enabled" label="Enabled" noUndoRedo onChange={() => {
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
                }} />

                {ssrRenderingPipeline &&
                    <>
                        <EditorInspectorNumberField object={ssrRenderingPipeline} property="step" label="Step" min={0} />
                        <EditorInspectorNumberField object={ssrRenderingPipeline} property="thickness" label="Thickness" />
                        <EditorInspectorNumberField object={ssrRenderingPipeline} property="strength" label="Strength" min={0} />
                        <EditorInspectorNumberField object={ssrRenderingPipeline} property="reflectionSpecularFalloffExponent" label="Reflection Specular Falloff Exponent" min={0} />
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
                        <EditorInspectorNumberField object={ssrRenderingPipeline} property="backfaceDepthTextureDownsample" label="Backface Depth Texture Sample" step={1} min={1} max={5} />
                    </>
                }
            </EditorInspectorSectionField>
        );
    }

    private _getAnimationGroupsComponent(): ReactNode {
        return (
            <EditorInspectorSectionField title="Animation Groups">
                {!this.props.object.animationGroups.length &&
                    <div className="text-center text-xl">
                        No animation groups
                    </div>
                }
                <div className="flex flex-col">
                    {this.props.object.animationGroups.map((animationGroup) => (
                        <div key={animationGroup.name} className="flex flex-col">
                            <div
                                className={`
                                    flex gap-2 justify-between items-center p-2 rounded-lg
                                    hover:bg-accent
                                    transition-all duration-300 ease-in-out
                                `}
                            >
                                <div className="flex gap-2 items-center">
                                    <Button
                                        variant="ghost"
                                        className="w-8 h-8 p-1"
                                        onClick={() => {
                                            animationGroup.isPlaying ? animationGroup.stop() : animationGroup.start();
                                            this.forceUpdate();
                                        }}
                                    >
                                        {animationGroup.isPlaying
                                            ? <IoStop className="w-6 h-6" strokeWidth={1} />
                                            : <IoPlay className="w-6 h-6" strokeWidth={1} />
                                        }
                                    </Button>

                                    <div className="flex flex-col">
                                        <div>
                                            {animationGroup.name}
                                        </div>

                                        <div className="text-xs">
                                            Duration: {Math.round(animationGroup.to - animationGroup.from)} frames
                                        </div>
                                    </div>
                                </div>

                                {animationGroup.isPlaying &&
                                    <Grid width={16} height={16} color="gray" />
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </EditorInspectorSectionField>
        );
    }
}
