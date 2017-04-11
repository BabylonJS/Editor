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
        public LOGARITHMICDEPTH = false;

        constructor() {
            super();
            this.rebuild();
        }
    }

    export class MaterialBuilder extends PushMaterial {
        @serializeAsColor3("diffuseColor")
        public diffuseColor = new Color3(1, 1, 1);

        @serialize()
        public get useLogarithmicDepth(): boolean {
            return this._useLogarithmicDepth;
        }

        public set useLogarithmicDepth(value: boolean) {
            this._useLogarithmicDepth = value && this.getScene().getEngine().getCaps().fragmentDepthSupported;
            this._markAllSubMeshesAsMiscDirty();
        }

        @serialize("disableLighting")
        private _disableLighting = false;
        @expandToProperty("_markAllSubMeshesAsLightsDirty")
        public disableLighting: boolean;
        
        @serialize("maxSimultaneousLights")
        private _maxSimultaneousLights = 4;
        @expandToProperty("_markAllSubMeshesAsLightsDirty")
        public maxSimultaneousLights: number;

        private _useLogarithmicDepth: boolean;
        
        public settings: IMaterialBuilderSettings = null;
        public _data: IMaterialExtensionData = null;

        private _renderId: number;
        private _mesh: AbstractMesh = null;

        private _currentTime: number = 0;

        constructor(name: string, scene: Scene, settings?: IMaterialBuilderSettings) {
            super(name, scene);

            this.settings = settings || {
                samplers: [],
                uniforms: [],
                time: false
            };
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

		public isReadyForSubMesh(mesh: AbstractMesh, subMesh: SubMesh, useInstances?: boolean): boolean {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }

            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new MaterialBuilderDefines();
            }

            var defines = <MaterialBuilderDefines>subMesh._materialDefines;
            var scene = this.getScene();

            if (!this.checkReadyOnEveryCall) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }

            var engine = scene.getEngine();

            // Textures
            if (defines._areTexturesDirty) {
                defines._needUVs = false;
                defines.TEXTURE = false;

                if (scene.texturesEnabled) {
                    if (this.settings.samplers.length > 0) {
                        for (var i = 0; i < this.settings.samplers.length; i++) {
                            var sampler = this.settings.samplers[i];
                            if (sampler.object && !sampler.object.isReady()) {
                                return false;
                            }

                            defines["TEXTURE_" + sampler.uniformName.toUpperCase()] = true;
                        }
                        
                        defines._needUVs = true;
                        defines.TEXTURE = true;
                    }                
                }
            }

            MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances);

            MaterialHelper.PrepareDefinesForMisc(mesh, scene, this._useLogarithmicDepth, this.pointsCloud, this.fogEnabled, defines);

            if (defines._areMiscDirty) {
                // Nothing now
            }
           
            // Lights
            defines._needNormals = MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, true, this._maxSimultaneousLights, this._disableLighting);

            // Attribs
            MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
            
            this._mesh = mesh;

            // Get correct effect      
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();

                // Fallbacks
                var fallbacks = new EffectFallbacks();             
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }

                if (defines.LOGARITHMICDEPTH) {
                    fallbacks.addFallback(0, "LOGARITHMICDEPTH");
                }

                MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
             
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }

                //Attributes
                var attribs = [VertexBuffer.PositionKind];

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

                // Legacy browser patch
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor",
                                "vFogInfos", "vFogColor", "pointSize",
                                "mBones",
                                "vClipPlane", "depthValues"
                ].concat(otherUniforms);
                
                MaterialHelper.PrepareUniformsAndSamplersList(uniforms, otherSamplers, defines, this.maxSimultaneousLights);
                
                subMesh.setEffect(scene.getEngine().createEffect(this.name,
                    attribs, uniforms, otherSamplers,
                    join, fallbacks, this.onCompiled, this.onError, {maxSimultaneousLights: this.maxSimultaneousLights}), defines);
            }
            if (!subMesh.effect.isReady()) {
                return false;
            }

            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;

            return true;
		}

        public bindForSubMesh(world: Matrix, mesh: Mesh, subMesh: SubMesh): void {
            var scene = this.getScene();

            var defines = <MaterialBuilderDefines>subMesh._materialDefines;
            if (!defines) {
                return;
            }

            var effect = subMesh.effect;
            this._activeEffect = effect;

            // Matrices        
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());

            // Bones
            MaterialHelper.BindBonesParameters(mesh, this._activeEffect);

            if (this._mustRebind(scene, effect)) {
                // Textures
                for (var i = 0; i < this.settings.samplers.length; i++) {
                    var sampler = this.settings.samplers[i];
                    if (sampler.object) {
                        this._activeEffect.setTexture(sampler.uniformName + "Sampler", sampler.object);

                        var samplerName = sampler.uniformName;
                        var samplerNameUpper = samplerName[0].toUpperCase() + samplerName.substr(1, samplerName.length - 1);

                        this._activeEffect.setFloat2("v" + samplerNameUpper + "Infos", sampler.object.coordinatesIndex, sampler.object.level);
                        this._activeEffect.setMatrix(samplerName + "Matrix", sampler.object.getTextureMatrix());
                    }
                }

                // Clip plane
                MaterialHelper.BindClipPlane(this._activeEffect, scene);

                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }

                this._activeEffect.setVector3("vEyePosition", scene._mirroredCameraPosition ? scene._mirroredCameraPosition : scene.activeCamera.position);                
            }

            this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);

            if (scene.lightsEnabled && !this.disableLighting) {
                MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
            }

            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }

            // Fog
            MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);

            // Log. depth
            MaterialHelper.BindLogDepth(defines, this._activeEffect, scene);

            // Other uniforms
            for (var i = 0; i < this.settings.uniforms.length; i++) {
                var uniform = this.settings.uniforms[i];

                if (uniform._cachedValue instanceof Vector2)
                    this._activeEffect.setVector2(uniform.name, uniform._cachedValue);
                else if (uniform._cachedValue instanceof Vector3)
                    this._activeEffect.setVector3(uniform.name, uniform._cachedValue);
                else if (uniform._cachedValue instanceof Vector4)
                    this._activeEffect.setVector4(uniform.name, uniform._cachedValue);
                else
                    this._activeEffect.setFloat(uniform.name, uniform._cachedValue);
            }

            // Predefined uniforms
            if (this.settings.time)
                this._activeEffect.setFloat("time", (this._currentTime += scene.getEngine().getDeltaTime()));

            this._afterBind(mesh, this._activeEffect);
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

            var material = SerializationHelper.Parse(() => new MaterialBuilder(source.name, scene, source.settings), source, scene, rootUrl);
            material.setupCachedValues();

            return material;
        }
    }
} 
