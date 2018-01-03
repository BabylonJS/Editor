import {
    Scene,
    VertexBuffer,
    MaterialDefines, PushMaterial, MaterialHelper, EffectFallbacks, EffectCreationOptions,
    serialize, serializeAsColor3, serializeAsTexture, expandToProperty, serializeAsColor4,
    Nullable, Tools,
    BaseTexture, Texture,
    Color3, Matrix,
    AbstractMesh, SubMesh, Mesh, IAnimatable,
    StandardMaterial, Effect,
    SerializationHelper
} from 'babylonjs';

import Extension from '../extension';

/**
 * Custom Material class
 */
export class CustomMaterialDefines extends MaterialDefines {
    public DIFFUSE = false;
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
    constructor: () => void;
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
}

/**
 * Custom material class
 */
export default class CustomEditorMaterial extends PushMaterial {
    // Public members
    @serializeAsTexture('diffuseTexture')
    private _diffuseTexture: BaseTexture;
    @expandToProperty('_markAllSubMeshesAsTexturesDirty')
    public diffuseTexture: BaseTexture;

    @serializeAsColor3('diffuse')
    public diffuseColor = new Color3(1, 1, 1);
    
    @serialize('disableLighting')
    private _disableLighting = false;
    @expandToProperty('_markAllSubMeshesAsLightsDirty')
    public disableLighting: boolean;

    @serialize('maxSimultaneousLights')
    private _maxSimultaneousLights = 4;
    @expandToProperty('_markAllSubMeshesAsLightsDirty')
    public maxSimultaneousLights: number;

    public _customCode: CustomMaterialCode;

    @serialize()
    public _shaderName: string;

    @serialize()
    public config: CustomMaterialConfig = null;

    // Private members
    private _renderId: number;

    /**
     * Constructor
     * @param name: the name of the material 
     * @param scene: the scene reference
     */
    constructor(name: string, scene: Scene, shaderName: string, customCode: CustomMaterialCode, config: CustomMaterialConfig) {
        super(name, scene);

        this._shaderName = shaderName;
        
        this._customCode = customCode;
        this._customCode && this._customCode.constructor.call(this);

        this.config = config;
    }

    public setCustomCode (customCode: CustomMaterialCode): void {
        this._customCode = customCode;
        this._customCode && this._customCode.constructor.call(this);
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
        if (this._customCode === undefined)
            return false;
        
        if (this.isFrozen) {
            if (this._wasPreviouslyReady && subMesh.effect) {
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
            if (scene.texturesEnabled) {
                if (this._diffuseTexture && StandardMaterial.DiffuseTextureEnabled) {
                    if (!this._diffuseTexture.isReady()) {
                        return false;
                    } else {
                        defines._needUVs = true;
                        defines.DIFFUSE = true;
                    }
                }
            }
        }

        // Misc.
        MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, defines);

        // Lights
        defines._needNormals = MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);

        // Values that need to be evaluated on every frame
        MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);

        // Attribs
        MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);

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
            const uniforms = ['world', 'view', 'viewProjection', 'vEyePosition', 'vLightsType', 'vDiffuseColor',
                'vFogInfos', 'vFogColor', 'pointSize',
                'vDiffuseInfos',
                'mBones',
                'vClipPlane', 'diffuseMatrix'
            ];
            const samplers = ['diffuseSampler'];
            const uniformBuffers = new Array<string>();

            this._customCode && this._customCode.setUniforms(uniforms, samplers);
            
            if (this._customCode && !this._customCode.isReadyForSubMesh.call(this, mesh, subMesh, defines))
                return false;

            MaterialHelper.PrepareUniformsAndSamplersList(<EffectCreationOptions>{
                uniformsNames: uniforms,
                uniformBuffersNames: uniformBuffers,
                samplers: samplers,
                defines: defines,
                maxSimultaneousLights: this.maxSimultaneousLights
            });
            subMesh.setEffect(scene.getEngine().createEffect(shaderName,
                <EffectCreationOptions>{
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
        this._wasPreviouslyReady = true;

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
            if (this._diffuseTexture && StandardMaterial.DiffuseTextureEnabled) {
                this._activeEffect.setTexture('diffuseSampler', this._diffuseTexture);

                this._activeEffect.setFloat2('vDiffuseInfos', this._diffuseTexture.coordinatesIndex, this._diffuseTexture.level);
                this._activeEffect.setMatrix('diffuseMatrix', this._diffuseTexture.getTextureMatrix());
            }

            // Clip plane
            MaterialHelper.BindClipPlane(this._activeEffect, scene);

            // Point size
            if (this.pointsCloud) {
                this._activeEffect.setFloat('pointSize', this.pointSize);
            }

            MaterialHelper.BindEyePosition(effect, scene);
        }

        this._activeEffect.setColor4('vDiffuseColor', this.diffuseColor, this.alpha * mesh.visibility);

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
        this._customCode && this._customCode.bindForSubMesh.call(this, world, mesh, subMesh, this._activeEffect);

        this._afterBind(mesh, this._activeEffect);
    }

    public getAnimatables(): IAnimatable[] {
        const results = [];

        if (this._diffuseTexture && this._diffuseTexture.animations && this._diffuseTexture.animations.length > 0) {
            results.push(this._diffuseTexture);
        }

        return results;
    }

    public getActiveTextures(): BaseTexture[] {
        const activeTextures = super.getActiveTextures();

        if (this._diffuseTexture) {
            activeTextures.push(this._diffuseTexture);
        }

        return activeTextures;
    }

    public hasTexture(texture: BaseTexture): boolean {
        if (super.hasTexture(texture)) {
            return true;
        }

        if (this.diffuseTexture === texture) {
            return true;
        }

        return false;
    }

    public dispose(forceDisposeEffect?: boolean): void {
        if (this._diffuseTexture) {
            this._diffuseTexture.dispose();
        }

        this._customCode && this._customCode.dispose.call(this);

        super.dispose(forceDisposeEffect);
    }

    public clone(name: string): CustomEditorMaterial {
        return SerializationHelper.Clone<CustomEditorMaterial>(() => new CustomEditorMaterial(name, this.getScene(), this._shaderName, this._customCode, this.config), this);
    }

    public serialize(): any {
        let serializationObject = SerializationHelper.Serialize(this);
        serializationObject.customType = 'BABYLON.CustomEditorMaterial';
        serializationObject.textures = { };

        // Textures
        if (this.config) {
            this.config.textures.forEach(t => {
                if (this[t.name])
                    serializationObject.textures[t.name] = (<BaseTexture>this[t.name]).serialize();
            });
        }

        return serializationObject;
    }

    public getClassName(): string {
        return 'CustomMaterial';
    }

    // Statics
    public static Parse(source: any, scene: Scene, rootUrl: string): CustomEditorMaterial {
        const material = SerializationHelper.Parse(() => new CustomEditorMaterial(source.name, scene, source._shaderName, source._customCode, source.config), source, scene, rootUrl);

        for (const thing in source.textures) {
            material[thing] = Texture.Parse(source.textures[thing], scene, rootUrl);
        }

        return material;
    }
}

BABYLON['CustomEditorMaterial'] = CustomEditorMaterial;