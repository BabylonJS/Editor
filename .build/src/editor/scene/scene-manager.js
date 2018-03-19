"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var SceneManager = /** @class */ (function () {
    function SceneManager() {
    }
    /**
     * Clears the scene manager
     */
    SceneManager.Clear = function () {
        this.ActionManagers = {};
    };
    /**
     * Toggles all interaction events to disable but keep
     * references like Action Manager references etc.
     * @param scene the scene to toggle
     */
    SceneManager.Toggle = function (scene) {
        var _this = this;
        scene.meshes.forEach(function (m) {
            var savedActionManager = _this.ActionManagers[m.id] || null;
            var currentActionManager = m.actionManager;
            _this.ActionManagers[m.id] = currentActionManager;
            m.actionManager = savedActionManager;
        });
    };
    /**
     * Returns the animatable objects
     * @param scene the scene containing animatables
     */
    SceneManager.GetAnimatables = function (scene) {
        var animatables = [scene];
        if (this.StandardRenderingPipeline)
            animatables.push(this.StandardRenderingPipeline);
        scene.meshes.forEach(function (m) { return animatables.push(m); });
        scene.lights.forEach(function (l) { return animatables.push(l); });
        scene.cameras.forEach(function (c) { return animatables.push(c); });
        scene.particleSystems.forEach(function (ps) { return animatables.push(ps); });
        return animatables;
    };
    /**
     * Returns the animation frame bounds (min frame, max frame)
     * @param animatables the animtables to check
     */
    SceneManager.GetAnimationFrameBounds = function (animatables) {
        var bounds = {
            min: Number.MAX_VALUE,
            max: Number.MIN_VALUE
        };
        animatables.forEach(function (a) {
            a.animations.forEach(function (a) {
                var keys = a.getKeys();
                keys.forEach(function (k) {
                    if (k.frame < bounds.min)
                        bounds.min = k.frame;
                    if (k.frame > bounds.max)
                        bounds.max = k.frame;
                });
            });
        });
        return bounds;
    };
    /**
     * Plays all the animtables
     * @param animatables the animatables to play
     */
    SceneManager.PlayAllAnimatables = function (scene, animatables) {
        var bounds = SceneManager.GetAnimationFrameBounds(animatables);
        animatables.forEach(function (a) { return scene.beginAnimation(a, bounds.min, bounds.max, false, 1.0); });
    };
    /**
     * Clears all the unused materials from the scene
     * @param scene: the scene containing the materials
     */
    SceneManager.CleanUnusedMaterials = function (scene) {
        var count = 0;
        var used = [];
        scene.meshes.forEach(function (m) { return m.material && used.indexOf(m.material) === -1 && used.push(m.material); });
        scene.materials.forEach(function (m) {
            if (m instanceof babylonjs_1.StandardMaterial && used.indexOf(m) === -1) {
                m.dispose(true, false);
                count++;
            }
        });
        return count;
    };
    /**
     * Clears all the unused textures from the scene
     * @param scene the scene containing the textures
     */
    SceneManager.CleanUnusedTextures = function (scene) {
        var count = 0;
        var used = [];
        scene.materials
            .concat(scene.particleSystems)
            .concat(scene.postProcesses).forEach(function (m) {
            for (var thing in m) {
                var value = m[thing];
                if (value instanceof babylonjs_1.BaseTexture && used.indexOf(m[thing]) === -1)
                    used.push(m[thing]);
            }
        });
        scene.textures.forEach(function (t) {
            if (!(t instanceof babylonjs_1.RenderTargetTexture) && used.indexOf(t) === -1) {
                t.dispose();
                count++;
            }
        });
        return count;
    };
    // Public members
    SceneManager.ActionManagers = {};
    SceneManager.StandardRenderingPipeline = null;
    SceneManager.SSAORenderingPipeline = null;
    SceneManager.SSAO2RenderingPipeline = null;
    SceneManager.GlowLayer = null;
    SceneManager.PostProcessExtension = null;
    return SceneManager;
}());
exports.default = SceneManager;
//# sourceMappingURL=scene-manager.js.map