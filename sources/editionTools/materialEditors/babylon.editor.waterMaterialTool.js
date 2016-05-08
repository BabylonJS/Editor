var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var WaterMaterialTool = (function (_super) {
            __extends(WaterMaterialTool, _super);
            function WaterMaterialTool(editionTool) {
                _super.call(this, editionTool, "WATER-MATERIAL", "WATER", "Water");
                this.onObjectSupported = function (material) { return material instanceof BABYLON.WaterMaterial; };
            }
            WaterMaterialTool.prototype.update = function () {
                var _this = this;
                if (!_super.prototype.update.call(this))
                    return false;
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true);
                this.addColorFolder(this.material.specularColor, "Specular Color", true);
                var bumpFolder = this._element.addFolder("Bump");
                bumpFolder.add(this.material, "bumpHeight").min(0.0).step(0.01).name("Bump Height");
                this.addTextureButton("Texture", "bumpTexture", bumpFolder);
                var windFolder = this._element.addFolder("Wind");
                windFolder.add(this.material, "windForce").min(0.0).step(0.01).name("Wind Force");
                this.addVectorFolder(this.material.windDirection, "Wind Direction", true, windFolder);
                var waveFolder = this._element.addFolder("Waves");
                waveFolder.add(this.material, "waveHeight").min(0.0).step(0.01).name("Wave Height");
                waveFolder.add(this.material, "waveLength").min(0.0).step(0.01).name("Wave Length");
                waveFolder.add(this.material, "waveSpeed").min(0.0).step(0.01).name("Wave Speed");
                var colorFolder = this._element.addFolder("Color");
                colorFolder.add(this.material, "colorBlendFactor").min(0.0).max(1.0).step(0.01).name("Blend Factor");
                this.addColorFolder(this.material.waterColor, "Water Color", true, colorFolder);
                this._rtsEnabled = this.material.renderTargetsEnabled;
                var renderFolder = this._element.addFolder("Reflection & Refraction");
                renderFolder.add(this, "_rtsEnabled").name("Enable Reflection & Refraction").onChange(function (result) {
                    _this.material.enableRenderTargets(result);
                });
                renderFolder.add(this, "_configureReflection").name("Render...");
                return true;
            };
            WaterMaterialTool.prototype._configureReflection = function () {
                var _this = this;
                var scene = this.material.getScene();
                var renderList = this.material.getRenderList();
                var picker = new EDITOR.ObjectPicker(this._editionTool.core);
                picker.objectLists.push(scene.meshes);
                picker.selectedObjects = this.material.getRenderList();
                picker.minSelectCount = 0;
                picker.open();
                picker.onObjectPicked = function (names) {
                    _this.material.reflectionTexture.renderList = [];
                    _this.material.refractionTexture.renderList = [];
                    for (var i = 0; i < names.length; i++) {
                        var mesh = scene.getMeshByName(names[i]);
                        if (!mesh)
                            continue;
                        _this.material.addToRenderList(mesh);
                    }
                };
            };
            return WaterMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.WaterMaterialTool = WaterMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
