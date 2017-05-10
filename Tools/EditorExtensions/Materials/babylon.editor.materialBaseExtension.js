var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var MaterialBuilderDefines = (function (_super) {
                __extends(MaterialBuilderDefines, _super);
                function MaterialBuilderDefines() {
                    var _this = _super.call(this) || this;
                    _this.TEXTURE = false;
                    _this.CLIPPLANE = false;
                    _this.ALPHATEST = false;
                    _this.POINTSIZE = false;
                    _this.FOG = false;
                    _this.NORMAL = false;
                    _this.UV1 = false;
                    _this.UV2 = false;
                    _this.VERTEXCOLOR = false;
                    _this.VERTEXALPHA = false;
                    _this.NUM_BONE_INFLUENCERS = 0;
                    _this.BonesPerMesh = 0;
                    _this.INSTANCES = false;
                    _this.LOGARITHMICDEPTH = false;
                    _this.rebuild();
                    return _this;
                }
                return MaterialBuilderDefines;
            }(BABYLON.MaterialDefines));
            var MaterialBuilder = (function (_super) {
                __extends(MaterialBuilder, _super);
                function MaterialBuilder(name, scene, settings) {
                    var _this = _super.call(this, name, scene) || this;
                    _this.diffuseColor = new BABYLON.Color3(1, 1, 1);
                    _this._disableLighting = false;
                    _this._maxSimultaneousLights = 4;
                    _this.settings = null;
                    _this._data = null;
                    _this._mesh = null;
                    _this._currentTime = 0;
                    _this.settings = settings || {
                        samplers: [],
                        uniforms: [],
                        time: false
                    };
                    return _this;
                }
                Object.defineProperty(MaterialBuilder.prototype, "useLogarithmicDepth", {
                    get: function () {
                        return this._useLogarithmicDepth;
                    },
                    set: function (value) {
                        this._useLogarithmicDepth = value && this.getScene().getEngine().getCaps().fragmentDepthSupported;
                        this._markAllSubMeshesAsMiscDirty();
                    },
                    enumerable: true,
                    configurable: true
                });
                MaterialBuilder.prototype.needAlphaBlending = function () {
                    return (this.alpha < 1.0);
                };
                MaterialBuilder.prototype.needAlphaTesting = function () {
                    return false;
                };
                MaterialBuilder.prototype.getAlphaTestTexture = function () {
                    return null;
                };
                MaterialBuilder.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
                    if (this.isFrozen) {
                        if (this._wasPreviouslyReady && subMesh.effect) {
                            return true;
                        }
                    }
                    if (!subMesh._materialDefines) {
                        subMesh._materialDefines = new MaterialBuilderDefines();
                    }
                    var defines = subMesh._materialDefines;
                    var scene = this.getScene();
                    if (!this.checkReadyOnEveryCall && subMesh.effect) {
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
                    BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances);
                    BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, this._useLogarithmicDepth, this.pointsCloud, this.fogEnabled, defines);
                    if (defines._areMiscDirty) {
                        // Nothing now
                    }
                    // Lights
                    defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, true, this._maxSimultaneousLights, this._disableLighting);
                    // Attribs
                    BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
                    this._mesh = mesh;
                    // Get correct effect      
                    if (defines.isDirty) {
                        defines.markAsProcessed();
                        scene.resetCachedMaterial();
                        // Fallbacks
                        var fallbacks = new BABYLON.EffectFallbacks();
                        if (defines.FOG) {
                            fallbacks.addFallback(1, "FOG");
                        }
                        if (defines.LOGARITHMICDEPTH) {
                            fallbacks.addFallback(0, "LOGARITHMICDEPTH");
                        }
                        BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
                        if (defines.NUM_BONE_INFLUENCERS > 0) {
                            fallbacks.addCPUSkinningFallback(0, mesh);
                        }
                        //Attributes
                        var attribs = [BABYLON.VertexBuffer.PositionKind];
                        if (defines.NORMAL) {
                            attribs.push(BABYLON.VertexBuffer.NormalKind);
                        }
                        if (defines.UV1) {
                            attribs.push(BABYLON.VertexBuffer.UVKind);
                        }
                        if (defines.UV2) {
                            attribs.push(BABYLON.VertexBuffer.UV2Kind);
                        }
                        if (defines.VERTEXCOLOR) {
                            attribs.push(BABYLON.VertexBuffer.ColorKind);
                        }
                        BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                        BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                        // Setup uniforms and samplers
                        var otherUniforms = [];
                        var otherSamplers = [];
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
                        BABYLON.MaterialHelper.PrepareUniformsAndSamplersList(uniforms, otherSamplers, defines, this.maxSimultaneousLights);
                        subMesh.setEffect(scene.getEngine().createEffect(this.name, attribs, uniforms, otherSamplers, join, fallbacks, this.onCompiled, this.onError, { maxSimultaneousLights: this.maxSimultaneousLights }), defines);
                    }
                    if (!subMesh.effect.isReady()) {
                        return false;
                    }
                    this._renderId = scene.getRenderId();
                    this._wasPreviouslyReady = true;
                    return true;
                };
                MaterialBuilder.prototype.bindForSubMesh = function (world, mesh, subMesh) {
                    var scene = this.getScene();
                    var defines = subMesh._materialDefines;
                    if (!defines) {
                        return;
                    }
                    var effect = subMesh.effect;
                    this._activeEffect = effect;
                    // Matrices        
                    this.bindOnlyWorldMatrix(world);
                    this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
                    // Bones
                    BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
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
                        BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                        // Point size
                        if (this.pointsCloud) {
                            this._activeEffect.setFloat("pointSize", this.pointSize);
                        }
                        this._activeEffect.setVector3("vEyePosition", scene._mirroredCameraPosition ? scene._mirroredCameraPosition : scene.activeCamera.position);
                    }
                    this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);
                    if (scene.lightsEnabled && !this.disableLighting) {
                        BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
                    }
                    // View
                    if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                        this._activeEffect.setMatrix("view", scene.getViewMatrix());
                    }
                    // Fog
                    BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
                    // Log. depth
                    BABYLON.MaterialHelper.BindLogDepth(defines, this._activeEffect, scene);
                    // Other uniforms
                    for (var i = 0; i < this.settings.uniforms.length; i++) {
                        var uniform = this.settings.uniforms[i];
                        if (uniform._cachedValue instanceof BABYLON.Vector2)
                            this._activeEffect.setVector2(uniform.name, uniform._cachedValue);
                        else if (uniform._cachedValue instanceof BABYLON.Vector3)
                            this._activeEffect.setVector3(uniform.name, uniform._cachedValue);
                        else if (uniform._cachedValue instanceof BABYLON.Vector4)
                            this._activeEffect.setVector4(uniform.name, uniform._cachedValue);
                        else
                            this._activeEffect.setFloat(uniform.name, uniform._cachedValue);
                    }
                    // Predefined uniforms
                    if (this.settings.time)
                        this._activeEffect.setFloat("time", (this._currentTime += scene.getEngine().getDeltaTime()));
                    this._afterBind(mesh, this._activeEffect);
                };
                MaterialBuilder.prototype.getAnimatables = function () {
                    var results = [];
                    for (var i = 0; i < this.settings.samplers.length; i++) {
                        var texture = this.settings.samplers[i].object;
                        if (texture && texture.animations && texture.animations.length > 0) {
                            results.push(texture);
                        }
                    }
                    return results;
                };
                MaterialBuilder.prototype.dispose = function (forceDisposeEffect) {
                    _super.prototype.dispose.call(this, forceDisposeEffect);
                };
                MaterialBuilder.prototype.clone = function (name) {
                    var _this = this;
                    return BABYLON.SerializationHelper.Clone(function () { return new MaterialBuilder(name, _this.getScene()); }, this);
                };
                MaterialBuilder.prototype.serialize = function () {
                    var serializationObject = BABYLON.SerializationHelper.Serialize(this);
                    serializationObject.customType = "BABYLON.EDITOR.EXTENSIONS.MaterialBuilder";
                    // Settings
                    var settings = {
                        uniforms: [],
                        samplers: [],
                        time: this.settings.time
                    };
                    for (var i = 0; i < this.settings.uniforms.length; i++) {
                        var uniform = this.settings.uniforms[i];
                        var newUniform = {
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
                };
                MaterialBuilder.prototype.setupCachedValues = function () {
                    for (var j = 0; j < this.settings.uniforms.length; j++) {
                        var uniform = this.settings.uniforms[j];
                        if (uniform.value instanceof Array) {
                            switch (uniform.value.length) {
                                case 2:
                                    uniform._cachedValue = BABYLON.Vector2.FromArray(uniform.value);
                                    break;
                                case 3:
                                    uniform._cachedValue = BABYLON.Vector3.FromArray(uniform.value);
                                    break;
                                case 4:
                                    uniform._cachedValue = BABYLON.Vector4.FromArray(uniform.value);
                                    break;
                                default:
                                    BABYLON.Tools.Warn("Uniform named " + uniform.name + " as not supported type");
                                    uniform._cachedValue = 0;
                                    break;
                            }
                        }
                        else
                            uniform._cachedValue = uniform.value;
                    }
                };
                // Statics
                MaterialBuilder.Parse = function (source, scene, rootUrl) {
                    BABYLON.Effect.ShadersStore[source.materialName + "VertexShader"] = source.vertexShader;
                    BABYLON.Effect.ShadersStore[source.materialName + "PixelShader"] = source.pixelShader;
                    if (source.settings) {
                        for (var i = 0; i < source.settings.samplers.length; i++) {
                            var sampler = source.settings.samplers[i];
                            if (sampler.serializedObject)
                                sampler.object = BABYLON.Texture.Parse(sampler.serializedObject, scene, rootUrl);
                        }
                    }
                    var material = BABYLON.SerializationHelper.Parse(function () { return new MaterialBuilder(source.name, scene, source.settings); }, source, scene, rootUrl);
                    material.setupCachedValues();
                    return material;
                };
                return MaterialBuilder;
            }(BABYLON.PushMaterial));
            __decorate([
                BABYLON.serializeAsColor3("diffuseColor")
            ], MaterialBuilder.prototype, "diffuseColor", void 0);
            __decorate([
                BABYLON.serialize()
            ], MaterialBuilder.prototype, "useLogarithmicDepth", null);
            __decorate([
                BABYLON.serialize("disableLighting")
            ], MaterialBuilder.prototype, "_disableLighting", void 0);
            __decorate([
                BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
            ], MaterialBuilder.prototype, "disableLighting", void 0);
            __decorate([
                BABYLON.serialize("maxSimultaneousLights")
            ], MaterialBuilder.prototype, "_maxSimultaneousLights", void 0);
            __decorate([
                BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
            ], MaterialBuilder.prototype, "maxSimultaneousLights", void 0);
            EXTENSIONS.MaterialBuilder = MaterialBuilder;
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.materialBaseExtension.js.map