import { Nullable } from "../../../../shared/types";

import { ParticleSystem, PointParticleEmitter, BoxParticleEmitter, SphereParticleEmitter, HemisphericParticleEmitter, CylinderParticleEmitter, ConeParticleEmitter, MeshParticleEmitter } from "babylonjs";
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

        this.addVector(common, "Gravity", this.selectedObject, "gravity");
        this.addVector(common, "World Offset", this.selectedObject, "worldOffset");

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

        this.addTexture(textures, this.selectedObject, "particleTexture").name("Texture");
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
            this.addVector(this._emitterFolder, "Direction 1", particleEmitterType, "direction1");
            this.addVector(this._emitterFolder, "Direction 2", particleEmitterType, "direction2");
        }
        // Box
        else if (particleEmitterType instanceof BoxParticleEmitter) {
            this.addVector(this._emitterFolder, "Direction 1", particleEmitterType, "direction1");
            this.addVector(this._emitterFolder, "Direction 2", particleEmitterType, "direction2");
            this.addVector(this._emitterFolder, "Min Emit Box", particleEmitterType, "minEmitBox");
            this.addVector(this._emitterFolder, "Max Emit Box", particleEmitterType, "maxEmitBox");
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
            this.addVector(this._emitterFolder, "Direction 1", particleEmitterType, "direction1");
            this.addVector(this._emitterFolder, "Direction 2", particleEmitterType, "direction2");
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
        const size = this.tool!.addFolder("Size");
        size.open();

        size.add(this.selectedObject, "minSize").name("Min Size");
        size.add(this.selectedObject, "maxSize").name("Max Size");

        size.add(this.selectedObject, "minScaleX").name("Min Scale X");
        size.add(this.selectedObject, "maxScaleX").name("Max Scale X");
        
        size.add(this.selectedObject, "minScaleY").name("Min Scale Y");
        size.add(this.selectedObject, "maxScaleY").name("Max Scale Y");
    }

    /**
     * Adds all the lifetime editable properties.
     */
    protected addLifeTime(): void {
        const lifeTime = this.tool!.addFolder("Lifetime");
        lifeTime.open();

        lifeTime.add(this.selectedObject, "minLifeTime").min(0).name("Min Life Time");
        lifeTime.add(this.selectedObject, "maxLifeTime").min(0).name("Max Life Time");
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
        const rotation = this.tool!.addFolder("Rotation");
        rotation.open();

        rotation.add(this.selectedObject, "minAngularSpeed").name("Min Angular Speed");
        rotation.add(this.selectedObject, "maxAngularSpeed").name("Max Angular Speed");
        rotation.add(this.selectedObject, "minInitialRotation").name("Min Initial Rotation");
        rotation.add(this.selectedObject, "maxInitialRotation").name("Max Initial Rotation");
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
