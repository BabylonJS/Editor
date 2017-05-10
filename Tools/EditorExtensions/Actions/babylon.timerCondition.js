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
    var TimerCondition = (function (_super) {
        __extends(TimerCondition, _super);
        function TimerCondition(actionManager, value) {
            var _this = 
            // Initialize
            _super.call(this, actionManager) || this;
            _this._started = false;
            _this._finished = false;
            _this._value = value;
            return _this;
        }
        // Methods
        TimerCondition.prototype.isValid = function () {
            var _this = this;
            if (!this._started) {
                this._started = true;
                setTimeout(function () { return _this._finished = true; }, this._value);
            }
            var returnValue = this._finished;
            if (this._finished) {
                // Reset condition
                this._finished = false;
                this._started = false;
            }
            return returnValue;
        };
        TimerCondition.prototype.serialize = function () {
            return this._serialize({
                name: "TimerCondition",
                properties: [
                    { name: "value", value: this._value }
                ]
            });
        };
        return TimerCondition;
    }(BABYLON.Condition));
    BABYLON.TimerCondition = TimerCondition;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.timerCondition.js.map