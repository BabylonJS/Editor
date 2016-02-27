module BABYLON.EDITOR {
    export class Exporter {
        // public members
        public core: EditorCore;

        // private members
        private _window: GUI.GUIWindow = null;
        private _editor: AceAjax.Editor = null;

        private _editorID: string = "BABYLON-EDITOR-EXPORT-WINDOW-EDITOR";

        private _generatedCode: string = "";

        /**
        * Constructor
        */
        constructor(core: EditorCore) {
            // Initialize
            this.core = core;
        }

        // Opens the scene exporter
        public openSceneExporter(babylonScene?: boolean): void {
            // Create window
            var windowBody = GUI.GUIElement.CreateDivElement(this._editorID, "width: 100%; height: 100%");

            this._window = new GUI.GUIWindow("WindowExport", this.core, "Export Project", windowBody);
            this._window.buildElement(null);

            this._window.onToggle = (maximized: boolean, width: number, height: number) => {
                this._editor.resize();
            };

            // Create ace editor
            this._editor = ace.edit(this._editorID);
            this._editor.setTheme("ace/theme/clouds");
            this._editor.getSession().setMode("ace/mode/javascript");

            // Finish
            this._generatedCode = this.generateCode(babylonScene);
        }

        // Generates the code
        public generateCode(babylonScene?: boolean): string {
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

                finalString = ProjectExporter.ExportProject(this.core, true);
            }

            if (this._editor) {
                this._editor.setValue(finalString, -1);

                if (!babylonScene)
                    this._editor.getSession().setUseWrapMode(false);
            }

            return finalString;
        }

        // Exports the code
        public static ExportCode(core: EditorCore): string {
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
        }

        // Export the scene values
        public _exportSceneValues(): string {
            // Common values
            var finalString = "\n" +
                "\tif (BABYLON.EDITOR) {\n" +
                "\t    BABYLON.EDITOR.SceneFactory.AnimationSpeed = " + SceneFactory.AnimationSpeed + ";\n";

            for (var i = 0; i < SceneFactory.NodesToStart.length; i++) {
                var node: any = SceneFactory.NodesToStart[i];

                if (node instanceof Scene)
                    finalString += "\t    BABYLON.EDITOR.SceneFactory.NodesToStart.push(scene);\n";
                else
                    finalString += "\t    BABYLON.EDITOR.SceneFactory.NodesToStart.push(scene.getNodeByName(\"" + node.name + "\"));\n";
            }

            finalString += "\t}\n";
            finalString += "\telse {\n"

            for (var i = 0; i < SceneFactory.NodesToStart.length; i++) {
                var node: any = SceneFactory.NodesToStart[i];

                if (node instanceof Scene)
                    finalString += "\t    scene.beginAnimation(scene, 0, Number.MAX_VALUE, false, " + SceneFactory.AnimationSpeed + "); \n";
                else
                    finalString += "\t    scene.beginAnimation(scene.getNodeByName(\"" + node.name + "\"), 0, Number.MAX_VALUE, false, " + SceneFactory.AnimationSpeed + ");\n";
            }

            finalString += "\t}\n";

            return finalString;
        }

        // Export scene
        public _exportScene(): string {
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
                else if (value instanceof Color3) {
                    result += this._exportColor3(value);
                }
                else
                    continue;

                finalString += "\tscene." + thing + " = " + result + ";\n";
            }

            var animations = (<any>scene).animations;

            if (animations && animations.length > 0) {
                finalString += "\tscene.animations = [];\n";
                finalString += "\tnode = scene;\n";
                finalString += this._exportAnimations(<any>scene);
            }

            return finalString;
        }
        
        // Export reflection probes
        public _exportReflectionProbes(): string {
            var scene = this.core.currentScene;

            var finalString = "\t// Export reflection probes\n";
            finalString += "\tvar reflectionProbe = null;";

            var t = new ReflectionProbe("", 512, scene, false);

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
        }

        // Export node's transformation
        public _exportNodeTransform(node: any): string {
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
        }

        // Returns a BaseTexture from its name
        public _getTextureByName(name: string, scene: Scene): BaseTexture {
            // "this" is forbidden since this code is exported directly
            for (var i = 0; i < scene.textures.length; i++) {
                var texture = scene.textures[i];
                
                if (texture.name === name) {
                    return texture;
                }
            }

            return null;
        }

        // Exports the post-processes
        public _exportPostProcesses(): string {
            var finalString = "";

            if (SceneFactory.HDRPipeline) {
                finalString +=
                    "\tvar ratio = {\n" +
                    "\t    finalRatio: 1.0,\n" +
                    "\t    blurRatio: 0.5\n" +
                    "\t};\n";

                finalString +=
                    "\tvar hdr = new BABYLON.HDRRenderingPipeline(\"hdr\", scene, ratio, null, scene.cameras, new BABYLON.Texture(\"Textures/lensdirt.jpg\", scene));\n" +
                    "\thdr.exposureAdjustment = " + (<any>SceneFactory.HDRPipeline).exposureAdjustment + ";\n" +
                    "\thdr.brightThreshold = " + SceneFactory.HDRPipeline.brightThreshold + ";\n" +
                    "\thdr.gaussCoeff = " + SceneFactory.HDRPipeline.gaussCoeff + ";\n" +
                    "\thdr.gaussMean = " + SceneFactory.HDRPipeline.gaussMean + ";\n" +
                    "\thdr.gaussStandDev = " + SceneFactory.HDRPipeline.gaussStandDev + ";\n" +
                    "\thdr.minimumLuminance = " + SceneFactory.HDRPipeline.minimumLuminance + ";\n" +
                    "\thdr.luminanceDecreaseRate = " + SceneFactory.HDRPipeline.luminanceDecreaseRate + ";\n" +
                    "\thdr.luminanceIncreaserate = " + SceneFactory.HDRPipeline.luminanceIncreaserate + ";\n" +
                    "\thdr.exposure = " + SceneFactory.HDRPipeline.exposure + ";\n" +
                    "\thdr.gaussMultiplier = " + SceneFactory.HDRPipeline.gaussMultiplier + ";\n";

                finalString +=
                    "\tif (BABYLON.EDITOR) {\n" +
                    "\t    BABYLON.EDITOR.SceneFactory.HDRPipeline = hdr;\n" +
                    "\t}\n";
            }

            return finalString;
        }

        // Export node's animations
        public _exportAnimations(node: IAnimatable): string {
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

                    if (value instanceof Vector3) {
                        result = this._exportVector3(value);
                    }
                    else if (value instanceof Vector2) {
                        result = this._exportVector2(value);
                    }
                    else if (value instanceof Color3) {
                        result = this._exportColor3(value);
                    }

                    finalString += "\tkeys.push({ frame: " + keys[j].frame + ", value: " + result + " });\n";
                }

                finalString += "\tanimation.setKeys(keys);\n";
                finalString += "\tnode.animations.push(animation);\n";
            }

            return finalString;
        }

        // Export node's material
        public _exportNodeMaterial(node: AbstractMesh | SubMesh, subMeshId?: number): string {
            var material: Material = null;

            //node.material;
            if (node instanceof AbstractMesh) {
                material = node.material;
            }
            else if (node instanceof SubMesh) {
                material = node.getMaterial();
            }

            var isStandard = material instanceof StandardMaterial;

            if (!material || (isStandard && !BABYLON.Tags.HasTags(material)))
                return "";

            var finalString = "\n";

            // Set constructor
            var materialString = "\tnode.material";
            if (node instanceof SubMesh) {
                materialString = "\tnode.material.subMaterials[" + subMeshId + "]";
            }

            if (material instanceof StandardMaterial) {
                //finalString += materialString + " = new BABYLON.StandardMaterial(\"" + material.name + "\", scene);\n";
            }
            else if (material instanceof PBRMaterial) {
                finalString += materialString + " =  new BABYLON.PBRMaterial(\"" + material.name + "\", scene);\n";
            }
            else if (material instanceof SkyMaterial) {
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
                else if (value instanceof Vector3) {
                    result += this._exportVector3(value);
                }
                else if (value instanceof Vector2) {
                    result += this._exportVector2(value);
                }
                else if (value instanceof Color3) {
                    result += this._exportColor3(value);
                }
                else if (value instanceof Color4) {
                    result += this._exportColor4(value);
                }
                else if (value instanceof BaseTexture) {
                    result += "getTextureByName(\"" + value.name + "\", scene);";
                }
                else
                    continue;

                if (node instanceof AbstractMesh) {
                    finalString += "\tnode.material." + thing + " = " + result + ";\n";
                }
                else if (node instanceof SubMesh) {
                    finalString += "\tnode.material.subMaterials[" + subMeshId + "]." + thing + " = " + result + ";\n";
                }
            }

            return finalString + "\n";
        }

        public _exportSky(node: Node): string {
            var finalString = "\tnode = BABYLON.Mesh.CreateBox(\"" + node.name + "\", 1000, scene);\n";
            return finalString;
        }

        public _exportParticleSystem(particleSystem: ParticleSystem): string {
            var node = particleSystem.emitter;

            var finalString = "";

            if (!node.geometry)
                finalString = "\tnode = new BABYLON.Mesh(\"" + node.name + "\", scene, null, null, true);\n";
            else
                finalString = "\tnode = scene.getMeshByName(\"" + node.name + "\");\n";

            finalString += "\tparticleSystem = new BABYLON.ParticleSystem(\"" + particleSystem.name + "\", " + particleSystem.getCapacity() + ", scene);\n"
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
                else if (value instanceof Vector3) {
                    result = this._exportVector3(value);
                }
                else if (value instanceof Color4) {
                    result += this._exportColor4(value);
                }
                else if (value instanceof Color3) {
                    result += this._exportColor3(value);
                }
                else if (value instanceof Texture) {
                    result += "BABYLON.Texture.CreateFromBase64String(\"" + value._buffer + "\", \"" + value.name + "\", scene)";
                }
                else
                    continue;

                finalString += "\tparticleSystem." + thing + " = " + result + ";\n";
            }

            finalString += "\tnode.attachedParticleSystem = particleSystem;\n";

            if (!(<any>particleSystem)._stopped)
                finalString += "\tparticleSystem.start();\n";

            return finalString;
        }

        // Exports a light
        public _exportLight(light: Light): string {
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
                else if (value instanceof Vector3) {
                    result += this._exportVector3(value);
                }
                else if (value instanceof Vector2) {
                    result += this._exportVector2(value);
                }
                else if (value instanceof Color3) {
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
        }

        // Exports a BABYLON.Vector2
        public _exportVector2(vector: Vector2): string {
            return "new BABYLON.Vector2(" + vector.x + ", " + vector.y + ")";
        }

        // Exports a BABYLON.Vector3
        public _exportVector3(vector: Vector3): string {
            return "new BABYLON.Vector3(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
        }

        // Exports a BABYLON.Quaternion
        public _exportQuaternion(quaternion: Quaternion): string {
            return "new BABYLON.Quaternion(" + quaternion.x + ", " + quaternion.y + ", " + quaternion.z + ", " + quaternion.w + ")";
        }

        // Exports a BABYLON.Color3
        public _exportColor3(color: Color3): string {
            return "new BABYLON.Color3(" + color.r + ", " + color.g + ", " + color.b + ")";
        }

        // Exports a BABYLON.Color4
        public _exportColor4(color: Color4): string {
            return "new BABYLON.Color4(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")";
        }

        // Traverses nodes
        private _traverseNodes(node?: Node): string {
            var scene = this.core.currentScene;

            if (!node) {
                var rootNodes: Node[] = [];
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

                if (node.id.indexOf(EditorMain.DummyNodeID) === -1 && node !== this.core.camera) {
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
                        if (node instanceof Mesh && node.material instanceof SkyMaterial) {
                            finalString += "\n" + this._exportSky(node);
                            foundSky = true;
                        }
                    }

                    if (!foundSky)
                        finalString += "\tnode = scene.getNodeByName(\"" + node.name + "\");\n";

                    // Transformation
                    if (foundParticleSystems || foundSky)
                        finalString += this._exportNodeTransform(node);

                    if (node instanceof AbstractMesh) {
                        // Material
                        if (node.material instanceof MultiMaterial) {
                            for (var i = 0; i < node.subMeshes.length; i++) {
                                finalString += this._exportNodeMaterial(node.subMeshes[i], i);
                            }
                        } else {
                            finalString += this._exportNodeMaterial(node);
                        }
                    }
                    else if (node instanceof Light) {
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
        }

        // Fills array of root nodes
        private _fillRootNodes(data: Node[], propertyPath: string): void {
            var scene = this.core.currentScene;
            var nodes: Node[] = scene[propertyPath];

            for (var i = 0; i < nodes.length; i++) {
                if (!nodes[i].parent)
                    data.push(nodes[i]);
            }
        }
    }
}