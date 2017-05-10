var BABYLON;
(function (BABYLON) {
    var Dock = (function () {
        function Dock() {
        }
        Object.defineProperty(Dock, "LEFT", {
            get: function () { return 1; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Dock, "TOP", {
            get: function () { return 2; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Dock, "CENTER_HORIZONTAL", {
            get: function () { return 4; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Dock, "CENTER_VERTICAL", {
            get: function () { return 8; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Dock, "RIGHT", {
            get: function () { return 16; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Dock, "BOTTOM", {
            get: function () { return 32; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Dock, "CENTER_ALL", {
            get: function () { return Dock.CENTER_HORIZONTAL | Dock.CENTER_VERTICAL; },
            enumerable: true,
            configurable: true
        });
        return Dock;
    }());
    BABYLON.Dock = Dock;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.dock2d.js.map