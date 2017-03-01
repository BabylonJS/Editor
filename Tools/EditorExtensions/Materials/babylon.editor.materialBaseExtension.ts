module BABYLON.EDITOR.EXTENSIONS {
    export interface IMaterialBuilderUniform {
        name: string;
        value: number | number[];

        _cachedValue?: number | Vector2 | Vector3 | Vector4;
    }

    export interface IMaterialBuilderSampler {
        textureName: string;
        uniformName: string;
        object?: BaseTexture;
        serializedObject?: any;
    }

    export interface IMaterialBuilderSettings {
        samplers: IMaterialBuilderSampler[];
        uniforms: IMaterialBuilderUniform[];
        
        time: boolean;
    }

    class MaterialBuilderDefines extends MaterialDefines {
        public TEXTURE = false;
        public CLIPPLANE = false;
        public ALPHATEST = false;
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

    export class MaterialBuilder extends Material {
        @serializeAsColor3("diffuseColor")
        public diffuseColor = new Color3(1, 1, 1);
        
        @serialize()
        public disableLighting = false;
        
        @serialize()
        public maxSimultaneousLights = 4;
        
        public settings: IMaterialBuilderSettings = null;
        public _data: IMaterialExtensionData = null;

        private _renderId: number;

        private _defines = new MaterialBuilderDefines();
        private _cachedDefines = new MaterialBuilderDefines();

        private _currentTime: number = 0;

        constructor(name: string, scene: Scene, settings?: IMaterialBuilderSettings) {
            super(name, scene);

            this.settings = settings || {
                samplers: [],
                uniforms: [],
                time: false
            };

            this._cachedDefines.BonesPerMesh = -1;
        }

        public needAlphaBlending(): boolean {
            return (this.alpha < 1.0);
        }

        public needAlphaTesting(): boolean {
            return false;
        }

        public getAlphaTestTexture(): BaseTexture {
            return null;
        }

        // Methods
        private _checkCache(scene: Scene, mesh?: AbstractMesh, useInstances?: boolean): boolean {
            if (!mesh) {
                return true;
            }

            if (this._defines.INSTANCES !== useInstances) {
                return false;
            }

            if (mesh._materialDefines && mesh._materialDefines.isEqual(this._defines)) {
                return true;
            }

            return false;
        }

        public isReady(mesh?: AbstractMesh, useInstances?: boolean): boolean {
            if (this.checkReadyOnlyOnce) {
                if (this._wasPreviouslyReady) {
                    return true;
                }
            }

            var scene = this.getScene();

            if (!this.checkReadyOnEveryCall) {
                if (this._renderId === scene.getRenderId()) {
                    if (this._checkCache(scene, mesh, useInstances)) {
                        return true;
                    }
                }
            }

            var engine = scene.getEngine();
            var needNormals = false;
            var needUVs = false;

            this._defines.reset();

            // Textures
            if (scene.texturesEnabled) {
                if (this.settings.samplers.length > 0) {
                    for (var i = 0; i < this.settings.samplers.length; i++) {
                        var sampler = this.settings.samplers[i];
                        if (sampler.object && !sampler.object.isReady()) {
                            return false;
                        }

                        this._defines["TEXTURE_" + sampler.uniformName.toUpperCase()] = true;
                    }
                    
                    needUVs = true;
                    this._defines.TEXTURE = true;
                }                
            }

            // Effect
            if (scene.clipPlane) {
                this._defines.CLIPPLANE = true;
            }

            if (engine.getAlphaTesting()) {
                this._defines.ALPHATEST = true;
            }

            // Point size
            if (this.pointsCloud || scene.forcePointsCloud) {
                this._defines.POINTSIZE = true;
            }

            // Fog
            if (scene.fogEnabled && mesh && mesh.applyFog && scene.fogMode !== Scene.FOGMODE_NONE && this.fogEnabled) {
                this._defines.FOG = true;
            }

            if (scene.lightsEnabled && !this.disableLighting) {
                needNormals = MaterialHelper.PrepareDefinesForLights(scene, mesh, this._defines, this.maxSimultaneousLights);
            }

            // Attribs
            if (mesh) {
                if (needNormals && mesh.isVerticesDataPresent(VertexBuffer.NormalKind)) {
                    this._defines.NORMAL = true;
                }
                if (needUVs) {
                    if (mesh.isVerticesDataPresent(VertexBuffer.UVKind)) {
                        this._defines.UV1 = true;
                    }
                    if (mesh.isVerticesDataPresent(VertexBuffer.UV2Kind)) {
                        this._defines.UV2 = true;
                    }
                }
                if (mesh.useVertexColors && mesh.isVerticesDataPresent(VertexBuffer.ColorKind)) {
                    this._defines.VERTEXCOLOR = true;

                    if (mesh.hasVertexAlpha) {
                        this._defines.VERTEXALPHA = true;
                    }
                }
                if (mesh.useBones && mesh.computeBonesUsingShaders) {
                    this._defines.NUM_BONE_INFLUENCERS = mesh.numBoneInfluencers;
                    this._defines.BonesPerMesh = (mesh.skeleton.bones.length + 1);
                }

                // Instances
                if (useInstances) {
                    this._defines.INSTANCES = true;
                }
            }

            // Get correct effect      
            if (!this._defines.isEqual(this._cachedDefines)) {
                this._defines.cloneTo(this._cachedDefines);

                scene.resetCachedMaterial();

                // Fallbacks
                var fallbacks = new EffectFallbacks();             
                if (this._defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }

                MaterialHelper.HandleFallbacksForShadows(this._defines, fallbacks, this.maxSimultaneousLights);
                
                if (this._defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }

                //Attributes
                var attribs = [VertexBuffer.PositionKind];

                if (this._defines.NORMAL) {
                    attribs.push(VertexBuffer.NormalKind);
                }

                if (this._defines.UV1) {
                    attribs.push(VertexBuffer.UVKind);
                }

                if (this._defines.UV2) {
                    attribs.push(VertexBuffer.UV2Kind);
                }

                if (this._defines.VERTEXCOLOR) {
                    attribs.push(VertexBuffer.ColorKind);
                }

                MaterialHelper.PrepareAttributesForBones(attribs, mesh, this._defines, fallbacks);
                MaterialHelper.PrepareAttributesForInstances(attribs, this._defines);

                // Setup uniforms and samplers
                var otherUniforms: string[] = [];
                var otherSamplers: string[] = [];

                if (this.settings.time)
                    otherUniforms.push("time");

                for (var i = 0; i < this.settings.uniforms.length; i++)
                    otherUniforms.push(this.settings.uniforms[i].name);

                for (var i = 0; i < this.settings.samplers.length; i++) {
                    var samplerName = this.settings.samplers[i].uniformName;
                    var samplerNameUpper = samplerName[0].toUpperCase() + samplerName.substr(1, samplerName.length - 1);

                    otherSamplers.push(samplerName + "Sampler");
                    otherUniforms.push("v" + samplerNameUpper + "Infos");
                    otherUniforms.push(samplerName + "Matrix");
                }

                // Build effect
                var join = this._defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor",
                                "vFogInfos", "vFogColor", "pointSize",
                                "mBones",
                                "vClipPlane", "depthValues"
                ].concat(otherUniforms);
                
                MaterialHelper.PrepareUniformsAndSamplersList(uniforms, otherSamplers, this._defines, this.maxSimultaneousLights);
                
                this._effect = scene.getEngine().createEffect(this.name,
                    attribs, uniforms, otherSamplers,
                    join, fallbacks, this.onCompiled, this.onError, {maxSimultaneousLights: this.maxSimultaneousLights});
            }
            
            if (!this._effect.isReady()) {
                return false;
            }

            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;

            if (mesh) {
                if (!mesh._materialDefines) {
                    mesh._materialDefines = new MaterialBuilderDefines();
                }

                this._defines.cloneTo(mesh._materialDefines);
            }

            return true;
        }

        public bindOnlyWorldMatrix(world: Matrix): void {
            this._effect.setMatrix("world", world);
        }

        public bind(world: Matrix, mesh?: Mesh): void {
            var scene = this.getScene();

            // Matrices        
            this.bindOnlyWorldMatrix(world);
            this._effect.setMatrix("viewProjection", scene.getTransformMatrix());

            // Bones
            MaterialHelper.BindBonesParameters(mesh, this._effect);

            if (scene.getCachedMaterial() !== this) {
                // Textures
                for (var i = 0; i < this.settings.samplers.length; i++) {
                    var sampler = this.settings.samplers[i];
                    if (sampler.object) {
                        this._effect.setTexture(sampler.uniformName + "Sampler", sampler.object);

                        var samplerName = sampler.uniformName;
                        var samplerNameUpper = samplerName[0].toUpperCase() + samplerName.substr(1, samplerName.length - 1);

                        this._effect.setFloat2("v" + samplerNameUpper + "Infos", sampler.object.coordinatesIndex, sampler.object.level);
                        this._effect.setMatrix(samplerName + "Matrix", sampler.object.getTextureMatrix());
                    }
                }
                
                // Clip plane
                MaterialHelper.BindClipPlane(this._effect, scene);

                // Point size
                if (this.pointsCloud) {
                    this._effect.setFloat("pointSize", this.pointSize);
                }

                this._effect.setVector3("vEyePosition", scene._mirroredCameraPosition ? scene._mirroredCameraPosition : scene.activeCamera.position);                
            }

            this._effect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);

            // Lights
            if (scene.lightsEnabled && !this.disableLighting) {
                MaterialHelper.BindLights(scene, mesh, this._effect, this._defines, this.maxSimultaneousLights);          
            }

            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== Scene.FOGMODE_NONE) {
                this._effect.setMatrix("view", scene.getViewMatrix());
            }

            // Fog
            MaterialHelper.BindFogParameters(scene, mesh, this._effect);

            // Other uniforms
            for (var i = 0; i < this.settings.uniforms.length; i++) {
                var uniform = this.settings.uniforms[i];

                if (uniform._cachedValue instanceof Vector2)
                    this._effect.setVector2(uniform.name, uniform._cachedValue);
                else if (uniform._cachedValue instanceof Vector3)
                    this._effect.setVector3(uniform.name, uniform._cachedValue);
                else if (uniform._cachedValue instanceof Vector4)
                    this._effect.setVector4(uniform.name, uniform._cachedValue);
                else
                    this._effect.setFloat(uniform.name, uniform._cachedValue);
            }

            // Predefined uniforms
            if (this.settings.time)
                this._effect.setFloat("time", (this._currentTime += scene.getEngine().getDeltaTime()));

            super.bind(world, mesh);
        }

        public getAnimatables(): IAnimatable[] {
            var results = [];

            for (var i = 0; i < this.settings.samplers.length; i++) {
                var texture = this.settings.samplers[i].object;
                if (texture && texture.animations && texture.animations.length > 0) {
                    results.push(texture);
                }
            }

            return results;
        }

        public dispose(forceDisposeEffect?: boolean): void {
            super.dispose(forceDisposeEffect);
        }

        public clone(name: string): MaterialBuilder {
            return SerializationHelper.Clone<MaterialBuilder>(() => new MaterialBuilder(name, this.getScene()), this);
        }
        
        public serialize(): any {
            var serializationObject = SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.EDITOR.EXTENSIONS.MaterialBuilder";
            
            // Settings
            var settings = <IMaterialBuilderSettings> {
                uniforms: [],
                samplers: [],
                time: this.settings.time
            };

            for (var i = 0; i < this.settings.uniforms.length; i++) {
                var uniform = this.settings.uniforms[i];
                var newUniform = <IMaterialBuilderUniform> {
                    name: uniform.name,
                    value: uniform.value,
                    _cachedValue: undefined
                };

                settings.uniforms.push(newUniform);
            }

            for (var i = 0; i < this.settings.samplers.length; i++) {
                var sampler = this.settings.samplers[i];
                settings.samplers.push({
                    uniformName: sampler.uniformName,
                    textureName: sampler.textureName,
                    serializedObject: sampler.object ? sampler.object.serialize() : null
                });
            }

            serializationObject.settings = settings;
            serializationObject.pixelShader = this._data.pixel;
            serializationObject.vertexShader = this._data.vertex;
            serializationObject.materialName = this._data.name;

            return serializationObject;
        }

        public setupCachedValues(): void {
            for (var j = 0; j < this.settings.uniforms.length; j++) {
                var uniform = this.settings.uniforms[j];

                if (uniform.value instanceof Array) {
                    switch (uniform.value.length) {
                        case 2: uniform._cachedValue = Vector2.FromArray(uniform.value); break;
                        case 3: uniform._cachedValue = Vector3.FromArray(uniform.value); break;
                        case 4: uniform._cachedValue = Vector4.FromArray(uniform.value); break;
                        default: BABYLON.Tools.Warn("Uniform named " + uniform.name + " as not supported type"); uniform._cachedValue = 0; break;
                    }
                }
                else
                    uniform._cachedValue = uniform.value;
            }
        }

        // Statics
        public static Parse(source: any, scene: Scene, rootUrl: string): MaterialBuilder {
            Effect.ShadersStore[source.materialName + "VertexShader"] = source.vertexShader;
            Effect.ShadersStore[source.materialName + "PixelShader"] = source.pixelShader;

            if (source.settings) {
                for (var i = 0; i < source.settings.samplers.length; i++) {
                    var sampler = source.settings.samplers[i];
                    if (sampler.serializedObject)
                        sampler.object = Texture.Parse(sampler.serializedObject, scene, rootUrl);
                }
            }

            debugger;
            var material = SerializationHelper.Parse(() => new MaterialBuilder(source.name, scene, source.settings), source, scene, rootUrl);
            material.setupCachedValues();

            return material;
        }
    }
} 
