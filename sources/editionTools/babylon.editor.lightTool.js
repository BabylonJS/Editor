var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LightTool = (function (_super) {
            __extends(LightTool, _super);
            function LightTool(editionTool) {
                _super.call(this, editionTool);
                this.tab = "LIGHT.TAB";
                this._customShadowsGeneratorSize = 512;
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-LIGHT"
                ];
            }
            LightTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Light)
                    return true;
                return false;
            };
            LightTool.prototype.createUI = function () {
                this._editionTool.panel.createTab({ id: this.tab, caption: "Light" });
            };
            LightTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                var commonFolder = this._element.addFolder("Common");
                commonFolder.add(object, "intensity").min(0.0).name("Intensity");
                commonFolder.add(object, "range").name("Range").min(0.0);
                commonFolder.add(object, "radius").min(0.0).step(0.001).name("Radius");
                if (object instanceof BABYLON.DirectionalLight) {
                    var directionFolder = this._element.addFolder("Direction");
                    directionFolder.add(object.direction, "x").step(0.1);
                    directionFolder.add(object.direction, "y").step(0.1);
                    directionFolder.add(object.direction, "z").step(0.1);
                }
                if (object instanceof BABYLON.SpotLight) {
                    var spotFolder = this._element.addFolder("Spot Light");
                    spotFolder.add(object, "exponent").min(0.0).name("Exponent");
                    spotFolder.add(object, "angle").min(0.0).name("Angle");
                }
                if (object instanceof BABYLON.HemisphericLight) {
                    var hemiFolder = this._element.addFolder("Hemispheric Light");
                    this.addVectorFolder(object.direction, "Direction", true, hemiFolder);
                    this.addColorFolder(object.groundColor, "Ground Color", true, hemiFolder);
                }
                var colorsFolder = this._element.addFolder("Colors");
                if (object.diffuse) {
                    var diffuseFolder = colorsFolder.addFolder("Diffuse Color");
                    diffuseFolder.open();
                    diffuseFolder.add(object.diffuse, "r").min(0.0).max(1.0).step(0.01);
                    diffuseFolder.add(object.diffuse, "g").min(0.0).max(1.0).step(0.01);
                    diffuseFolder.add(object.diffuse, "b").min(0.0).max(1.0).step(0.01);
                }
                if (object.specular) {
                    var specularFolder = colorsFolder.addFolder("Specular Color");
                    specularFolder.open();
                    specularFolder.add(object.specular, "r").min(0.0).max(1.0).step(0.01);
                    specularFolder.add(object.specular, "g").min(0.0).max(1.0).step(0.01);
                    specularFolder.add(object.specular, "b").min(0.0).max(1.0).step(0.01);
                }
                var shadowsFolder = this._element.addFolder("Shadows");
                var shadows = object.getShadowGenerator();
                if (shadows) {
                    shadowsFolder.add(shadows, "useBlurVarianceShadowMap").name("Use Blur Variance Shadows Map").listen();
                    shadowsFolder.add(shadows, "useVarianceShadowMap").name("Use Variance Shadow Map").listen();
                    shadowsFolder.add(shadows, "usePoissonSampling").name("Use Poisson Sampling").listen();
                    shadowsFolder.add(shadows, "_darkness").min(0.0).max(1.0).step(0.01).name("Darkness");
                    shadowsFolder.add(shadows, "bias").name("Bias");
                    shadowsFolder.add(shadows, "blurBoxOffset").min(0.0).max(10.0).step(1.0).name("Blur Box Offset");
                    shadowsFolder.add(shadows, "blurScale").min(0.0).max(10.0).name("Blur Scale");
                    shadowsFolder.add(this, "_removeShadowGenerator").name("Remove Shadows Generator");
                }
                else {
                    if (!(object instanceof BABYLON.HemisphericLight)) {
                        shadowsFolder.add(this, "_createShadowsGenerator").name("Create Shadows Generator");
                        shadowsFolder.add(this, "_customShadowsGeneratorSize").min(0).name("Shadow Map Size");
                    }
                }
                return true;
            };
            LightTool.prototype._createShadowsGenerator = function () {
                var object = this.object = this._editionTool.object;
                var shadows = new BABYLON.ShadowGenerator(this._customShadowsGeneratorSize, object);
                BABYLON.Tags.EnableFor(shadows);
                BABYLON.Tags.AddTagsTo(shadows, "added");
                this._editionTool.updateEditionTool();
            };
            LightTool.prototype._removeShadowGenerator = function () {
                var object = this.object = this._editionTool.object;
                var shadows = object.getShadowGenerator();
                if (shadows)
                    shadows.dispose();
                object._shadowGenerator = null;
                this.update();
            };
            return LightTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.LightTool = LightTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
