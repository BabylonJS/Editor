import { Nullable } from "../../../../shared/types";

import {
    ParticleSystem, PointParticleEmitter, BoxParticleEmitter, SphereParticleEmitter, HemisphericParticleEmitter,
    CylinderParticleEmitter, ConeParticleEmitter, MeshParticleEmitter,
} from "babylonjs";
import { GUI } from "dat.gui";

import { Tools } from "../../tools/tools";

import { Inspector } from "../../components/inspector";
import { AbstractInspector } from "../abstract-inspector";

export class ParticleSystemInspector extends AbstractInspector<ParticleSystem> {
    private static _EmitterTypes: string[] = [
        "PointParticleEmitter",
        "BoxParticleEmitter",
        "SphereParticleEmitter",
        "HemisphericParticleEmitter",
        "CylinderParticleEmitter",
        "ConeParticleEmitter",
        "MeshParticleEmitter",
    ];

    private static _BlendModes: string[] = [
        "BLENDMODE_ONEONE",
        "BLENDMODE_STANDARD",
        "BLENDMODE_ADD",
        "BLENDMODE_MULTIPLY",
        "BLENDMODE_MULTIPLYADD",
    ];

    private _emitterType: string = "";
    private _blendMode: string = "";

    private _sizeFolder: Nullable<GUI> = null;
    private _lifeTimeFolder: Nullable<GUI> = null;
    private _rotationFolder: Nullable<GUI> = null;
    private _emitterFolder: Nullable<GUI> = null;

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addCommon();
        this.addTextures();
        this.addEmitter();
        this.addEmission();
        this.addSize();
        this.addLifeTime();
        this.addColors();
        this.addRotation();
        this.addSpriteSheet();
    }

    /**
     * Adds the common editable properties.
     */
    protected addCommon(): GUI {
        const common = this.tool!.addFolder("Common");
        common.open();
        common.add(this.selectedObject, "name").name("Name");
        
        common.addButton("Start").onClick(() => this.selectedObject.start());
        common.addButton("Stop").onClick(() => this.selectedObject.stop());
        
        common.add(this.selectedObject, "isBillboardBased").name("Is Billboard Based");

        common.addVector("Gravity", this.selectedObject.gravity);
        common.addVector("World Offset", this.selectedObject.worldOffset);

        return common;
    }

    /**
     * Adds all the textures editable properties.
     */
    protected addTextures(): void {
        const textures = this.tool!.addFolder("Texture");
        textures.open();

        this._blendMode = ParticleSystemInspector._BlendModes.find((bm) => this.selectedObject.blendMode === ParticleSystem[bm])!;
        textures.addSuggest(this, "_blendMode", ParticleSystemInspector._BlendModes).name("Blend Mode").onChange(() => {
            this.selectedObject.blendMode = ParticleSystem[this._blendMode];
            ParticleSystem.BLENDMODE_STANDARD;
        })

        this.addTextureList(textures, this.selectedObject, "particleTexture").name("Texture");
        this.addColor(textures, "Texture Mask", this.selectedObject, "textureMask");
    }

    /**
     * Adds all emitter editable properties.
     */
    protected addEmitter(): void {
        this._emitterFolder = this._emitterFolder ?? this.tool!.addFolder("Emitter");
        this._emitterFolder.open();

        // Type
        this._emitterType = Tools.GetConstructorName(this.selectedObject.particleEmitterType);
        this._emitterFolder.addSuggest(this, "_emitterType", ParticleSystemInspector._EmitterTypes).name("Type").onChange(() => {
            switch (this._emitterType) {
                case "PointParticleEmitter": this.selectedObject.particleEmitterType = new PointParticleEmitter(); break;
                case "BoxParticleEmitter": this.selectedObject.particleEmitterType = new BoxParticleEmitter(); break;
                case "SphereParticleEmitter": this.selectedObject.particleEmitterType = new SphereParticleEmitter(); break;
                case "HemisphericParticleEmitter": this.selectedObject.particleEmitterType = new HemisphericParticleEmitter(); break;
                case "CylinderParticleEmitter": this.selectedObject.particleEmitterType = new CylinderParticleEmitter(); break;
                case "ConeParticleEmitter": this.selectedObject.particleEmitterType = new ConeParticleEmitter(); break;
                case "MeshParticleEmitter": this.selectedObject.particleEmitterType = new MeshParticleEmitter(); break;
            }

            this.clearFolder(this._emitterFolder!);
            this.addEmitter();
        });

        const particleEmitterType = this.selectedObject.particleEmitterType;

        // Point
        if (particleEmitterType instanceof PointParticleEmitter) {
            this._emitterFolder.addVector("Direction 1", particleEmitterType.direction1);
            this._emitterFolder.addVector("Direction 2", particleEmitterType.direction2);
        }
        // Box
        else if (particleEmitterType instanceof BoxParticleEmitter) {
            this._emitterFolder.addVector("Direction 1", particleEmitterType.direction1);
            this._emitterFolder.addVector("Direction 2", particleEmitterType.direction2);
            this._emitterFolder.addVector("Min Emit Box", particleEmitterType.minEmitBox);
            this._emitterFolder.addVector("Max Emit Box", particleEmitterType.maxEmitBox);
        }
        // Sphere
        else if (particleEmitterType instanceof SphereParticleEmitter) {
            this._emitterFolder.add(particleEmitterType, "radius").name("Radius");
            this._emitterFolder.add(particleEmitterType, "radiusRange").name("Radius Range");
            this._emitterFolder.add(particleEmitterType, "directionRandomizer").name("Direction Randomizer");
        }
        // Hemispheric
        else if (particleEmitterType instanceof HemisphericParticleEmitter) {
            this._emitterFolder.add(particleEmitterType, "radius").name("Radius");
            this._emitterFolder.add(particleEmitterType, "radiusRange").name("Radius Range");
            this._emitterFolder.add(particleEmitterType, "directionRandomizer").name("Direction Randomizer");
        }
        // Cylinder
        else if (particleEmitterType instanceof CylinderParticleEmitter) {
            this._emitterFolder.add(particleEmitterType, "radius").name("Radius");
            this._emitterFolder.add(particleEmitterType, "height").name("Height");
            this._emitterFolder.add(particleEmitterType, "radiusRange").name("Radius Range");
            this._emitterFolder.add(particleEmitterType, "directionRandomizer").name("Direction Randomizer");
        }
        // Cone
        else if (particleEmitterType instanceof ConeParticleEmitter) {
            this._emitterFolder.add(particleEmitterType, "directionRandomizer").name("Direction Randomizer");
            this._emitterFolder.add(particleEmitterType, "radiusRange").name("Radius Range");
            this._emitterFolder.add(particleEmitterType, "heightRange").name("Height Range");
            this._emitterFolder.add(particleEmitterType, "emitFromSpawnPointOnly").name("Emit From Spawn Point Only");
            this._emitterFolder.add(particleEmitterType, "radius").name("Radius");
            this._emitterFolder.add(particleEmitterType, "angle").name("Angle");
        }
        // Mesh
        else if (particleEmitterType instanceof MeshParticleEmitter) {
            this._emitterFolder.addVector("Direction 1", particleEmitterType.direction1);
            this._emitterFolder.addVector("Direction 2", particleEmitterType.direction2);
            this._emitterFolder.add(particleEmitterType, "useMeshNormalsForDirection").name("Use Mesh Normals For Direction");
        }
    }

    /**
     * Adds all the emission editable properties.
     */
    protected addEmission(): void {
        const emission = this.tool!.addFolder("Emission");
        emission.open();

        emission.add(this.selectedObject, "emitRate").min(0).name("Rate");
        emission.add(this.selectedObject, "minEmitPower").min(0).name("Min Emit Power");
        emission.add(this.selectedObject, "maxEmitPower").min(0).name("Max Emit Power");
    }

    /**
     * Adds all the size editable properties.
     */
    protected addSize(): void {
        this._sizeFolder = this._sizeFolder ?? this.tool!.addFolder("Size");
        this._sizeFolder.open();

        // Common
        this._sizeFolder.add(this.selectedObject, "minSize").name("Min Size");
        this._sizeFolder.add(this.selectedObject, "maxSize").name("Max Size");

        this._sizeFolder.add(this.selectedObject, "minScaleX").name("Min Scale X");
        this._sizeFolder.add(this.selectedObject, "maxScaleX").name("Max Scale X");
        
        this._sizeFolder.add(this.selectedObject, "minScaleY").name("Min Scale Y");
        this._sizeFolder.add(this.selectedObject, "maxScaleY").name("Max Scale Y");

        // Gradients
        const sizeGradients = this.selectedObject.getSizeGradients();
        sizeGradients?.forEach((sg, index) => {
            this._sizeFolder!.addGradient(`Gradient n°${index}`, sg).onRemove(() => {
                const sizeGradients = this.selectedObject.getSizeGradients();
                if (sizeGradients) {
                    const index = sizeGradients.indexOf(sg);
                    if (index !== -1) { sizeGradients.splice(index, 1); }
                }

                this.clearFolder(this._sizeFolder!);
                this.addSize();
            });
        });

        // Add gradient
        this._sizeFolder.addButton("Add Gradient").onClick(() => {
            this.selectedObject.addSizeGradient(0, 1, 1);

            this.clearFolder(this._sizeFolder!);
            this.addSize();
        });
    }

    /**
     * Adds all the lifetime editable properties.
     */
    protected addLifeTime(): void {
        this._lifeTimeFolder = this._lifeTimeFolder ?? this.tool!.addFolder("Lifetime");
        this._lifeTimeFolder.open();

        this._lifeTimeFolder.add(this.selectedObject, "minLifeTime").min(0).name("Min Life Time");
        this._lifeTimeFolder.add(this.selectedObject, "maxLifeTime").min(0).name("Max Life Time");
    }

    /**
     * Adds all the colors editable properties.
     */
    protected addColors(): void {
        const colors = this.tool!.addFolder("Colors");
        colors.open();

        this.addColor(colors, "Color 1", this.selectedObject, "color1");
        this.addColor(colors, "Color 2", this.selectedObject, "color2");
        this.addColor(colors, "Color Dead", this.selectedObject, "colorDead");
    }

    /**
     * Adds all the rotation editable properties.
     */
    protected addRotation(): void {
        this._rotationFolder = this._rotationFolder ?? this.tool!.addFolder("Rotation");
        this._rotationFolder.open();

        this._rotationFolder.add(this.selectedObject, "minAngularSpeed").name("Min Angular Speed");
        this._rotationFolder.add(this.selectedObject, "maxAngularSpeed").name("Max Angular Speed");
        this._rotationFolder.add(this.selectedObject, "minInitialRotation").name("Min Initial Rotation");
        this._rotationFolder.add(this.selectedObject, "maxInitialRotation").name("Max Initial Rotation");

        // Gradients
        const angularSpeedGradients = this.selectedObject.getAngularSpeedGradients();
        angularSpeedGradients?.forEach((sg, index) => {
            this._rotationFolder!.addGradient(`Gradient n°${index}`, sg).onRemove(() => {
                const angularSpeedGradients = this.selectedObject.getAngularSpeedGradients();
                if (angularSpeedGradients) {
                    const index = angularSpeedGradients.indexOf(sg);
                    if (index !== -1) { angularSpeedGradients.splice(index, 1); }
                }

                this.clearFolder(this._rotationFolder!);
                this.addRotation();
            });
        });

        // Add gradient
        this._rotationFolder.addButton("Add Gradient").onClick(() => {
            this.selectedObject.addAngularSpeedGradient(0, 1, 1);

            this.clearFolder(this._rotationFolder!);
            this.addRotation();
        });
    }

    /**
     * Adds all the spritesheet editable properties.
     */
    protected addSpriteSheet(): void {
        const spriteSheet = this.tool!.addFolder("SpriteSheet");
        spriteSheet.open();

        spriteSheet.add(this.selectedObject, "isAnimationSheetEnabled").name("Animation Sheet Enabled");
        spriteSheet.add(this.selectedObject, "startSpriteCellID").name("First Sprite Index");
        spriteSheet.add(this.selectedObject, "endSpriteCellID").name("Last Sprite Index");
        spriteSheet.add(this.selectedObject, "spriteRandomStartCell").name("Random Start Cell Index");
        spriteSheet.add(this.selectedObject, "spriteCellWidth").name("Cell Width");
        spriteSheet.add(this.selectedObject, "spriteCellHeight").name("Cell Height");
        spriteSheet.add(this.selectedObject, "spriteCellChangeSpeed").name("Cell Change Speed");
    }
}

Inspector.registerObjectInspector({
    ctor: ParticleSystemInspector,
    ctorNames: ["ParticleSystem"],
    title: "Particle System",
});
