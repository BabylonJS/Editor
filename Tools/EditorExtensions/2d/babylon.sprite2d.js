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
    var Sprite2D = (function (_super) {
        __extends(Sprite2D, _super);
        // Constructor
        function Sprite2D(name, scene, parent) {
            var _this = _super.call(this, name, scene, parent) || this;
            // Public members
            _this.textures = [];
            _this.textureOffset = BABYLON.Vector2.Zero();
            _this.textureScale = new BABYLON.Vector2(1, 1);
            _this.invertY = false;
            // Private members
            _this._vertices = [];
            _this._vertexBuffer = null;
            _this._indexBuffer = null;
            _this._textureIndex = 0;
            // Initialize
            _this.position.z = 1;
            _this._prepareBuffers();
            _this._prepareMaterial();
            return _this;
        }
        // Override render
        Sprite2D.prototype.render = function (subMesh, enableAlphaMode) {
            // Is dirty ?
            if (this._isBufferDirty) {
                this._updateBuffers(this.textures[this.textureIndex]);
                this._isBufferDirty = false;
            }
            if (this.material && this.material.alpha < 1)
                enableAlphaMode = true;
            _super.prototype.render.call(this, subMesh, enableAlphaMode);
            return this;
        };
        Sprite2D.prototype.isReady = function () {
            var texture = this.textures[this._textureIndex];
            return texture && texture.isReady() && _super.prototype.isReady.call(this);
        };
        // Sets textures
        Sprite2D.prototype.setTextures = function (textures) {
            var _this = this;
            this.textures = Array.isArray(textures) ? textures : [textures];
            // Set new positions in vertex data
            if (this.textures[this._textureIndex]) {
                if (this.textures[this._textureIndex].isReady())
                    this._updateBuffers(this.textures[this._textureIndex]);
                else
                    this.textures[this._textureIndex].onLoadObservable.add(function () { return _this._updateBuffers(_this.textures[_this._textureIndex]); });
            }
        };
        // Sets the frame coordinates (x, y, width, height)
        Sprite2D.prototype.setFrameCoordinates = function (x, y, width, height) {
            var _this = this;
            var texture = this.textures[this._textureIndex];
            if (texture.isReady())
                this._setFrameCoordinates(texture, x, y, width, height);
            else
                texture.onLoadObservable.add(function () { return _this._setFrameCoordinates(texture, x, y, width, height); });
        };
        Object.defineProperty(Sprite2D.prototype, "width", {
            // Returns the width of the sprite
            get: function () {
                var texture = this.textures[this._textureIndex];
                if (!texture)
                    return 0;
                return texture.getBaseSize().width; // * this.scaleX;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2D.prototype, "height", {
            // Returns the height of the sprite
            get: function () {
                var texture = this.textures[this._textureIndex];
                if (!texture)
                    return 0;
                return texture.getBaseSize().height * this.scaleY;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite2D.prototype, "textureIndex", {
            // Returns the texture index
            get: function () { return this._textureIndex; },
            // Sets the texture index
            set: function (textureIndex) {
                var _this = this;
                var newTexture = this.textures[textureIndex];
                if (!newTexture)
                    return;
                var currentTexture = this.textures[this._textureIndex];
                if (!currentTexture || newTexture.getBaseSize().width !== currentTexture.getBaseSize().width || newTexture.getBaseSize().height !== currentTexture.getBaseSize().height) {
                    if (newTexture.isReady())
                        this._updateBuffers(newTexture);
                    else
                        newTexture.onLoadObservable.add(function () { return _this._updateBuffers(newTexture); });
                }
                this._textureIndex = textureIndex;
            },
            enumerable: true,
            configurable: true
        });
        // Sets the frame coordinates
        Sprite2D.prototype._setFrameCoordinates = function (texture, x, y, width, height) {
            // Zoom
            this.textureScale.x = width / texture.getBaseSize().width;
            this.textureScale.y = height / texture.getBaseSize().height;
            // Offset
            this.textureOffset.x = x / texture.getBaseSize().width;
            this.textureOffset.y = y / texture.getBaseSize().height;
        };
        // Sets the vertex data
        Sprite2D.prototype._updateBuffers = function (texture) {
            if (!texture)
                return;
            var vertexBuffer = this._geometry.getVertexBuffer(BABYLON.VertexBuffer.PositionKind);
            var data = vertexBuffer.getData();
            var width = this.width / BABYLON.Container2D.RenderWidth;
            var height = this.height / BABYLON.Container2D.RenderHeight;
            data[0] = -1.0 - this._pivot.x * width;
            data[1] = -1.0 - this._pivot.y * height;
            data[3] = width - 1.0 - this._pivot.x * width;
            data[4] = -1.0 - this._pivot.y * height;
            data[6] = width - 1.0 - this._pivot.x * width;
            data[7] = height - 1.0 - this._pivot.y * height;
            data[9] = 0 - 1.0 - this._pivot.x * width;
            data[10] = height - 1.0 - this._pivot.y * height;
            // Update
            vertexBuffer.update(data);
            this.refreshBoundingInfo();
        };
        // Prepares the buffers for sprite
        Sprite2D.prototype._prepareBuffers = function () {
            // VBO and indices
            var vertices = [
                1, 1, 0,
                -1, 1, 0,
                -1, -1, 0,
                1, -1, 0
            ];
            var indices = [0, 1, 2, 0, 2, 3];
            var uvs = [
                0, 0,
                1, 0,
                1, 1,
                0, 1
            ];
            // Geometry
            var vertexData = new BABYLON.VertexData();
            vertexData.indices = indices;
            vertexData.positions = vertices;
            vertexData.uvs = uvs;
            if (this._geometry)
                this._geometry.dispose();
            this._geometry = new BABYLON.Geometry(name, this.getScene(), vertexData, true, this);
            this._geometry.doNotSerialize = true;
        };
        // Prepares the sprite 2d material
        Sprite2D.prototype._prepareMaterial = function () {
            var _this = this;
            var material = this._getMaterial();
            if (material) {
                material.dispose(true, false);
            }
            var shaderPath = {
                vertex: "sprite2d",
                fragment: "sprite2d"
            };
            var options = {
                attributes: ["position", "uv"],
                uniforms: ["world", "alpha", "uvOffset", "uvScale", "invertY"],
                samplers: ["textureSampler"]
            };
            material = new BABYLON.ShaderMaterial(this.name + "_mat", this.getScene(), shaderPath, options);
            material.onBind = function (mesh) { return _this._onBindMaterial(mesh); };
            this.material = material;
        };
        // Binds the material
        Sprite2D.prototype._onBindMaterial = function (mesh) {
            var material = this._getMaterial();
            // Texture
            var texture = this.textures[this._textureIndex];
            if (texture && texture.isReady()) {
                material.setTexture("textureSampler", this.textures[this._textureIndex]);
            }
            // Set world matrix
            material.setMatrix("world", mesh.getWorldMatrix());
            // Set misc
            material.setFloat("alpha", material.alpha);
            material.setVector2("uvScale", this.textureScale);
            material.setVector2("uvOffset", this.textureOffset);
            material.setFloat("invertY", this.invertY ? -1.0 : 1.0);
        };
        // Returns the material as ShaderMaterial
        Sprite2D.prototype._getMaterial = function () {
            return this.material;
        };
        // Serializes the sprite
        Sprite2D.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this, _super.prototype.serialize.call(this));
            serializationObject.customType = "Sprite2D";
            serializationObject.textures = [];
            for (var i = 0; i < this.textures.length; i++) {
                serializationObject.textures.push(this.textures[i].serialize());
            }
            return serializationObject;
        };
        // Parses the sprite
        Sprite2D.Parse = function (serializationObject, scene, rootUrl) {
            var sprite = BABYLON.SerializationHelper.Parse(function () { return new Sprite2D(serializationObject.name, scene); }, serializationObject, scene, rootUrl);
            var textures = [];
            for (var i = 0; i < serializationObject.textures.length; i++) {
                textures.push(BABYLON.Texture.Parse(serializationObject.textures[i], scene, rootUrl));
            }
            sprite.setTextures(textures);
            return sprite;
        };
        return Sprite2D;
    }(BABYLON.Container2D));
    __decorate([
        BABYLON.serialize()
    ], Sprite2D.prototype, "textureOffset", void 0);
    __decorate([
        BABYLON.serialize()
    ], Sprite2D.prototype, "textureScale", void 0);
    __decorate([
        BABYLON.serialize()
    ], Sprite2D.prototype, "invertY", void 0);
    __decorate([
        BABYLON.serialize("textureIndex")
    ], Sprite2D.prototype, "textureIndex", null);
    BABYLON.Sprite2D = Sprite2D;
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.sprite2d.js.map