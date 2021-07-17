import { join } from "path";

import { Nullable } from "../../../../../shared/types";

import * as React from "react";

import {
    ParticleSystem, IParticleEmitterType, ConeParticleEmitter, BoxParticleEmitter,
    PointParticleEmitter, SphereParticleEmitter, HemisphericParticleEmitter,
    CylinderParticleEmitter, MeshParticleEmitter,
} from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../inspector";

import { InspectorList } from "../../../gui/inspector/fields/list";
import { InspectorColor } from "../../../gui/inspector/fields/color";
import { InspectorString } from "../../../gui/inspector/fields/string";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorBoolean } from "../../../gui/inspector/fields/boolean";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";
import { InspectorColorPicker } from "../../../gui/inspector/fields/color-picker";

import { Tools } from "../../../tools/tools";

import { AbstractInspector } from "../abstract-inspector";
import Editor from "../../..";

export interface IParticleSystemInspectorState {
    /**
     * Defines the reference to the current emitter of the particle system.
     */
    emitter: IParticleEmitterType;
    /**
     * Defines the name of the emitter type constructor.
     */
    emitterTypeName: string;
}

export class ParticleSystemInspector extends AbstractInspector<ParticleSystem, IParticleSystemInspectorState> {
    /**
     * Updates all the instantiated particle systems.
     * @param editor defines the reference to the editor.
     * @param particleSystem defines the reference to the selected object in the inspector.
     */
    public static UpdateParticleSystems(editor: Editor, particleSystem: ParticleSystem): void {
        const pss = editor.scene!.particleSystems
            .filter((ps) => ps !== particleSystem && ps["metadata"]?.editorPath)
            .filter((ps) => ps["metadata"].editorPath === particleSystem["metadata"]?.editorPath);

        const serializationData = particleSystem.serialize(true);
        const rootUrl = join(editor.assetsBrowser.assetsDirectory, "/");

        pss.forEach((ps: ParticleSystem) => {
            const savedId = ps.id;
            const savedName = ps.name;
            const savedEmitter = ps.emitter;

            ps.dispose(false);
            ps = ParticleSystem.Parse(serializationData, editor.scene!, rootUrl, !ps.isStarted());
            
            ps.particleTexture?.dispose();
            ps.particleTexture = particleSystem.particleTexture;

            ps.noiseTexture?.dispose();
            ps.noiseTexture = particleSystem.noiseTexture;

            ps["metadata"] = particleSystem["metadata"];

            ps.id = savedId;
            ps.name = savedName;
            ps.emitter = savedEmitter;
        });

        editor.graph.refresh();
    }

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
                <InspectorSection title="Controls">
                    <InspectorButton label="Start" small={true} onClick={() => this.selectedObject.start()} />
                    <InspectorButton label="Stop" small={true} onClick={() => this.selectedObject.stop()} />
                </InspectorSection>

                <InspectorSection title="Common">
                    <InspectorString object={this.selectedObject} property="name" label="Name" />
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
                    <InspectorList object={this.selectedObject} property="particleTexture" label="Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                    {/* <InspectorList object={this.selectedObject} property="textureMask" label="Mask" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} /> */}
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

                <InspectorSection title="Emission">
                    <InspectorNumber object={this.selectedObject} property="emitRate" label="Emit Rate" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="minEmitPower" label="Min Emit Power" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="maxEmitPower" label="Max Emit Porwer" min={0} step={0.01} />
                </InspectorSection>

                <InspectorSection title="Size">
                    <InspectorNumber object={this.selectedObject} property="minSize" label="Min Size" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="maxSize" label="Max Size" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="minScaleX" label="Min Scale X" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="maxScaleX" label="Max Scale X" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="minScaleY" label="Min Scale Y" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="maxScaleY" label="Max Scale Y" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Life Time">
                    <InspectorNumber object={this.selectedObject} property="minLifeTime" label="Min Life Time" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="maxLifeTime" label="Max Life Time" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Colors">
                    <InspectorSection title="Color 1">
                        <InspectorColor object={this.selectedObject} property="color1" label="Color" step={0.01} />
                        <InspectorColorPicker object={this.selectedObject} property="color1" label="Hex Color" />
                    </InspectorSection>
                    <InspectorSection title="Color 2">
                        <InspectorColor object={this.selectedObject} property="color2" label="Color" step={0.01} />
                        <InspectorColorPicker object={this.selectedObject} property="color2" label="Hex Color" />
                    </InspectorSection>
                    <InspectorSection title="Color Dead">
                        <InspectorColor object={this.selectedObject} property="colorDead" label="Color" step={0.01} />
                        <InspectorColorPicker object={this.selectedObject} property="colorDead" label="Hex Color" />
                    </InspectorSection>
                </InspectorSection>

                <InspectorSection title="Rotation">
                    <InspectorNumber object={this.selectedObject} property="minAngularSpeed" label="Min Angular Speed" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="maxAngularSpeed" label="Max Angular Speed" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="minInitialRotation" label="Min Initial Rotation" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="maxInitialRotation" label="Max Initial Rotation" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Spritesheet">
                    <InspectorBoolean object={this.selectedObject} property="isAnimationSheetEnabled" label="nimation Sheet Enabled" />
                    <InspectorBoolean object={this.selectedObject} property="spriteRandomStartCell" label="Random Start Cell Index" />
                    <InspectorNumber object={this.selectedObject} property="startSpriteCellID" label="First Sprite Index" step={1} />
                    <InspectorNumber object={this.selectedObject} property="endSpriteCellID" label="Last Sprite Index" step={1} />
                    <InspectorNumber object={this.selectedObject} property="spriteCellWidth" label="Cell Width" step={1} />
                    <InspectorNumber object={this.selectedObject} property="spriteCellHeight" label="Cell Height" step={1} />
                    <InspectorNumber object={this.selectedObject} property="spriteCellChangeSpeed" label="Cell Change Speed" step={0.01} />
                </InspectorSection>
            </>
        );
    }

    /**
     * Called on a property of the selected object has changed.
     */
    public onPropertyChanged(): void {
        super.onPropertyChanged();
        ParticleSystemInspector.UpdateParticleSystems(this.editor, this.selectedObject);
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
