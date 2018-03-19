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
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var edition_tool_1 = require("./edition-tool");
var ParticleSystemTool = /** @class */ (function (_super) {
    __extends(ParticleSystemTool, _super);
    function ParticleSystemTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'PARTICLE-SYSTEM-TOOL';
        _this.tabName = 'Particle System';
        // Private members
        _this._currentEmitter = '';
        _this._currentBlendMode = '';
        _this._currentEmiterType = '';
        return _this;
    }
    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    ParticleSystemTool.prototype.isSupported = function (object) {
        return object instanceof babylonjs_1.ParticleSystem;
    };
    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    ParticleSystemTool.prototype.update = function (ps) {
        var _this = this;
        _super.prototype.update.call(this, ps);
        // Misc.
        var scene = this.editor.core.scene;
        // Particle System
        if (ps instanceof babylonjs_1.ParticleSystem) {
            // Emitter
            var emitter = this.tool.addFolder('Emitter');
            emitter.open();
            if (ps.emitter instanceof babylonjs_1.Vector3)
                this.tool.addVector(emitter, 'Emitter', ps.emitter);
            else {
                this._currentEmitter = ps.emitter.name;
                var nodes = scene.meshes.map(function (m) { return m.name; });
                emitter.add(this, '_currentEmitter', nodes).name('Emitter').onFinishChange(function (r) {
                    var mesh = scene.getMeshByName(r);
                    if (mesh)
                        ps.emitter = mesh;
                });
            }
            // Emitter type
            var emiterType = this.tool.addFolder('Emiter Type');
            emiterType.open();
            this._currentEmiterType = this._getEmiterTypeString(ps);
            var emiterTypes = [
                'Box',
                'Sphere',
                'Sphere Directed',
                'Cone'
            ];
            emiterType.add(this, '_currentEmiterType', emiterTypes).name('Emiter Type').onFinishChange(function (r) {
                switch (r) {
                    case 'Box':
                        ps.createBoxEmitter(ps.direction1, ps.direction2, ps.minEmitBox, ps.maxEmitBox);
                        break;
                    case 'Sphere':
                        ps.createSphereEmitter(10);
                        break;
                    case 'Sphere Directed':
                        ps.createDirectedSphereEmitter(10, ps.direction1, ps.direction2);
                        break;
                    case 'Cone':
                        ps.createConeEmitter(10, 0);
                        break;
                    default: break;
                }
                _this.update(ps);
            });
            if (ps.particleEmitterType instanceof babylonjs_1.SphereParticleEmitter) {
                emiterType.add(ps.particleEmitterType, 'radius').step(0.01).name('Radius');
            }
            else if (ps.particleEmitterType instanceof babylonjs_1.ConeParticleEmitter) {
                emiterType.add(ps.particleEmitterType, 'radius').step(0.01).name('Radius');
                emiterType.add(ps.particleEmitterType, 'angle').step(0.01).name('Angle');
            }
            if (!(ps.particleEmitterType instanceof babylonjs_1.BoxParticleEmitter))
                emiterType.add(ps.particleEmitterType, 'directionRandomizer').min(0).max(1).step(0.001).name('Direction Randomizer');
            // Texture
            var texture = this.tool.addFolder('Texture');
            texture.open();
            this.tool.addTexture(texture, this.editor, 'particleTexture', ps, false).name('Particle Texture');
            var blendModes = ['BLENDMODE_ONEONE', 'BLENDMODE_STANDARD'];
            this._currentBlendMode = blendModes[ps.blendMode];
            texture.add(this, '_currentBlendMode', blendModes).name('Blend Mode').onChange(function (r) { return ps.blendMode = babylonjs_1.ParticleSystem[r]; });
            // Actions
            var actions = this.tool.addFolder('Actions');
            actions.open();
            actions.add(ps, 'rebuild').name('Rebuild');
            // Emit
            var emit = this.tool.addFolder('Emit');
            emit.open();
            emit.add(ps, 'emitRate').min(0).step(0.01).name('Emit Rate');
            emit.add(ps, 'minEmitPower').min(0).step(0.01).name('Min Emit Power');
            emit.add(ps, 'maxEmitPower').min(0).step(0.01).name('Max Emit Power');
            // Update
            var update = this.tool.addFolder('Update');
            update.open();
            update.add(ps, 'updateSpeed').min(0).step(0.01).name('Update Speed');
            // Life
            var life = this.tool.addFolder('Life Time');
            life.open();
            life.add(ps, 'minLifeTime').min(0).step(0.01).name('Min Life Time');
            life.add(ps, 'maxLifeTime').min(0).step(0.01).name('Max Life Time');
            // Size
            var size = this.tool.addFolder('Size');
            size.open();
            size.add(ps, 'minSize').min(0).step(0.01).name('Min Size');
            size.add(ps, 'maxSize').min(0).step(0.01).name('Max Size');
            // Angular Speed
            var angular = this.tool.addFolder('Angular Speed');
            angular.open();
            angular.add(ps, 'minAngularSpeed').min(0).step(0.01).name('Min Angular Speed');
            angular.add(ps, 'maxAngularSpeed').min(0).step(0.01).name('Max Angular Speed');
            // Sprite
            if (ps.isAnimationSheetEnabled) {
                var sprite = this.tool.addFolder('Sprite');
                sprite.open();
                sprite.add(ps, 'startSpriteCellID').min(0).step(1).name('Start Sprite Cell ID');
                sprite.add(ps, 'endSpriteCellID').min(0).step(1).name('End Sprite Cell ID');
                sprite.add(ps, 'spriteCellWidth').min(0).step(1).name('Sprite Cell Width');
                sprite.add(ps, 'spriteCellHeight').min(0).step(1).name('Sprite Cell Height');
                sprite.add(ps, 'spriteCellLoop').name('Sprite Cell Loop').onFinishChange(function (r) { return ps.spriteCellLoop = r; });
                sprite.add(ps, 'spriteCellChangeSpeed').min(0).step(1).name('Sprite Cell Change Speed');
            }
            // Gravity
            this.tool.addVector(this.tool.element, 'Gravity', ps.gravity).open();
            if (ps.particleEmitterType instanceof babylonjs_1.BoxParticleEmitter || ps.particleEmitterType instanceof babylonjs_1.SphereDirectedParticleEmitter) {
                // Direction1
                this.tool.addVector(this.tool.element, 'Direction 1', ps.direction1).open();
                // Direction2
                this.tool.addVector(this.tool.element, 'Direction 2', ps.direction2).open();
                if (ps.particleEmitterType instanceof babylonjs_1.BoxParticleEmitter) {
                    // Min Emit Box
                    this.tool.addVector(this.tool.element, 'Min Emit Box', ps.minEmitBox).open();
                    // Max Emit Box
                    this.tool.addVector(this.tool.element, 'Max Emit Box', ps.maxEmitBox).open();
                }
            }
            // Color 1
            this.tool.addColor(this.tool.element, 'Color 1', ps.color1).open();
            // Color 2
            this.tool.addColor(this.tool.element, 'Color 2', ps.color2).open();
            // Color Dead
            this.tool.addColor(this.tool.element, 'Color Dead', ps.colorDead).open();
        }
    };
    // Returns the emiter type as a string
    ParticleSystemTool.prototype._getEmiterTypeString = function (ps) {
        if (ps.particleEmitterType instanceof babylonjs_1.BoxParticleEmitter)
            return 'Box';
        if (ps.particleEmitterType instanceof babylonjs_1.SphereDirectedParticleEmitter)
            return 'Sphere Directed';
        if (ps.particleEmitterType instanceof babylonjs_1.SphereParticleEmitter)
            return 'Sphere';
        if (ps.particleEmitterType instanceof babylonjs_1.ConeParticleEmitter)
            return 'Cone';
        return 'None';
    };
    return ParticleSystemTool;
}(edition_tool_1.default));
exports.default = ParticleSystemTool;
//# sourceMappingURL=particle-system-tool.js.map