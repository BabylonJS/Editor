var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var defaultData = [
        "{",
        "   eventName: \"myEvent\",",
        "   eventData: {",
        "       ",
        "   }",
        "}"
    ].join("\n");
    // Send a development event
    var SendDevelopmentEventAction = (function (_super) {
        __extends(SendDevelopmentEventAction, _super);
        function SendDevelopmentEventAction(triggerOptions, namespace, eventName, data, condition) {
            if (data === void 0) { data = defaultData; }
            _super.call(this, triggerOptions, condition);
            this._namespace = namespace;
            this._eventName = eventName;
            this._data = JSON.parse(data);
        }
        SendDevelopmentEventAction.prototype._prepare = function () {
        };
        SendDevelopmentEventAction.prototype.execute = function () {
            BABYLON.EDITOR.EXTENSIONS.DevelopmentBaseExtension.SendEvent(this._namespace, { eventName: this._eventName, eventData: this._data });
        };
        SendDevelopmentEventAction.prototype.serialize = function (parent) {
            return _super.prototype._serialize.call(this, {
                name: "SendDevelopmentEventAction",
                properties: [
                    { name: "namespace", value: this._namespace },
                    { name: "eventName", value: this._eventName },
                    { name: "data", value: JSON.stringify(this._data) }
                ]
            }, parent);
        };
        return SendDevelopmentEventAction;
    }(BABYLON.Action));
    BABYLON.SendDevelopmentEventAction = SendDevelopmentEventAction;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.sendDevelopmentEventAction.js.map