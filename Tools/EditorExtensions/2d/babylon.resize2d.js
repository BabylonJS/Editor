var BABYLON;
(function (BABYLON) {
    var Resize = (function () {
        function Resize() {
        }
        Object.defineProperty(Resize, "NONE", {
            get: function () { return 0; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Resize, "COVER", {
            get: function () { return 1; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Resize, "CONTAIN", {
            get: function () { return 2; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Resize, "FIT", {
            get: function () { return 3; },
            enumerable: true,
            configurable: true
        });
        return Resize;
    }());
    BABYLON.Resize = Resize;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.resize2d.js.map