import {
    Scene,
    VertexBuffer,
    MaterialDefines, PushMaterial, MaterialHelper, EffectFallbacks,
    serialize, serializeAsColor3, expandToProperty,
    Nullable, IEffectCreationOptions,
    BaseTexture, Texture,
    Color3, Matrix, Vector2, Vector3,
    AbstractMesh, SubMesh, Mesh, IAnimatable,
    Effect,
    SerializationHelper
} from 'babylonjs';

/**
 * Custom Material class
 */
export class CustomMaterialDefines extends MaterialDefines {
    public TEXTURE = false;
    public CLIPPLANE = false;
    public ALPHATEST = false;
    public DEPTHPREPASS = false;
    public POINTSIZE = false;
    public FOG = false;
    public NORMAL = false;
    public UV1 = false;
    public UV2 = false;
    public VERTEXCOLOR = false;
    public VERTEXALPHA = false;
    public NUM_BONE_INFLUENCERS = 0;
    public BonesPerMesh = 0;
    public INSTANCES = false;

    constructor() {
        super();
        this.rebuild();
    }
}

/**
 * The custom material code interface which
 * comes from the user
 */
export interface CustomMaterialCode {
    init: () => void;
    setUniforms: (uniforms: string[], samplers: string[]) => void;
    isReadyForSubMesh: (mesh: AbstractMesh, subMesh: SubMesh, defines: CustomMaterialDefines) => boolean;
    bindForSubMesh: (world: Matrix, mesh: Mesh, subMesh: SubMesh, effect: Effect) => void;
    dispose: () => void;
}

export interface CustomMaterialConfig {
    textures: {
        name: string;
        isCube: boolean;
    }[];
    floats: string[];
    vectors2: string[];
    vectors3: string[];
}

/**
 * Custom material class
 */
export default class CustomEditorMaterial extends PushMaterial {
    // Public members
    @serializeAsColor3('baseColor')
    public baseColor = new Color3(1, 1, 1);
    
    @serialize('disableLighting')
    private _disableLighting = false;
    @expandToProperty('_markAllSubMeshesAsLightsDirty')
    public disableLighting: boolean;

    @serialize('maxSimultaneousLights')
    private _maxSimultaneousLights = 4;
    @expandToProperty('_markAllSubMeshesAsLightsDirty')
    public maxSimultaneousLights: number;

    @serialize()
    public _shaderName: string;

    public userConfig: { [index: string]: number | Vector2 | Vector3 | BaseTexture } = { };

    public config: CustomMaterialConfig;
    public customCode: CustomMaterialCode;
    public _buildId: number = 0;

    // Private members
    private _lastBuildId: number = 0;
    private _renderId: number;

    /**
     * Constructor
     * @param name: the name of the material 
     * @param scene: the scene reference
     */
    constructor(name: string, scene: Scene, shaderName: string, customCode: CustomMaterialCode, config: CustomMaterialConfig) {
        super(name, scene);

        this._shaderName = shaderName;
        
        this.customCode = customCode;
        this.customCode && this.customCode.init();

        this.config = config;
    }

    public setCustomCode (customCode: CustomMaterialCode): void {
        this.customCode = customCode;
        this.customCode && this.customCode.init();
    }

    public needAlphaBlending(): boolean {
        return (this.alpha < 1.0);
    }

    public needAlphaTesting(): boolean {
        return false;
    }

    public getAlphaTestTexture(): Nullable<BaseTexture> {
        return null;
    }

    // Methods
    public isReadyForSubMesh(mesh: AbstractMesh, subMesh: SubMesh, useInstances?: boolean): boolean {
        if (this.customCode === undefined)
            return false;
        
        if (this.isFrozen) {
            if (subMesh.effect) {
                return true;
            }
        }

        if (!subMesh._materialDefines) {
            subMesh._materialDefines = new CustomMaterialDefines();
        }

        const defines = <CustomMaterialDefines>subMesh._materialDefines;
        const scene = this.getScene();

        if (!this.checkReadyOnEveryCall && subMesh.effect) {
            if (this._renderId === scene.getRenderId()) {
                return true;
            }
        }

        const engine = scene.getEngine();

        // Textures
        if (defines._areTexturesDirty) {
            defines._needUVs = false;
            if (scene.texturesEnabled && this.config) {
                let atLeastOneTexture = false;

                for (const t of this.config.textures) {
                    if (!this.userConfig[t.name])
                        continue;

                    const texture = <BaseTexture> this.userConfig[t.name];
                    if (!texture.isReady())
                        return false;

                    atLeastOneTexture = true;
                };

                if (atLeastOneTexture) {
                    defines._needUVs = true;
                    defines.TEXTURE = true;
                }
            }
        }

        // Misc.
        MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, false, defines);

        // Lights
        defines._needNormals = MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);

        // Values that need to be evaluated on every frame
        MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);

        // Attribs
        MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);

        // Build id
        if (!this.customCode) {
            for (let i = 0; i < this._buildId; i++)
                delete defines['BUILD_' + i];

            defines['BUILD_' + this._buildId] = true;
            defines.rebuild();

            if (this._lastBuildId !== this._buildId && subMesh.effect) {
                this._lastBuildId = this._buildId;
                scene.getEngine()._releaseEffect(subMesh.effect);
            }
        }

        // Get correct effect      
        if (defines.isDirty) {
            defines.markAsProcessed();
            scene.resetCachedMaterial();

            // Fallbacks
            const fallbacks = new EffectFallbacks();
            if (defines.FOG) {
                fallbacks.addFallback(1, 'FOG');
            }

            MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);

            if (defines.NUM_BONE_INFLUENCERS > 0) {
                fallbacks.addCPUSkinningFallback(0, mesh);
            }

            //Attributes
            const attribs = [VertexBuffer.PositionKind];

            if (defines.NORMAL) {
                attribs.push(VertexBuffer.NormalKind);
            }

            if (defines.UV1) {
                attribs.push(VertexBuffer.UVKind);
            }

            if (defines.UV2) {
                attribs.push(VertexBuffer.UV2Kind);
            }

            if (defines.VERTEXCOLOR) {
                attribs.push(VertexBuffer.ColorKind);
            }

            MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
            MaterialHelper.PrepareAttributesForInstances(attribs, defines);

            const shaderName = this._shaderName;
            const join = defines.toString();
            const uniformBuffers = new Array<string>();

            // Uniforms and samplers
            const samplers = this.config ? this.config.textures.map(t => t.name) : [];
            let uniforms = ['world', 'view', 'viewProjection', 'vEyePosition', 'vLightsType', 'vBaseColor',
                'vFogInfos', 'vFogColor', 'pointSize',
                'mBones',
                'vClipPlane'];

            if (this.config) {
                uniforms = uniforms.concat(this.config.floats)
                                   .concat(this.config.vectors2)
                                   .concat(this.config.vectors3);

                this.config.textures.forEach(t => {
                    uniforms.push(t.name + 'Infos');
                    uniforms.push(t.name + 'Matrix');
                });
            }

            this.customCode && this.customCode.setUniforms(uniforms, samplers);
            
            if (this.customCode && !this.customCode.isReadyForSubMesh(mesh, subMesh, defines))
                return false;

            MaterialHelper.PrepareUniformsAndSamplersList(<IEffectCreationOptions> {
                uniformsNames: uniforms,
                uniformBuffersNames: uniformBuffers,
                samplers: samplers,
                defines: defines,
                maxSimultaneousLights: this.maxSimultaneousLights
            });
            subMesh.setEffect(scene.getEngine().createEffect(shaderName,
                <IEffectCreationOptions>{
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: this._maxSimultaneousLights - 1 }
                }, engine), defines);

        }
        if (!subMesh.effect || !subMesh.effect.isReady()) {
            return false;
        }

        this._renderId = scene.getRenderId();

        return true;
    }

    public bindForSubMesh(world: Matrix, mesh: Mesh, subMesh: SubMesh): void {
        const scene = this.getScene();

        const defines = <CustomMaterialDefines>subMesh._materialDefines;
        if (!defines) {
            return;
        }

        const effect = subMesh.effect;
        if (!effect) {
            return;
        }
        this._activeEffect = effect;

        // Matrices        
        this.bindOnlyWorldMatrix(world);
        this._activeEffect.setMatrix('viewProjection', scene.getTransformMatrix());

        // Bones
        MaterialHelper.BindBonesParameters(mesh, this._activeEffect);

        if (this._mustRebind(scene, effect)) {
            // Textures
            if (this.config) {
                this.config.textures.forEach(t => {
                    const texture = <BaseTexture> this.userConfig[t.name];
                    if (!texture)
                        return;
                    
                    this._activeEffect.setTexture(t.name, texture);

                    this._activeEffect.setFloat2(t.name + 'Infos', texture.coordinatesIndex, texture.level);
                    this._activeEffect.setMatrix(t.name + 'Matrix', texture.getTextureMatrix());
                });
            }

            // Clip plane
            MaterialHelper.BindClipPlane(this._activeEffect, scene);

            // Point size
            if (this.pointsCloud) {
                this._activeEffect.setFloat('pointSize', this.pointSize);
            }

            MaterialHelper.BindEyePosition(effect, scene);
        }

        this._activeEffect.setColor4('vBaseColor', this.baseColor, this.alpha * mesh.visibility);

        // Lights
        if (scene.lightsEnabled && !this.disableLighting) {
            MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
        }

        // View
        if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== Scene.FOGMODE_NONE) {
            this._activeEffect.setMatrix('view', scene.getViewMatrix());
        }

        // Fog
        MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);

        // Custom
        this.customCode && this.customCode.bindForSubMesh(world, mesh, subMesh, this._activeEffect);

        // User config
        if (this.config) {
            this.config.floats.forEach(f =>   this.userConfig[f] !== undefined && this._activeEffect.setFloat(f, <number> this.userConfig[f] || 0));
            this.config.vectors2.forEach(v => this.userConfig[v] !== undefined && this._activeEffect.setVector2(v, <Vector2> this.userConfig[v]));
            this.config.vectors3.forEach(v => this.userConfig[v] !== undefined && this._activeEffect.setVector3(v, <Vector3> this.userConfig[v]));
        }
        
        this._afterBind(mesh, this._activeEffect);
    }

    public getAnimatables(): IAnimatable[] {
        const results = [];

        this.config.textures.forEach(t => {
            const texture = <BaseTexture> this.userConfig[t.name];
            if (texture && texture.animations && texture.animations.length > 0)
                results.push(texture);
        });

        return results;
    }

    public getActiveTextures(): BaseTexture[] {
        const activeTextures = super.getActiveTextures();

        this.config.textures.forEach(t => {
            const texture = <BaseTexture> this.userConfig[t.name];
            if (texture)
                activeTextures.push(texture);
        });

        return activeTextures;
    }

    public hasTexture(texture: BaseTexture): boolean {
        if (super.hasTexture(texture)) {
            return true;
        }

        if (this.config) {
            for (const t of this.config.textures) {
                if (this.userConfig[t.name] === texture)
                    return true;
            }
        }

        return false;
    }

    public dispose(forceDisposeEffect?: boolean): void {
        this.customCode && this.customCode.dispose();

        super.dispose(forceDisposeEffect);
    }

    public clone(name: string): CustomEditorMaterial {
        return SerializationHelper.Clone<CustomEditorMaterial>(() => new CustomEditorMaterial(name, this.getScene(), this._shaderName, this.customCode, this.config), this);
    }

    public serialize(): any {
        let serializationObject = SerializationHelper.Serialize(this);
        serializationObject.customType = 'BABYLON.CustomEditorMaterial';
        serializationObject.textures = { };
        serializationObject.floats = { };
        serializationObject.vectors2 = { };
        serializationObject.vectors3 = { };

        // Textures
        if (this.config) {
            this.config.textures.forEach(t => this.userConfig[t.name] !== undefined && (serializationObject.textures[t.name] = (this.userConfig[t.name] as BaseTexture).serialize()));
            this.config.floats.forEach(f   => this.userConfig[f] !== undefined && (serializationObject.floats[f] = this.userConfig[f]));
            this.config.vectors2.forEach(v => this.userConfig[v] !== undefined && (serializationObject.vectors2[v] = (this.userConfig[v] as Vector2).asArray()));
            this.config.vectors3.forEach(v => this.userConfig[v] !== undefined && (serializationObject.vectors3[v] = (this.userConfig[v] as Vector3).asArray()));
        }

        return serializationObject;
    }

    public getClassName(): string {
        return 'CustomMaterial';
    }

    // Statics
    public static Parse(source: any, scene: Scene, rootUrl: string): CustomEditorMaterial {
        const material = SerializationHelper.Parse(() => new CustomEditorMaterial(source.name, scene, source._shaderName, source._customCode, source.config), source, scene, rootUrl);

        for (const thing in source.textures)
            material.userConfig[thing] = Texture.Parse(source.textures[thing], scene, rootUrl);

        for (const thing in source.floats)
            material.userConfig[thing] = source.floats[thing];

        for (const thing in source.vectors2)
            material.userConfig[thing] = Vector2.FromArray(source.vectors2[thing]);

        for (const thing in source.vectors3)
            material.userConfig[thing] = Vector3.FromArray(source.vectors3[thing]);

        return material;
    }
}
