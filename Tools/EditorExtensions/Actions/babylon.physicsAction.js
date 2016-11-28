var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    // Applies an impulse
    var ApplyImpulseAction = (function (_super) {
        __extends(ApplyImpulseAction, _super);
        function ApplyImpulseAction(triggerOptions, target, value, condition) {
            _super.call(this, triggerOptions, condition);
            this._target = target;
            this._value = value;
        }
        ApplyImpulseAction.prototype._prepare = function () {
        };
        ApplyImpulseAction.prototype.execute = function () {
            if (this._target instanceof BABYLON.AbstractMesh && this._target.getPhysicsImpostor())
                this._target.applyImpulse(this._value, BABYLON.Vector3.Zero());
        };
        ApplyImpulseAction.prototype.serialize = function (parent) {
            return _super.prototype._serialize.call(this, {
                name: "ApplyImpulseAction",
                properties: [
                    BABYLON.Action._GetTargetProperty(this._target),
                    { name: "value", value: this._value.x + ", " + this._value.y + ", " + this._value.z }
                ]
            }, parent);
        };
        return ApplyImpulseAction;
    }(BABYLON.Action));
    BABYLON.ApplyImpulseAction = ApplyImpulseAction;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.physicsAction.js.map