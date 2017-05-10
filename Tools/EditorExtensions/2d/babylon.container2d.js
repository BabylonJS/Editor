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
var BABYLON;
(function (BABYLON) {
    var Container2D = (function (_super) {
        __extends(Container2D, _super);
        // Constructor
        function Container2D(name, scene, parent) {
            var _this = _super.call(this, name, scene, parent) || this;
            // Public members
            _this.dock = BABYLON.Dock.LEFT | BABYLON.Dock.BOTTOM;
            _this.resize = BABYLON.Resize.NONE;
            _this.fitCoefficient = 1;
            // Private members
            _this._lastRenderWidth = -1;
            _this._lastRenderHeight = -1;
            // Protected members
            _this._pivot = BABYLON.Vector3.Zero();
            _this._isBufferDirty = false;
            _this._x = 0;
            _this._y = 0;
            _this._scalex = 1;
            _this._scaley = 1;
            _this._width = 1;
            _this._height = 1;
            return _this;
        }
        // Override render
        Container2D.prototype.render = function (subMesh, enableAlphaMode) {
            // Render size changed ?
            var engine = this.getEngine();
            if (engine.getRenderWidth() !== this._lastRenderWidth || engine.getRenderHeight() !== this._lastRenderHeight) {
                this._isBufferDirty = true;
                this._lastRenderWidth = Container2D.RenderWidth = engine.getRenderWidth();
                this._lastRenderHeight = Container2D.RenderHeight = engine.getRenderHeight();
            }
            // Disable depth buffer
            this.getEngine().setDepthBuffer(false);
            // Render
            _super.prototype.render.call(this, subMesh, enableAlphaMode);
            // Re-enable depth buffer
            this.getEngine().setDepthBuffer(true);
            return this;
        };
        Container2D.prototype.getWorldMatrix = function () {
            if ((this.resize || this.dock) && this.isReady()) {
                var parentWidth = this.parent ? this.parent.width : Container2D.RenderWidth;
                var parentHeight = this.parent ? this.parent.height : Container2D.RenderHeight;
                if (this.resize === BABYLON.Resize.COVER) {
                    var ratio = Math.max(parentWidth * 2.0 / this.width, parentHeight * 2.0 / this.height);
                    this.scaling.x = this.scaling.y = ratio;
                }
                else if (this.resize === BABYLON.Resize.CONTAIN) {
                    var ratio = Math.min(parentWidth * 2.0 / this.width, parentHeight * 2.0 / this.height);
                    this.scaling.x = this.scaling.y = ratio;
                }
                else if (this.resize === BABYLON.Resize.FIT) {
                    var ratio = Math.min(parentWidth * 2.0 / this.width, parentHeight * 2.0 / this.height);
                    this.scaling.x = this.scaling.y = ratio * this.fitCoefficient;
                }
                else {
                    this.scaling.x = this._scalex;
                    this.scaling.y = this._scaley;
                }
                if (this.dock) {
                    if (this.dock & BABYLON.Dock.CENTER_HORIZONTAL) {
                        this.position.x = ((parentWidth / 2.0) + this._x) / parentWidth * 2.0 * this.scaling.x;
                    }
                    else if (this.dock & BABYLON.Dock.RIGHT) {
                        this.position.x = (parentWidth - this._x) / parentWidth * 2.0 * this.scaling.x;
                    }
                    else {
                        this.position.x = this._x / parentWidth * 2.0 * this.scaling.x;
                    }
                    if (this.dock & BABYLON.Dock.CENTER_VERTICAL) {
                        this.position.y = ((parentHeight / 2.0) + this._y) / parentHeight * 2.0 * this.scaling.y;
                    }
                    else if (this.dock & BABYLON.Dock.TOP) {
                        this.position.y = (parentHeight - this._y) / parentHeight * 2.0 * this.scaling.y;
                    }
                    else {
                        this.position.y = this._y / parentHeight * 2.0 * this.scaling.y;
                    }
                }
                // Adjust fit
                if (this.resize === BABYLON.Resize.FIT && this.dock) {
                    if (this.dock & BABYLON.Dock.RIGHT)
                        this.position.x -= this.scaling.x - 1.0;
                    else
                        this.position.x += this.scaling.x - 1.0;
                }
            }
            var matrix = _super.prototype.getWorldMatrix.call(this);
            return matrix;
        };
        Container2D.prototype.setPivotPoint = function (point, space) {
            this._pivot.x = point.x;
            this._pivot.y = point.y;
            this._isBufferDirty = true;
            return this;
        };
        Container2D.prototype.getPivotPoint = function () {
            return this._pivot;
        };
        Object.defineProperty(Container2D.prototype, "x", {
            get: function () { return this._x; },
            set: function (x) { this._x = x; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Container2D.prototype, "y", {
            get: function () { return this._y; },
            set: function (y) { this._y = y; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Container2D.prototype, "rotationZ", {
            get: function () { return this.rotation.z; },
            set: function (rotation) { this.rotation.z = rotation; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Container2D.prototype, "scaleXY", {
            get: function () { return Math.max(this._scalex, this._scaley); },
            set: function (xy) { this._scalex = this._scaley = xy; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Container2D.prototype, "scaleX", {
            get: function () { return this._scalex; },
            set: function (scalex) { this._scalex = scalex; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Container2D.prototype, "scaleY", {
            get: function () { return this._scaley; },
            set: function (scaley) { this._scaley = scaley; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Container2D.prototype, "width", {
            get: function () { return this._width; },
            set: function (width) { this._width = Math.max(width, 1); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Container2D.prototype, "height", {
            get: function () { return this._height; },
            set: function (height) { this._height = Math.max(height, 1); },
            enumerable: true,
            configurable: true
        });
        // Serializes the container
        Container2D.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "Container2D";
            serializationObject.parentName = this.parent ? this.parent.name : null;
            return serializationObject;
        };
        // Parses the container
        Container2D.Parse = function (serializationObject, scene, rootUrl) {
            var container = BABYLON.SerializationHelper.Parse(function () { return new Container2D(serializationObject.name, scene); }, serializationObject, scene, rootUrl);
            return container;
        };
        return Container2D;
    }(BABYLON.Mesh));
    Container2D.RenderWidth = 0;
    Container2D.RenderHeight = 0;
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "dock", void 0);
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "resize", void 0);
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "fitCoefficient", void 0);
    __decorate([
        BABYLON.serializeAsVector2()
    ], Container2D.prototype, "_pivot", void 0);
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "x", null);
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "y", null);
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "rotationZ", null);
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "scaleX", null);
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "scaleY", null);
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "width", null);
    __decorate([
        BABYLON.serialize()
    ], Container2D.prototype, "height", null);
    BABYLON.Container2D = Container2D;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.container2d.js.map