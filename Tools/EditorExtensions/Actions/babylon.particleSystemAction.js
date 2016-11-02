var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    // Start particle system
    var StartParticleSystemAction = (function (_super) {
        __extends(StartParticleSystemAction, _super);
        function StartParticleSystemAction(triggerOptions, particleSystem, condition) {
            _super.call(this, triggerOptions, condition);
            this._particleSystem = particleSystem;
        }
        StartParticleSystemAction.prototype._prepare = function () {
        };
        StartParticleSystemAction.prototype.execute = function () {
            if (this._particleSystem !== undefined)
                this._particleSystem.start();
        };
        StartParticleSystemAction.prototype.serialize = function (parent) {
            return _super.prototype._serialize.call(this, {
                name: "StartParticleSystemAction",
                properties: [{ name: "particleSystem", value: this._particleSystem ? this._particleSystem.id : "" }]
            }, parent);
        };
        return StartParticleSystemAction;
    }(BABYLON.Action));
    BABYLON.StartParticleSystemAction = StartParticleSystemAction;
    // Start particle system
    var StopParticleSystemAction = (function (_super) {
        __extends(StopParticleSystemAction, _super);
        function StopParticleSystemAction(triggerOptions, particleSystem, condition) {
            _super.call(this, triggerOptions, condition);
            this._particleSystem = particleSystem;
        }
        StopParticleSystemAction.prototype._prepare = function () {
        };
        StopParticleSystemAction.prototype.execute = function () {
            if (this._particleSystem !== undefined)
                this._particleSystem.stop();
        };
        StopParticleSystemAction.prototype.serialize = function (parent) {
            return _super.prototype._serialize.call(this, {
                name: "StopParticleSystemAction",
                properties: [{ name: "particleSystem", value: this._particleSystem ? this._particleSystem.id : "" }]
            }, parent);
        };
        return StopParticleSystemAction;
    }(BABYLON.Action));
    BABYLON.StopParticleSystemAction = StopParticleSystemAction;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.particleSystemAction.js.map