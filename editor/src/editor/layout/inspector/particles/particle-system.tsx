import { Component, ReactNode } from "react";

import { IoPlay, IoStop, IoRefresh } from "react-icons/io5";

import {
    ParticleSystem, IParticleEmitterType, BoxParticleEmitter, ConeParticleEmitter, ConeDirectedParticleEmitter,
    CylinderParticleEmitter, CylinderDirectedParticleEmitter, SphereParticleEmitter, SphereDirectedParticleEmitter,
    PointParticleEmitter, HemisphericParticleEmitter, MeshParticleEmitter,
} from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { isParticleSystem } from "../../../../tools/guards/particles";
import { onParticleSystemModifiedObservable } from "../../../../tools/observables";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorTextureField } from "../fields/texture";

import { IEditorInspectorImplementationProps } from "../inspector";

export interface IEditorParticleSystemInspectorState {
    started: boolean;
}

export class EditorParticleSystemInspector extends Component<IEditorInspectorImplementationProps<ParticleSystem>, IEditorParticleSystemInspectorState> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: unknown): boolean {
        return isParticleSystem(object);
    }

    public constructor(props: IEditorInspectorImplementationProps<ParticleSystem>) {
        super(props);

        this.state = {
            started: props.object.isAlive(),
        };
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Common">
                    <div className="flex justify-between items-center px-2 py-2">
                        <div className="w-1/2">
                            Type
                        </div>

                        <div className="text-white/50">
                            {this.props.object.getClassName()}
                        </div>
                    </div>

                    <EditorInspectorStringField label="Name" object={this.props.object} property="name" onChange={() => onParticleSystemModifiedObservable.notifyObservers(this.props.object)} />

                    <EditorInspectorVectorField object={this.props.object} property="worldOffset" label="Offset" />
                    <EditorInspectorVectorField object={this.props.object} property="gravity" label="Gravity" />

                    <EditorInspectorSwitchField object={this.props.object} property="isLocal" label="Is Local" onChange={() => this.forceUpdate()} />
                    <EditorInspectorSwitchField object={this.props.object} property="isBillboardBased" label="Is Billboard Based" onChange={() => this.forceUpdate()} />

                    {this.props.object.isBillboardBased &&
                        <EditorInspectorListField object={this.props.object} property="billboardMode" label="Billboard Mode" items={[
                            { text: "All", value: ParticleSystem.BILLBOARDMODE_ALL },
                            { text: "Y", value: ParticleSystem.BILLBOARDMODE_Y },
                            { text: "Stretched", value: ParticleSystem.BILLBOARDMODE_STRETCHED },
                            { text: "Stretched Local", value: ParticleSystem.BILLBOARDMODE_STRETCHED_LOCAL },
                        ]} />
                    }
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
                            {this.state.started
                                ? <IoStop className="w-6 h-6" strokeWidth={1} color="red" />
                                : <IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
                            }
                        </Button>

                        <Button
                            onClick={() => this.props.object.reset()}
                            className="w-10 h-10 bg-muted/50 !rounded-lg p-0.5"

                        >
                            <IoRefresh className="w-6 h-6" strokeWidth={1} color="red" />
                        </Button>
                    </div>
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Textures">
                    <EditorInspectorTextureField object={this.props.object} property="particleTexture" title="Base Texture" />
                    <EditorInspectorListField object={this.props.object} property="blendMode" label="Blend Mode" items={[
                        { text: "Add", value: ParticleSystem.BLENDMODE_ADD },
                        { text: "Multiply", value: ParticleSystem.BLENDMODE_MULTIPLY },
                        { text: "Multiply Add", value: ParticleSystem.BLENDMODE_MULTIPLYADD },
                        { text: "One-one", value: ParticleSystem.BLENDMODE_ONEONE },
                        { text: "Standard", value: ParticleSystem.BLENDMODE_STANDARD },
                    ]} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Emission">
                    {this._getCapacityInspector()}

                    <EditorInspectorNumberField object={this.props.object} property="emitRate" label="Rate" />

                    <EditorInspectorNumberField object={this.props.object} property="minEmitPower" label="Min Power" min={0} max={this.props.object.maxEmitPower} onChange={() => this.forceUpdate()} />
                    <EditorInspectorNumberField object={this.props.object} property="maxEmitPower" label="Max Power" min={this.props.object.minEmitPower} onChange={() => this.forceUpdate()} />

                    <EditorInspectorNumberField object={this.props.object} property="minAngularSpeed" label="Min Augular Speed" min={0} max={this.props.object.maxAngularSpeed} onChange={() => this.forceUpdate()} />
                    <EditorInspectorNumberField object={this.props.object} property="maxAngularSpeed" label="Max Angular Speed" min={this.props.object.minAngularSpeed} onChange={() => this.forceUpdate()} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Size">
                    <EditorInspectorNumberField object={this.props.object} property="minSize" label="Min Size" min={0} max={this.props.object.maxSize} onChange={() => this.forceUpdate()} />
                    <EditorInspectorNumberField object={this.props.object} property="maxSize" label="Max Size" min={this.props.object.minSize} onChange={() => this.forceUpdate()} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Colors">
                    <EditorInspectorColorField object={this.props.object} property="color1" label="Color 1" />
                    <EditorInspectorColorField object={this.props.object} property="color2" label="Color 2" />
                    <EditorInspectorColorField object={this.props.object} property="colorDead" label="Dead" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Lifetime">
                    <EditorInspectorNumberField object={this.props.object} property="minLifeTime" label="Min Lifetime" min={0} max={this.props.object.maxLifeTime} onChange={() => this.forceUpdate()} />
                    <EditorInspectorNumberField object={this.props.object} property="maxLifeTime" label="Max Lifetime" min={this.props.object.minLifeTime} onChange={() => this.forceUpdate()} />
                </EditorInspectorSectionField>

                {this._getEmitterTypeInspector()}
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
                max={100_000}
                step={1}
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
                            case "BoxParticleEmitter": emitterType = new BoxParticleEmitter(); break;
                            case "ConeParticleEmitter": emitterType = new ConeParticleEmitter(); break;
                            case "ConeDirectedParticleEmitter": emitterType = new ConeDirectedParticleEmitter(); break;
                            case "CylinderParticleEmitter": emitterType = new CylinderParticleEmitter(); break;
                            case "CylinderDirectedParticleEmitter": emitterType = new CylinderDirectedParticleEmitter(); break;
                            case "SphereParticleEmitter": emitterType = new SphereParticleEmitter(); break;
                            case "SphereDirectedParticleEmitter": emitterType = new SphereDirectedParticleEmitter(); break;
                            case "PointParticleEmitter": emitterType = new PointParticleEmitter(); break;
                            case "HemisphericParticleEmitter": emitterType = new HemisphericParticleEmitter(); break;
                            case "MeshParticleEmitter": emitterType = new MeshParticleEmitter(); break;
                        }

                        if (emitterType) {
                            const currentEmitter = this.props.object.particleEmitterType;
                            registerUndoRedo({
                                executeRedo: true,
                                undo: () => this.props.object.particleEmitterType = currentEmitter,
                                redo: () => this.props.object.particleEmitterType = emitterType,
                            });

                            this.forceUpdate();
                        }
                    }}
                />

                {emitter.getClassName() === "BoxParticleEmitter" &&
                    <>
                        <EditorInspectorVectorField object={emitter} property="direction1" label="Direction 1" />
                        <EditorInspectorVectorField object={emitter} property="direction2" label="Direction 2" />

                        <EditorInspectorVectorField object={emitter} property="minEmitBox" label="Min Emit Box" />
                        <EditorInspectorVectorField object={emitter} property="maxEmitBox" label="Max Emit Box" />
                    </>
                }

                {(emitter.getClassName() === "ConeParticleEmitter" || emitter.getClassName() === "ConeDirectedParticleEmitter") &&
                    <>
                        <EditorInspectorNumberField object={emitter} property="radius" label="Radius" />
                        <EditorInspectorNumberField object={emitter} property="angle" label="Angle" />

                        <EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" />
                        <EditorInspectorNumberField object={emitter} property="heightRange" label="Height Range" />

                        <EditorInspectorSwitchField object={emitter} property="emitFromSpawnPointOnly" label="Emit From Spawn Point Only" />

                        {emitter.getClassName() === "ConeDirectedParticleEmitter" &&
                            <>
                                <EditorInspectorVectorField object={emitter} property="direction1" label="Direction 1" />
                                <EditorInspectorVectorField object={emitter} property="direction2" label="Direction 2" />
                            </>
                        }
                    </>
                }

                {(emitter.getClassName() === "CylinderParticleEmitter" || emitter.getClassName() === "CylinderDirectedParticleEmitter") &&
                    <>
                        <EditorInspectorNumberField object={emitter} property="radius" label="Radius" />
                        <EditorInspectorNumberField object={emitter} property="height" label="Height" />

                        <EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" />
                        <EditorInspectorNumberField object={emitter} property="directionRandomizer" label="Direction Randomizer" />

                        {emitter.getClassName() === "CylinderDirectedParticleEmitter" &&
                            <>
                                <EditorInspectorVectorField object={emitter} property="direction1" label="Direction 1" />
                                <EditorInspectorVectorField object={emitter} property="direction2" label="Direction 2" />
                            </>
                        }
                    </>
                }

                {(emitter.getClassName() === "SphereParticleEmitter" || emitter.getClassName() === "SphereDirectedParticleEmitter") &&
                    <>
                        <EditorInspectorNumberField object={emitter} property="radius" label="Radius" />
                        <EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" />
                        <EditorInspectorNumberField object={emitter} property="directionRandomizer" label="Direction Randomizer" />

                        {emitter.getClassName() === "SphereDirectedParticleEmitter" &&
                            <>
                                <EditorInspectorVectorField object={emitter} property="direction1" label="Direction 1" />
                                <EditorInspectorVectorField object={emitter} property="direction2" label="Direction 2" />
                            </>
                        }
                    </>
                }

                {emitter.getClassName() === "PointParticleEmitter" &&
                    <>
                        <EditorInspectorVectorField object={emitter} property="direction1" label="Direction 1" />
                        <EditorInspectorVectorField object={emitter} property="direction2" label="Direction 2" />
                    </>
                }

                {emitter.getClassName() === "HemisphericParticleEmitter" &&
                    <>
                        <EditorInspectorNumberField object={emitter} property="radius" label="Radius" />
                        <EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" />
                        <EditorInspectorNumberField object={emitter} property="directionRandomizer" label="Direction Randomizer" />

                    </>
                }
            </EditorInspectorSectionField>
        );
    }
}
