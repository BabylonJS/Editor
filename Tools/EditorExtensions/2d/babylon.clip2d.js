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
    var Clip2D = (function (_super) {
        __extends(Clip2D, _super);
        // Constructor
        function Clip2D(name, scene, parent) {
            var _this = _super.call(this, name, scene, parent) || this;
            // Public members
            // Private members
            _this._spriteWidth = 64;
            _this._spriteHeight = 64;
            _this._animated = false;
            _this._delay = 0;
            _this._time = 0;
            _this._clipRowIndex = 0;
            _this._clipIndex = 0;
            _this._clipCount = 0;
            _this._clipPerLine = 0;
            _this._clipPerColumn = 0;
            _this._offsetx = 0;
            _this._offsety = 0;
            return _this;
        }
        // Override render
        Clip2D.prototype.render = function (subMesh, enableAlphaMode) {
            // Animate
            var texture = this.textures[this.textureIndex];
            if (this._animated && texture) {
                this._time += this.getEngine().getDeltaTime();
                this.textureScale.x = this.width / texture.getBaseSize().width;
                this.textureScale.y = this.height / texture.getBaseSize().height;
                if (this._time > this._delay) {
                    this._clipIndex += this._time / this._delay >> 0;
                    this._time = 0;
                    if (this._clipIndex > this._clipCount) {
                        this._clipIndex = 0;
                        this._clipRowIndex = 0;
                    }
                }
                var clipIndex = this._clipIndex;
                this._clipRowIndex = (this._clipIndex / this._clipPerLine) >> 0;
                if (clipIndex > this._clipPerLine)
                    clipIndex -= this._clipPerLine;
                this.textureOffset.x = this._offsetx * this._clipIndex;
                this.textureOffset.y = texture.getBaseSize().width / texture.getSize().width + this._offsety * this._clipRowIndex;
            }
            return _super.prototype.render.call(this, subMesh, enableAlphaMode);
        };
        // Sets textures
        Clip2D.prototype.setTextures = function (textures) {
            _super.prototype.setTextures.call(this, textures);
            this._configure();
        };
        Object.defineProperty(Clip2D.prototype, "width", {
            // Returns the width of the sprite
            get: function () { return this._spriteWidth; },
            // Sets the width of the sprite
            set: function (width) {
                this._spriteWidth = Math.max(width, 1);
                this._isBufferDirty = true;
                this._configure();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Clip2D.prototype, "height", {
            // Returns the height of the sprite
            get: function () { return this._spriteHeight; },
            // Sets the height of the sprite
            set: function (height) {
                this._spriteHeight = Math.max(height, 1);
                this._isBufferDirty = true;
                this._configure();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Clip2D.prototype, "isPlaying", {
            // Returns if the clip is playing
            get: function () { return this._animated; },
            enumerable: true,
            configurable: true
        });
        // Plays the clip
        Clip2D.prototype.play = function (delay, clipCount) {
            this._animated = true;
            this._delay = delay || this._delay;
            this._clipCount = clipCount || this._clipCount;
            this._configure();
        };
        // Stops the clip
        Clip2D.prototype.stop = function () {
            this._animated = false;
            this._time = 0;
            this._clipIndex = 0;
        };
        // Pauses the clip
        Clip2D.prototype.pause = function () {
            this._animated = false;
        };
        // Configures the clip
        Clip2D.prototype._configure = function () {
            var _this = this;
            var texture = this.textures[this.textureIndex];
            if (texture) {
                if (texture.isReady())
                    this._configureClip(texture);
                else
                    texture.onLoadObservable.add(function () { return _this._configureClip(texture); });
            }
        };
        Clip2D.prototype._configureClip = function (texture) {
            this._clipPerLine = texture.getBaseSize().width / this.width;
            this._clipPerColumn = texture.getBaseSize().height / this.height;
            this._offsetx = 1.0 / this._clipPerLine;
            this._offsety = 1.0 - 1.0 / this._clipPerColumn;
        };
        return Clip2D;
    }(BABYLON.Sprite2D));
    BABYLON.Clip2D = Clip2D;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.clip2d.js.map