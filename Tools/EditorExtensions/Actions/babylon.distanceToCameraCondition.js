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
var BABYLON;
(function (BABYLON) {
    var DistanceToCameraCondition = (function (_super) {
        __extends(DistanceToCameraCondition, _super);
        function DistanceToCameraCondition(actionManager, target, distance, operator) {
            if (operator === void 0) { operator = BABYLON.ValueCondition.IsEqual; }
            var _this = 
            // Initialize
            _super.call(this, actionManager) || this;
            _this._target = target;
            _this._distance = distance;
            _this._operator = operator;
            return _this;
        }
        // Methods
        DistanceToCameraCondition.prototype.isValid = function () {
            var scene = this._actionManager.getScene();
            if (scene.activeCamera && this._target && this._target.position) {
                var distance = BABYLON.Vector3.Distance(this._actionManager.getScene().activeCamera.position, this._target.position);
                switch (this._operator) {
                    case BABYLON.ValueCondition.IsGreater: return distance > this._distance;
                    case BABYLON.ValueCondition.IsLesser: return distance < this._distance;
                    case BABYLON.ValueCondition.IsEqual:
                    case BABYLON.ValueCondition.IsDifferent:
                        var check = check = this._distance === distance;
                        return this._operator === BABYLON.ValueCondition.IsEqual ? check : !check;
                }
            }
            return false;
        };
        DistanceToCameraCondition.prototype.serialize = function () {
            return this._serialize({
                name: "DistanceToCameraCondition",
                properties: [
                    BABYLON.Action._GetTargetProperty(this._target),
                    { name: "value", value: this._distance }
                ]
            });
        };
        return DistanceToCameraCondition;
    }(BABYLON.Condition));
    BABYLON.DistanceToCameraCondition = DistanceToCameraCondition;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.distanceToCameraCondition.js.map