import { Nullable } from "../../../../shared/types";

import * as React from "react";

import {
    ParticleSystem, IParticleEmitterType, ConeParticleEmitter, BoxParticleEmitter,
    PointParticleEmitter, SphereParticleEmitter, HemisphericParticleEmitter,
    CylinderParticleEmitter, MeshParticleEmitter,
} from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";

import { InspectorList } from "../../gui/inspector/list";
import { InspectorString } from "../../gui/inspector/string";
import { InspectorButton } from "../../gui/inspector/button";
import { InspectorNumber } from "../../gui/inspector/number";
import { InspectorSection } from "../../gui/inspector/section";
import { InspectorBoolean } from "../../gui/inspector/boolean";
import { InspectorVector3 } from "../../gui/inspector/vector3";

import { Tools } from "../../tools/tools";

import { AbstractInspector } from "../abstract-inspector";

export interface IGroundInspectorState {
    /**
     * Defines the reference to the current emitter of the particle system.
     */
    emitter: IParticleEmitterType;
    /**
     * Defines the name of the emitter type constructor.
     */
    emitterTypeName: string;
}

export class ParticleSystemInspector extends AbstractInspector<ParticleSystem, IGroundInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            emitter: this.selectedObject.particleEmitterType,
            emitterTypeName: Tools.GetConstructorName(this.selectedObject.particleEmitterType),
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <InspectorSection title="Common">
                    <InspectorString object={this.selectedObject} property="name" label="Name" />
                    <InspectorButton label="Start" small={true} onClick={() => this.selectedObject.start()} />
                    <InspectorButton label="Stop" small={true} onClick={() => this.selectedObject.stop()} />
                    <InspectorVector3 object={this.selectedObject} property="gravity" label="Gravity" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="worldOffset" label="World Offset" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Billboard">
                    <InspectorBoolean object={this.selectedObject} property="isBillboardBased" label="Is Billboard Based" />
                    <InspectorList object={this.selectedObject} property="billboardMode" label="Mode" items={[
                        { label: "Y", data: ParticleSystem.BILLBOARDMODE_Y },
                        { label: "All", data: ParticleSystem.BILLBOARDMODE_ALL },
                        { label: "Stretched", data: ParticleSystem.BILLBOARDMODE_STRETCHED },
                    ]} />
                </InspectorSection>

                <InspectorSection title="Textures">
                    <InspectorList object={this.selectedObject} property="particleTexture" label="Texture" items={this.getTexturesList()} />
                    <InspectorList object={this.selectedObject} property="textureMask" label="Mask" items={this.getTexturesList()} />
                    <InspectorList object={this.selectedObject} property="blendMode" label="Blend Mode" items={[
                        { label: "One One", data: ParticleSystem.BLENDMODE_ONEONE },
                        { label: "Standard", data: ParticleSystem.BLENDMODE_STANDARD },
                        { label: "Add", data: ParticleSystem.BLENDMODE_ADD },
                        { label: "Multiply", data: ParticleSystem.BLENDMODE_MULTIPLY },
                        { label: "Multiple Add", data: ParticleSystem.BLENDMODE_MULTIPLYADD },
                    ]} />
                </InspectorSection>

                <InspectorSection title="Emitter Type">
                    <InspectorList object={this.state} property="emitterTypeName" label="Type" items={[
                        { label: "Point", data: "PointParticleEmitter" },
                        { label: "Box", data: "BoxParticleEmitter" },
                        { label: "Sphere", data: "SphereParticleEmitter" },
                        { label: "Hemispheric", data: "HemisphericParticleEmitter" },
                        { label: "Cylinder", data: "CylinderParticleEmitter" },
                        { label: "Cone", data: "ConeParticleEmitter" },
                        // { label: "Mesh", data: "MeshParticleEmitter" },
                    ]} onChange={(v) => {
                        this._handleParticleEmitterTypeChanged(v);
                    }} />
                    {this.getParticleEmitterTypeInspector()}
                </InspectorSection>
            </>
        );
    }

    /**
     * Called on the user changes the current particle emitter type.
     */
    private _handleParticleEmitterTypeChanged(type: string): void {
        let emitter: Nullable<IParticleEmitterType> = null;

        switch (type) {
            case "PointParticleEmitter": emitter = new PointParticleEmitter(); break;
            case "BoxParticleEmitter": emitter = new BoxParticleEmitter(); break;
            case "SphereParticleEmitter": emitter = new SphereParticleEmitter(); break;
            case "HemisphericParticleEmitter": emitter = new HemisphericParticleEmitter(); break;
            case "CylinderParticleEmitter": emitter = new CylinderParticleEmitter(); break;
            case "ConeParticleEmitter": emitter = new ConeParticleEmitter(); break;
            case "MeshParticleEmitter": emitter = new MeshParticleEmitter(); break;
        }

        if (emitter) {
            this.selectedObject.particleEmitterType = emitter;
            this.setState({ emitter });
        }
    }

    /**
     * Returns the inspector used to configure and edit the current emitter type.
     */
    protected getParticleEmitterTypeInspector(): React.ReactNode {
        const emitter = this.selectedObject.particleEmitterType;

        if (emitter instanceof PointParticleEmitter) {
            return (
                <InspectorSection title="Point">
                    <InspectorVector3 object={emitter} property="direction1" label="Direction 1" step={0.01} />
                    <InspectorVector3 object={emitter} property="direction2" label="Direction 2" step={0.01} />
                </InspectorSection>
            );
        }

        if (emitter instanceof BoxParticleEmitter) {
            return (
                <InspectorSection title="Box">
                    <InspectorVector3 object={emitter} property="direction1" label="Direction 1" step={0.01} />
                    <InspectorVector3 object={emitter} property="direction2" label="Direction 2" step={0.01} />
                    <InspectorVector3 object={emitter} property="minEmitBox" label="Min Emit Box" step={0.01} />
                    <InspectorVector3 object={emitter} property="maxEmitBox" label="Max Emit Box" step={0.01} />
                </InspectorSection>
            );
        }

        if (emitter instanceof SphereParticleEmitter) {
            return (
                <InspectorSection title="Sphere">
                    <InspectorNumber object={emitter} property="radius" label="Radius" step={0.01} />
                    <InspectorNumber object={emitter} property="radiusRange" label="Radius Range" step={0.01} />
                    <InspectorNumber object={emitter} property="directionRandomizer" label="Direction Randomizer" step={0.01} />
                </InspectorSection>
            );
        }

        if (emitter instanceof HemisphericParticleEmitter) {
            return (
                <InspectorSection title="Hemispheric">
                    <InspectorNumber object={emitter} property="radius" label="Radius" step={0.01} />
                    <InspectorNumber object={emitter} property="radiusRange" label="Radius Range" step={0.01} />
                    <InspectorNumber object={emitter} property="directionRandomizer" label="Direction Randomizer" step={0.01} />
                </InspectorSection>
            );
        }

        if (emitter instanceof CylinderParticleEmitter) {
            return (
                <InspectorSection title="Cylinder">
                    <InspectorNumber object={emitter} property="radius" label="Radius" step={0.01} />
                    <InspectorNumber object={emitter} property="height" label="Height" step={0.01} />
                    <InspectorNumber object={emitter} property="radiusRange" label="Radius Range" step={0.01} />
                    <InspectorNumber object={emitter} property="directionRandomizer" label="Direction Randomizer" step={0.01} />
                </InspectorSection>
            );
        }

        if (emitter instanceof ConeParticleEmitter) {
            return (
                <InspectorSection title="Cone">
                    <InspectorNumber object={emitter} property="directionRandomizer" label="Direction Randomizer" step={0.01} />
                    <InspectorNumber object={emitter} property="radiusRange" label="Radius Range" step={0.01} />
                    <InspectorNumber object={emitter} property="heightRange" label="Height Range" step={0.01} />
                    <InspectorNumber object={emitter} property="radius" label="Radius" step={0.01} />
                    <InspectorNumber object={emitter} property="angle" label="Angle" step={0.01} />
                    <InspectorBoolean object={emitter} property="emitFromSpawnPointOnly" label="Emit From Spawn Point Only" />
                </InspectorSection>
            );
        }

        return undefined;
    }
}

Inspector.RegisterObjectInspector({
    ctor: ParticleSystemInspector,
    ctorNames: ["ParticleSystem"],
    title: "Particle System",
});
