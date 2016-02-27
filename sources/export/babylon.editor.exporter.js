var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Exporter = (function () {
            /**
            * Constructor
            */
            function Exporter(core) {
                // private members
                this._window = null;
                this._editor = null;
                this._editorID = "BABYLON-EDITOR-EXPORT-WINDOW-EDITOR";
                this._generatedCode = "";
                // Initialize
                this.core = core;
            }
            // Opens the scene exporter
            Exporter.prototype.openSceneExporter = function (babylonScene) {
                var _this = this;
                // Create window
                var windowBody = EDITOR.GUI.GUIElement.CreateDivElement(this._editorID, "width: 100%; height: 100%");
                this._window = new EDITOR.GUI.GUIWindow("WindowExport", this.core, "Export Project", windowBody);
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    _this._editor.resize();
                };
                // Create ace editor
                this._editor = ace.edit(this._editorID);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                // Finish
                this._generatedCode = this.generateCode(babylonScene);
            };
            // Generates the code
            Exporter.prototype.generateCode = function (babylonScene) {
                var scene = this.core.currentScene;
                var finalString = "";
                if (babylonScene) {
                    var obj = BABYLON.SceneSerializer.Serialize(this.core.currentScene);
                    finalString = JSON.stringify(obj, null, "\t");
                }
                else {
                    /*
                    finalString = [
                        "var getTextureByName = " + this._getTextureByName + "\n",
                        "function CreateBabylonScene(scene) {",
                        "\tvar engine = scene.getEngine();",
                        "\tvar node = null;",
                        "\tvar animation = null;",
                        "\tvar keys = null;",
                        "\tvar particleSystem = null;\n",
                        this._exportPostProcesses(),
                        this._exportScene(),
                        this._exportReflectionProbes(),
                        this._traverseNodes(),
                        this._exportSceneValues(),
                        "}\n"
                    ].join("\n");
                    */
                    finalString = EDITOR.ProjectExporter.ExportProject(this.core, true);
                }
                if (this._editor) {
                    this._editor.setValue(finalString, -1);
                    if (!babylonScene)
                        this._editor.getSession().setUseWrapMode(false);
                }
                return finalString;
            };
            // Exports the code
            Exporter.ExportCode = function (core) {
                var exporter = new Exporter(core);
                var finalString = [
                    "var getTextureByName = " + exporter._getTextureByName + "\n",
                    "function CreateBabylonScene(scene) {",
                    "\tvar engine = scene.getEngine();",
                    "\tvar node = null;",
                    "\tvar animation = null;",
                    "\tvar keys = null;",
                    "\tvar particleSystem = null;\n",
                    exporter._exportPostProcesses(),
                    exporter._exportScene(),
                    exporter._exportReflectionProbes(),
                    exporter._traverseNodes(),
                    exporter._exportSceneValues(),
                    "}\n"
                ].join("\n");
                return finalString;
            };
            // Export the scene values
            Exporter.prototype._exportSceneValues = function () {
                // Common values
                var finalString = "\n" +
                    "\tif (BABYLON.EDITOR) {\n" +
                    "\t    BABYLON.EDITOR.SceneFactory.AnimationSpeed = " + EDITOR.SceneFactory.AnimationSpeed + ";\n";
                for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                    var node = EDITOR.SceneFactory.NodesToStart[i];
                    if (node instanceof BABYLON.Scene)
                        finalString += "\t    BABYLON.EDITOR.SceneFactory.NodesToStart.push(scene);\n";
                    else
                        finalString += "\t    BABYLON.EDITOR.SceneFactory.NodesToStart.push(scene.getNodeByName(\"" + node.name + "\"));\n";
                }
                finalString += "\t}\n";
                finalString += "\telse {\n";
                for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                    var node = EDITOR.SceneFactory.NodesToStart[i];
                    if (node instanceof BABYLON.Scene)
                        finalString += "\t    scene.beginAnimation(scene, 0, Number.MAX_VALUE, false, " + EDITOR.SceneFactory.AnimationSpeed + "); \n";
                    else
                        finalString += "\t    scene.beginAnimation(scene.getNodeByName(\"" + node.name + "\"), 0, Number.MAX_VALUE, false, " + EDITOR.SceneFactory.AnimationSpeed + ");\n";
                }
                finalString += "\t}\n";
                return finalString;
            };
            // Export scene
            Exporter.prototype._exportScene = function () {
                var scene = this.core.currentScene;
                var finalString = "\n\t// Export scene\n";
                // Set values
                for (var thing in scene) {
                    var value = scene[thing];
                    var result = "";
                    if (thing[0] === "_")
                        continue;
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else
                        continue;
                    finalString += "\tscene." + thing + " = " + result + ";\n";
                }
                var animations = scene.animations;
                if (animations && animations.length > 0) {
                    finalString += "\tscene.animations = [];\n";
                    finalString += "\tnode = scene;\n";
                    finalString += this._exportAnimations(scene);
                }
                return finalString;
            };
            // Export reflection probes
            Exporter.prototype._exportReflectionProbes = function () {
                var scene = this.core.currentScene;
                var finalString = "\t// Export reflection probes\n";
                finalString += "\tvar reflectionProbe = null;";
                var t = new BABYLON.ReflectionProbe("", 512, scene, false);
                for (var i = 0; i < scene.reflectionProbes.length; i++) {
                    var rp = scene.reflectionProbes[i];
                    var texture = rp.cubeTexture;
                    if (rp.name === "")
                        continue;
                    finalString += "\treflectionProbe = new BABYLON.ReflectionProbe(\"" + rp.name + "\", " + texture.getSize().width + ", scene, " + texture._generateMipMaps + ");\n";
                    // Render list
                    for (var j = 0; j < rp.renderList.length; j++) {
                        var node = rp.renderList[j];
                        finalString += "\treflectionProbe.renderList.push(scene.getNodeByName(\"" + node.name + "\"));\n";
                    }
                }
                return finalString;
            };
            // Export node's transformation
            Exporter.prototype._exportNodeTransform = function (node) {
                var finalString = "";
                if (node.position) {
                    finalString += "\tnode.position = " + this._exportVector3(node.position) + ";\n";
                }
                if (node.rotation) {
                    finalString += "\tnode.rotation = " + this._exportVector3(node.rotation) + ";\n";
                }
                if (node.rotationQuaternion) {
                    finalString += "\tnode.rotationQuaternion = " + this._exportQuaternion(node.rotationQuaternion) + ";\n";
                }
                if (node.scaling) {
                    finalString += "\tnode.scaling = " + this._exportVector3(node.scaling) + ";\n";
                }
                return finalString;
            };
            // Returns a BaseTexture from its name
            Exporter.prototype._getTextureByName = function (name, scene) {
                // "this" is forbidden since this code is exported directly
                for (var i = 0; i < scene.textures.length; i++) {
                    var texture = scene.textures[i];
                    if (texture.name === name) {
                        return texture;
                    }
                }
                return null;
            };
            // Exports the post-processes
            Exporter.prototype._exportPostProcesses = function () {
                var finalString = "";
                if (EDITOR.SceneFactory.HDRPipeline) {
                    finalString +=
                        "\tvar ratio = {\n" +
                            "\t    finalRatio: 1.0,\n" +
                            "\t    blurRatio: 0.5\n" +
                            "\t};\n";
                    finalString +=
                        "\tvar hdr = new BABYLON.HDRRenderingPipeline(\"hdr\", scene, ratio, null, scene.cameras, new BABYLON.Texture(\"Textures/lensdirt.jpg\", scene));\n" +
                            "\thdr.exposureAdjustment = " + EDITOR.SceneFactory.HDRPipeline.exposureAdjustment + ";\n" +
                            "\thdr.brightThreshold = " + EDITOR.SceneFactory.HDRPipeline.brightThreshold + ";\n" +
                            "\thdr.gaussCoeff = " + EDITOR.SceneFactory.HDRPipeline.gaussCoeff + ";\n" +
                            "\thdr.gaussMean = " + EDITOR.SceneFactory.HDRPipeline.gaussMean + ";\n" +
                            "\thdr.gaussStandDev = " + EDITOR.SceneFactory.HDRPipeline.gaussStandDev + ";\n" +
                            "\thdr.minimumLuminance = " + EDITOR.SceneFactory.HDRPipeline.minimumLuminance + ";\n" +
                            "\thdr.luminanceDecreaseRate = " + EDITOR.SceneFactory.HDRPipeline.luminanceDecreaseRate + ";\n" +
                            "\thdr.luminanceIncreaserate = " + EDITOR.SceneFactory.HDRPipeline.luminanceIncreaserate + ";\n" +
                            "\thdr.exposure = " + EDITOR.SceneFactory.HDRPipeline.exposure + ";\n" +
                            "\thdr.gaussMultiplier = " + EDITOR.SceneFactory.HDRPipeline.gaussMultiplier + ";\n";
                    finalString +=
                        "\tif (BABYLON.EDITOR) {\n" +
                            "\t    BABYLON.EDITOR.SceneFactory.HDRPipeline = hdr;\n" +
                            "\t}\n";
                }
                return finalString;
            };
            // Export node's animations
            Exporter.prototype._exportAnimations = function (node) {
                var finalString = "\n";
                for (var i = 0; i < node.animations.length; i++) {
                    var anim = node.animations[i];
                    // Check tags here
                    // ....
                    if (!BABYLON.Tags.HasTags(anim) || !BABYLON.Tags.MatchesQuery(anim, "modified"))
                        continue;
                    var keys = anim.getKeys();
                    finalString += "\tkeys = [];\n";
                    finalString += "\tanimation = new BABYLON.Animation(\"" + anim.name + "\", \"" + anim.targetPropertyPath.join(".") + "\", " + anim.framePerSecond + ", " + anim.dataType + ", " + anim.loopMode + "); \n";
                    finalString += "\tBABYLON.Tags.AddTagsTo(animation, \"modified\");\n";
                    if (!keys)
                        continue;
                    for (var j = 0; j < keys.length; j++) {
                        var value = keys[j].value;
                        var result = value.toString();
                        if (value instanceof BABYLON.Vector3) {
                            result = this._exportVector3(value);
                        }
                        else if (value instanceof BABYLON.Vector2) {
                            result = this._exportVector2(value);
                        }
                        else if (value instanceof BABYLON.Color3) {
                            result = this._exportColor3(value);
                        }
                        finalString += "\tkeys.push({ frame: " + keys[j].frame + ", value: " + result + " });\n";
                    }
                    finalString += "\tanimation.setKeys(keys);\n";
                    finalString += "\tnode.animations.push(animation);\n";
                }
                return finalString;
            };
            // Export node's material
            Exporter.prototype._exportNodeMaterial = function (node, subMeshId) {
                var material = null;
                //node.material;
                if (node instanceof BABYLON.AbstractMesh) {
                    material = node.material;
                }
                else if (node instanceof BABYLON.SubMesh) {
                    material = node.getMaterial();
                }
                var isStandard = material instanceof BABYLON.StandardMaterial;
                if (!material || (isStandard && !BABYLON.Tags.HasTags(material)))
                    return "";
                var finalString = "\n";
                // Set constructor
                var materialString = "\tnode.material";
                if (node instanceof BABYLON.SubMesh) {
                    materialString = "\tnode.material.subMaterials[" + subMeshId + "]";
                }
                if (material instanceof BABYLON.StandardMaterial) {
                }
                else if (material instanceof BABYLON.PBRMaterial) {
                    finalString += materialString + " =  new BABYLON.PBRMaterial(\"" + material.name + "\", scene);\n";
                }
                else if (material instanceof BABYLON.SkyMaterial) {
                    finalString += materialString + " =  new BABYLON.SkyMaterial(\"" + material.name + "\", scene);\n";
                }
                // Set values
                for (var thing in material) {
                    var value = material[thing];
                    var result = "";
                    if (thing[0] === "_" || value === null)
                        continue;
                    if (isStandard && !BABYLON.Tags.MatchesQuery(material, thing))
                        continue;
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result += this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Vector2) {
                        result += this._exportVector2(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else if (value instanceof BABYLON.Color4) {
                        result += this._exportColor4(value);
                    }
                    else if (value instanceof BABYLON.BaseTexture) {
                        result += "getTextureByName(\"" + value.name + "\", scene);";
                    }
                    else
                        continue;
                    if (node instanceof BABYLON.AbstractMesh) {
                        finalString += "\tnode.material." + thing + " = " + result + ";\n";
                    }
                    else if (node instanceof BABYLON.SubMesh) {
                        finalString += "\tnode.material.subMaterials[" + subMeshId + "]." + thing + " = " + result + ";\n";
                    }
                }
                return finalString + "\n";
            };
            Exporter.prototype._exportSky = function (node) {
                var finalString = "\tnode = BABYLON.Mesh.CreateBox(\"" + node.name + "\", 1000, scene);\n";
                return finalString;
            };
            Exporter.prototype._exportParticleSystem = function (particleSystem) {
                var node = particleSystem.emitter;
                var finalString = "";
                if (!node.geometry)
                    finalString = "\tnode = new BABYLON.Mesh(\"" + node.name + "\", scene, null, null, true);\n";
                else
                    finalString = "\tnode = scene.getMeshByName(\"" + node.name + "\");\n";
                finalString += "\tparticleSystem = new BABYLON.ParticleSystem(\"" + particleSystem.name + "\", " + particleSystem.getCapacity() + ", scene);\n";
                finalString += "\tparticleSystem.emitter = node;\n";
                for (var thing in particleSystem) {
                    if (thing[0] === "_")
                        continue;
                    var value = particleSystem[thing];
                    var result = "";
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (typeof value === "string") {
                        result += "\"" + value + "\"";
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result = this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Color4) {
                        result += this._exportColor4(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else if (value instanceof BABYLON.Texture) {
                        result += "BABYLON.Texture.CreateFromBase64String(\"" + value._buffer + "\", \"" + value.name + "\", scene)";
                    }
                    else
                        continue;
                    finalString += "\tparticleSystem." + thing + " = " + result + ";\n";
                }
                finalString += "\tnode.attachedParticleSystem = particleSystem;\n";
                if (!particleSystem._stopped)
                    finalString += "\tparticleSystem.start();\n";
                return finalString;
            };
            // Exports a light
            Exporter.prototype._exportLight = function (light) {
                var finalString = "";
                var shadows = light.getShadowGenerator();
                if (!shadows)
                    return finalString;
                for (var thing in light) {
                    if (thing[0] === "_")
                        continue;
                    var value = light[thing];
                    var result = "";
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (typeof value === "string") {
                        result += "\"" + value + "\"";
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result += this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Vector2) {
                        result += this._exportVector2(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else
                        continue;
                    finalString += "\tnode." + thing + " = " + result + ";\n";
                }
                finalString += "\n";
                // Shadow generator
                var shadowsGenerator = light.getShadowGenerator();
                if (!shadowsGenerator)
                    return finalString;
                var serializationObject = shadowsGenerator.serialize();
                finalString +=
                    "\tvar shadowGenerator = node.getShadowGenerator();\n"
                        + "\tif (!shadowGenerator) {\n" // Do not create another
                        + "\t\tshadowGenerator = new BABYLON.ShadowGenerator(" + serializationObject.mapSize + ", node);\n";
                for (var i = 0; i < serializationObject.renderList.length; i++) {
                    var mesh = serializationObject.renderList[i];
                    finalString += "\t\tshadowGenerator.getShadowMap().renderList.push(scene.getMeshByID(\"" + mesh + "\"));\n";
                }
                finalString += "\t}\n";
                for (var thing in shadowsGenerator) {
                    if (thing[0] === "_")
                        continue;
                    var value = shadowsGenerator[thing];
                    var result = "";
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (typeof value === "string") {
                        result += "\"" + value + "\"";
                    }
                    else
                        continue;
                    finalString += "\tshadowGenerator." + thing + " = " + result + ";\n";
                }
                return finalString;
            };
            // Exports a BABYLON.Vector2
            Exporter.prototype._exportVector2 = function (vector) {
                return "new BABYLON.Vector2(" + vector.x + ", " + vector.y + ")";
            };
            // Exports a BABYLON.Vector3
            Exporter.prototype._exportVector3 = function (vector) {
                return "new BABYLON.Vector3(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
            };
            // Exports a BABYLON.Quaternion
            Exporter.prototype._exportQuaternion = function (quaternion) {
                return "new BABYLON.Quaternion(" + quaternion.x + ", " + quaternion.y + ", " + quaternion.z + ", " + quaternion.w + ")";
            };
            // Exports a BABYLON.Color3
            Exporter.prototype._exportColor3 = function (color) {
                return "new BABYLON.Color3(" + color.r + ", " + color.g + ", " + color.b + ")";
            };
            // Exports a BABYLON.Color4
            Exporter.prototype._exportColor4 = function (color) {
                return "new BABYLON.Color4(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")";
            };
            // Traverses nodes
            Exporter.prototype._traverseNodes = function (node) {
                var scene = this.core.currentScene;
                if (!node) {
                    var rootNodes = [];
                    var finalString = "";
                    this._fillRootNodes(rootNodes, "lights");
                    this._fillRootNodes(rootNodes, "cameras");
                    this._fillRootNodes(rootNodes, "meshes");
                    for (var i = 0; i < rootNodes.length; i++) {
                        finalString += this._traverseNodes(rootNodes[i]);
                    }
                    return finalString;
                }
                else {
                    var finalString = "";
                    if (node.id.indexOf(EDITOR.EditorMain.DummyNodeID) === -1 && node !== this.core.camera) {
                        finalString = "\t// Configure node " + node.name + "\n";
                        var foundParticleSystems = false;
                        for (var i = 0; i < scene.particleSystems.length; i++) {
                            var ps = scene.particleSystems[i];
                            if (ps.emitter === node) {
                                finalString += "\n" + this._exportParticleSystem(ps);
                                foundParticleSystems = true;
                            }
                        }
                        var foundSky = false;
                        if (!foundParticleSystems) {
                            if (node instanceof BABYLON.Mesh && node.material instanceof BABYLON.SkyMaterial) {
                                finalString += "\n" + this._exportSky(node);
                                foundSky = true;
                            }
                        }
                        if (!foundSky)
                            finalString += "\tnode = scene.getNodeByName(\"" + node.name + "\");\n";
                        // Transformation
                        if (foundParticleSystems || foundSky)
                            finalString += this._exportNodeTransform(node);
                        if (node instanceof BABYLON.AbstractMesh) {
                            // Material
                            if (node.material instanceof BABYLON.MultiMaterial) {
                                for (var i = 0; i < node.subMeshes.length; i++) {
                                    finalString += this._exportNodeMaterial(node.subMeshes[i], i);
                                }
                            }
                            else {
                                finalString += this._exportNodeMaterial(node);
                            }
                        }
                        else if (node instanceof BABYLON.Light) {
                            finalString += this._exportLight(node);
                        }
                        if (node.animations.length > 0) {
                            finalString += this._exportAnimations(node);
                        }
                    }
                    for (var i = 0; i < node.getDescendants().length; i++) {
                        finalString += this._traverseNodes(node.getDescendants()[i]);
                    }
                    return finalString;
                }
            };
            // Fills array of root nodes
            Exporter.prototype._fillRootNodes = function (data, propertyPath) {
                var scene = this.core.currentScene;
                var nodes = scene[propertyPath];
                for (var i = 0; i < nodes.length; i++) {
                    if (!nodes[i].parent)
                        data.push(nodes[i]);
                }
            };
            return Exporter;
        })();
        EDITOR.Exporter = Exporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
