"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
/**
 * Custom Material class
 */
var CustomMaterialDefines = /** @class */ (function (_super) {
    __extends(CustomMaterialDefines, _super);
    function CustomMaterialDefines() {
        var _this = _super.call(this) || this;
        _this.TEXTURE = false;
        _this.CLIPPLANE = false;
        _this.ALPHATEST = false;
        _this.DEPTHPREPASS = false;
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
        _this.rebuild();
        return _this;
    }
    return CustomMaterialDefines;
}(babylonjs_1.MaterialDefines));
exports.CustomMaterialDefines = CustomMaterialDefines;
/**
 * Custom material class
 */
var CustomEditorMaterial = /** @class */ (function (_super) {
    __extends(CustomEditorMaterial, _super);
    /**
     * Constructor
     * @param name: the name of the material
     * @param scene: the scene reference
     */
    function CustomEditorMaterial(name, scene, shaderName, customCode, config) {
        var _this = _super.call(this, name, scene) || this;
        // Public members
        _this.baseColor = new babylonjs_1.Color3(1, 1, 1);
        _this._disableLighting = false;
        _this._maxSimultaneousLights = 4;
        _this.userConfig = {};
        _this._buildId = 0;
        // Private members
        _this._lastBuildId = 0;
        _this._shaderName = shaderName;
        _this.customCode = customCode;
        _this.customCode && _this.customCode.prototype.init.call(_this);
        _this.config = config;
        return _this;
    }
    CustomEditorMaterial.prototype.setCustomCode = function (customCode) {
        this.customCode = customCode;
        this.customCode && this.customCode.prototype.init.call(this);
    };
    CustomEditorMaterial.prototype.needAlphaBlending = function () {
        return (this.alpha < 1.0);
    };
    CustomEditorMaterial.prototype.needAlphaTesting = function () {
        return false;
    };
    CustomEditorMaterial.prototype.getAlphaTestTexture = function () {
        return null;
    };
    // Methods
    CustomEditorMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
        if (this.customCode === undefined)
            return false;
        if (this.isFrozen) {
            if (this._wasPreviouslyReady && subMesh.effect) {
                return true;
            }
        }
        if (!subMesh._materialDefines) {
            subMesh._materialDefines = new CustomMaterialDefines();
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
            if (scene.texturesEnabled) {
                var atLeastOneTexture = false;
                for (var _i = 0, _a = this.config.textures; _i < _a.length; _i++) {
                    var t = _a[_i];
                    if (!this.userConfig[t.name])
                        continue;
                    var texture = this.userConfig[t.name];
                    if (!texture.isReady())
                        return false;
                    atLeastOneTexture = true;
                }
                ;
                if (atLeastOneTexture) {
                    defines._needUVs = true;
                    defines.TEXTURE = true;
                }
            }
        }
        // Misc.
        babylonjs_1.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, false, defines);
        // Lights
        defines._needNormals = babylonjs_1.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);
        // Values that need to be evaluated on every frame
        babylonjs_1.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
        // Attribs
        babylonjs_1.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
        // Build id
        if (!this.customCode) {
            for (var i = 0; i < this._buildId; i++)
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
            var fallbacks = new babylonjs_1.EffectFallbacks();
            if (defines.FOG) {
                fallbacks.addFallback(1, 'FOG');
            }
            babylonjs_1.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
            if (defines.NUM_BONE_INFLUENCERS > 0) {
                fallbacks.addCPUSkinningFallback(0, mesh);
            }
            //Attributes
            var attribs = [babylonjs_1.VertexBuffer.PositionKind];
            if (defines.NORMAL) {
                attribs.push(babylonjs_1.VertexBuffer.NormalKind);
            }
            if (defines.UV1) {
                attribs.push(babylonjs_1.VertexBuffer.UVKind);
            }
            if (defines.UV2) {
                attribs.push(babylonjs_1.VertexBuffer.UV2Kind);
            }
            if (defines.VERTEXCOLOR) {
                attribs.push(babylonjs_1.VertexBuffer.ColorKind);
            }
            babylonjs_1.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
            babylonjs_1.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
            var shaderName = this._shaderName;
            var join = defines.toString();
            var uniformBuffers = new Array();
            // Uniforms and samplers
            var samplers = this.config.textures.map(function (t) { return t.name; });
            var uniforms_1 = ['world', 'view', 'viewProjection', 'vEyePosition', 'vLightsType', 'vBaseColor',
                'vFogInfos', 'vFogColor', 'pointSize',
                'mBones',
                'vClipPlane']
                .concat(this.config.floats)
                .concat(this.config.vectors2)
                .concat(this.config.vectors3);
            this.config.textures.forEach(function (t) {
                uniforms_1.push(t.name + 'Infos');
                uniforms_1.push(t.name + 'Matrix');
            });
            this.customCode && this.customCode.prototype.setUniforms.call(this, uniforms_1, samplers);
            if (this.customCode && !this.customCode.prototype.isReadyForSubMesh.call(this, mesh, subMesh, defines))
                return false;
            babylonjs_1.MaterialHelper.PrepareUniformsAndSamplersList({
                uniformsNames: uniforms_1,
                uniformBuffersNames: uniformBuffers,
                samplers: samplers,
                defines: defines,
                maxSimultaneousLights: this.maxSimultaneousLights
            });
            subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                attributes: attribs,
                uniformsNames: uniforms_1,
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
    };
    CustomEditorMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
        var _this = this;
        var scene = this.getScene();
        var defines = subMesh._materialDefines;
        if (!defines) {
            return;
        }
        var effect = subMesh.effect;
        if (!effect) {
            return;
        }
        this._activeEffect = effect;
        // Matrices        
        this.bindOnlyWorldMatrix(world);
        this._activeEffect.setMatrix('viewProjection', scene.getTransformMatrix());
        // Bones
        babylonjs_1.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
        if (this._mustRebind(scene, effect)) {
            // Textures
            this.config.textures.forEach(function (t) {
                var texture = _this.userConfig[t.name];
                if (!texture)
                    return;
                _this._activeEffect.setTexture(t.name, texture);
                _this._activeEffect.setFloat2(t.name + 'Infos', texture.coordinatesIndex, texture.level);
                _this._activeEffect.setMatrix(t.name + 'Matrix', texture.getTextureMatrix());
            });
            // Clip plane
            babylonjs_1.MaterialHelper.BindClipPlane(this._activeEffect, scene);
            // Point size
            if (this.pointsCloud) {
                this._activeEffect.setFloat('pointSize', this.pointSize);
            }
            babylonjs_1.MaterialHelper.BindEyePosition(effect, scene);
        }
        this._activeEffect.setColor4('vBaseColor', this.baseColor, this.alpha * mesh.visibility);
        // Lights
        if (scene.lightsEnabled && !this.disableLighting) {
            babylonjs_1.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
        }
        // View
        if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== babylonjs_1.Scene.FOGMODE_NONE) {
            this._activeEffect.setMatrix('view', scene.getViewMatrix());
        }
        // Fog
        babylonjs_1.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
        // Custom
        this.customCode && this.customCode.prototype.bindForSubMesh.call(this, world, mesh, subMesh, this._activeEffect);
        // User config
        this.config.floats.forEach(function (f) { return _this.userConfig[f] !== undefined && _this._activeEffect.setFloat(f, _this.userConfig[f] || 0); });
        this.config.vectors2.forEach(function (v) { return _this.userConfig[v] !== undefined && _this._activeEffect.setVector2(v, _this.userConfig[v]); });
        this.config.vectors3.forEach(function (v) { return _this.userConfig[v] !== undefined && _this._activeEffect.setVector3(v, _this.userConfig[v]); });
        this._afterBind(mesh, this._activeEffect);
    };
    CustomEditorMaterial.prototype.getAnimatables = function () {
        var _this = this;
        var results = [];
        this.config.textures.forEach(function (t) {
            var texture = _this.userConfig[t.name];
            if (texture && texture.animations && texture.animations.length > 0)
                results.push(texture);
        });
        return results;
    };
    CustomEditorMaterial.prototype.getActiveTextures = function () {
        var _this = this;
        var activeTextures = _super.prototype.getActiveTextures.call(this);
        this.config.textures.forEach(function (t) {
            var texture = _this.userConfig[t.name];
            if (texture)
                activeTextures.push(texture);
        });
        return activeTextures;
    };
    CustomEditorMaterial.prototype.hasTexture = function (texture) {
        if (_super.prototype.hasTexture.call(this, texture)) {
            return true;
        }
        for (var _i = 0, _a = this.config.textures; _i < _a.length; _i++) {
            var t = _a[_i];
            if (this.userConfig[t.name] === texture)
                return true;
        }
        return false;
    };
    CustomEditorMaterial.prototype.dispose = function (forceDisposeEffect) {
        this.customCode && this.customCode.prototype.dispose.call(this);
        _super.prototype.dispose.call(this, forceDisposeEffect);
    };
    CustomEditorMaterial.prototype.clone = function (name) {
        var _this = this;
        return babylonjs_1.SerializationHelper.Clone(function () { return new CustomEditorMaterial(name, _this.getScene(), _this._shaderName, _this.customCode, _this.config); }, this);
    };
    CustomEditorMaterial.prototype.serialize = function () {
        var _this = this;
        var serializationObject = babylonjs_1.SerializationHelper.Serialize(this);
        serializationObject.customType = 'BABYLON.CustomEditorMaterial';
        serializationObject.textures = {};
        serializationObject.floats = {};
        serializationObject.vectors2 = {};
        serializationObject.vectors3 = {};
        // Textures
        if (this.config) {
            this.config.textures.forEach(function (t) { return _this.userConfig[t.name] !== undefined && (serializationObject.textures[t.name] = _this.userConfig[t.name].serialize()); });
            this.config.floats.forEach(function (f) { return _this.userConfig[f] !== undefined && (serializationObject.floats[f] = _this.userConfig[f]); });
            this.config.vectors2.forEach(function (v) { return _this.userConfig[v] !== undefined && (serializationObject.vectors2[v] = _this.userConfig[v].asArray()); });
            this.config.vectors3.forEach(function (v) { return _this.userConfig[v] !== undefined && (serializationObject.vectors3[v] = _this.userConfig[v].asArray()); });
        }
        return serializationObject;
    };
    CustomEditorMaterial.prototype.getClassName = function () {
        return 'CustomMaterial';
    };
    // Statics
    CustomEditorMaterial.Parse = function (source, scene, rootUrl) {
        var material = babylonjs_1.SerializationHelper.Parse(function () { return new CustomEditorMaterial(source.name, scene, source._shaderName, source._customCode, source.config); }, source, scene, rootUrl);
        for (var thing in source.textures)
            material.userConfig[thing] = babylonjs_1.Texture.Parse(source.textures[thing], scene, rootUrl);
        for (var thing in source.floats)
            material.userConfig[thing] = source.floats[thing];
        for (var thing in source.vectors2)
            material.userConfig[thing] = babylonjs_1.Vector2.FromArray(source.vectors2[thing]);
        for (var thing in source.vectors3)
            material.userConfig[thing] = babylonjs_1.Vector3.FromArray(source.vectors3[thing]);
        return material;
    };
    __decorate([
        babylonjs_1.serializeAsColor3('baseColor')
    ], CustomEditorMaterial.prototype, "baseColor", void 0);
    __decorate([
        babylonjs_1.serialize('disableLighting')
    ], CustomEditorMaterial.prototype, "_disableLighting", void 0);
    __decorate([
        babylonjs_1.expandToProperty('_markAllSubMeshesAsLightsDirty')
    ], CustomEditorMaterial.prototype, "disableLighting", void 0);
    __decorate([
        babylonjs_1.serialize('maxSimultaneousLights')
    ], CustomEditorMaterial.prototype, "_maxSimultaneousLights", void 0);
    __decorate([
        babylonjs_1.expandToProperty('_markAllSubMeshesAsLightsDirty')
    ], CustomEditorMaterial.prototype, "maxSimultaneousLights", void 0);
    __decorate([
        babylonjs_1.serialize()
    ], CustomEditorMaterial.prototype, "_shaderName", void 0);
    return CustomEditorMaterial;
}(babylonjs_1.PushMaterial));
exports.default = CustomEditorMaterial;
BABYLON['CustomEditorMaterial'] = CustomEditorMaterial;
//# sourceMappingURL=material.js.map