module BABYLON.EDITOR.EXTENSIONS {
    export interface IBotRoot {
        groups: IBotGroup[];
    }

    export interface IBotFunction {
        title: string;
    }

    export interface IBotGroup {
        title: string;
        functions: IBotFunction[];
    }

    interface ICosmosGalaxy {
        name: string;
        nodes: Mesh[];
        positionToRoot: Vector3;
        mesh: LinesMesh;
        sphereInstance: InstancedMesh;
    }

    export interface ICosmosConfiguration {
        distanceToRoot: number;
        distanceToFunction: number;
        heightFromRoot: number;
        functionsDistance: number;
        animationsDistance: number;
        sphereDiameter: number;
    }

    export class CosmosExtension implements IEditorExtension<ICosmosConfiguration> {
        // IEditorExtension members
        public extensionKey: string = "Cosmos";
        public applyEvenIfDataIsNull: boolean = false;

        // Public members
        public distanceToRoot: number = 1000;
        public distanceToFunction: number = 5;
        public heightFromRoot: number = 5;
        public functionsDistance: number = 1;
        public animationsDistance: number = 5;
        public sphereDiameter: number = 1;

        // Private members
        private _scene: Scene;
        
        private _galaxies: ICosmosGalaxy[] = [];
        private _sphereMesh: Mesh = null;
        private _cameraTarget: Mesh;

        // Static members
        public static _BotDatas: IBotRoot;

        /**
        * Constructor
        * @param scene: the Babylon.js scene
        */
        constructor(scene: Scene) {
            // Initialize
            this._scene = scene;

            // Load JSON
            // this._loadBotDatas((data) => this.apply(null));
        }

        // Applies the extension
        public apply(data: ICosmosConfiguration): void {
            if (data) {
                for (var thing in data)
                    this[thing] = data[thing];
            }

            this._sphereMesh = Mesh.CreateSphere("SphereRoot", 32, this.sphereDiameter, this._scene);
            this._sphereMesh.id = "root";

            this._cameraTarget = new Mesh("CameraTarget", this._scene);
            (<FreeCamera>this._scene.activeCamera).lockedTarget = this._cameraTarget;

            var names: string[] = [];
            for (var i = 0; i < CosmosExtension._BotDatas.groups.length; i++)
                names.push(CosmosExtension._BotDatas.groups[i].title);

            var root = this._createCosmosGalaxy("CosmosRootLinesMesh", Vector3.Zero(), names, 1, false);
            this._galaxies.push(root);

            for (var i = 0; i < CosmosExtension._BotDatas.groups.length; i++) {
                var group = CosmosExtension._BotDatas.groups[i];

                names = [];
                for (var j = 0; j < group.functions.length; j++)
                    names.push(group.functions[j].title);

                var func = this._createCosmosGalaxy(group.title, root.nodes[i].position.clone(), names, this.functionsDistance, true);

                this._galaxies.push(func);
            }

            // Play root animation
            this.animateCameraToId("root");
        }

        // Resets the scene and galaxies
        // Disposes everything
        public reset(): void {
            if (this._sphereMesh)
                this._sphereMesh.dispose();

            if (this._cameraTarget) {
                (<FreeCamera>this._scene.activeCamera).lockedTarget = null;
                this._cameraTarget.dispose();
            }

            for (var i = 0; i < this._galaxies.length; i++) {
                for (var j = 0; j < this._galaxies[i].nodes.length; j++)
                    this._galaxies[i].nodes[j].dispose();

                if (this._galaxies[i].mesh)
                    this._galaxies[i].mesh.dispose();

                this._galaxies[i].mesh = null;
                this._galaxies[i].nodes = [];
                this._galaxies[i].positionToRoot = null;
            }

            this._galaxies = [];
        }

        // Updates the lines meshes
        // Should be called only when rendering the scene
        public updateMeshes(): void {
            for (var i = 0; i < this._galaxies.length; i++) {
                var galaxy = this._galaxies[i];
                var positions: Vector3[] = [galaxy.positionToRoot.clone()];

                for (var j = 0; j < galaxy.nodes.length; j++) {
                    var node = galaxy.nodes[j];

                    positions.push(node.position.clone());
                    positions.push(galaxy.positionToRoot.clone());
                }

                galaxy.mesh = Mesh.CreateLines(galaxy.name, positions, this._scene, true, galaxy.mesh);

                if (!galaxy.sphereInstance) {
                    galaxy.sphereInstance = this._sphereMesh.createInstance("SphereInstance" + i + "_" + j);
                    galaxy.sphereInstance.position = galaxy.positionToRoot.clone();
                }
            }
        }

        // Animate the camera to Id
        public animateCameraToId(id: string): void {
            for (var i = 0; i < this._scene.meshes.length; i++) {
                if (this._scene.meshes[i].id === id) {
                    var vector = this._scene.meshes[i].position;

                    // Create animation
                    var easingFunction = new SineEase();
                    easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

                    var positionAnimation = new Animation("PositionAnimation", "position", 24, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
                    positionAnimation.setEasingFunction(easingFunction);
                    positionAnimation.setKeys([
                        { frame: 0, value: this._scene.activeCamera.position },
                        { frame: 24, value: vector.add(new Vector3(15, 15, 15)) }
                    ]);

                    var targetAnimation = new Animation("PositionAnimation", "position", 12, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
                    targetAnimation.setEasingFunction(easingFunction);
                    targetAnimation.setKeys([
                        { frame: 0, value: (<FreeCamera>this._scene.activeCamera).getTarget() },
                        { frame: 24, value: vector }
                    ]);

                    this._scene.activeCamera.animations.push(positionAnimation);
                    this._cameraTarget.animations.push(targetAnimation);

                    this._scene.beginAnimation(this._scene.activeCamera, 0, 24, false, 1.0);
                    this._scene.beginAnimation(this._cameraTarget, 0, 24, false, 1.0);

                    break;
                }
            }
        }

        // Creates a line mesh and generated positions
        private _createCosmosGalaxy(name: string, rootPosition: Vector3, names: string[], distance: number, animate: boolean): ICosmosGalaxy {
            // Galaxy
            var galaxy: ICosmosGalaxy = {
                name: name,
                nodes: [],
                positionToRoot: rootPosition,
                mesh: null,
                sphereInstance: null
            };

            // For each element
            var inverse = 1.0;

            for (var i = 0; i < names.length; i++) {
                var radian = (i * Math.PI * 2) / names.length;

                var vector = new Vector3(
                    (this._galaxies.length ? this.distanceToFunction : this.distanceToRoot) * Math.cos(radian),
                    ((this.heightFromRoot + this.distanceToFunction) / 2) * Math.random() * inverse,
                    (this._galaxies.length ? this.distanceToFunction : this.distanceToRoot) * Math.sin(radian))
                .add(rootPosition);
                vector = vector.multiply(new Vector3(distance, distance, distance));

                // Create animated node
                var animatedNode: Mesh = null;

                if (animate) {
                    animatedNode = Mesh.CreatePlane(name + "_animatedMesh_" + i, 5, this._scene);
                    animatedNode.billboardMode = Mesh.BILLBOARDMODE_ALL;

                    var texture = new DynamicTexture(name + "_animatedMeshTexture_" + i, { width: 1024, height: 1024 }, this._scene, true);
                    texture.drawText(names[i], null, 512, "bold 60px verdana", "white", "transparent");
                    texture.hasAlpha = true;
                    texture.update(true);

                    var material = new StandardMaterial(name + "_animatedMeshMaterial_" + i, this._scene);
                    material.diffuseTexture = texture;
                    animatedNode.material = material;
                }
                else
                    animatedNode = new Mesh(name + "_animatedMesh_" + i, this._scene);

                animatedNode.id = names[i];
                animatedNode.position = vector;

                galaxy.nodes.push(animatedNode);

                // Create animation
                if (animate) {
                    var easingFunction = new SineEase();
                    easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

                    var animation = new Animation(name + "_animation_" + i, "position", 24, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
                    animation.setEasingFunction(easingFunction);

                    var keys = [];
                    for (var j = 0; j < 4; j++) { // Keys
                        keys.push({
                            frame: j,
                            value: new Vector3(vector.x + Math.random() * this.animationsDistance, vector.y + Math.random() * this.animationsDistance, vector.z + Math.random() * this.animationsDistance)
                        });
                    }

                    keys.push({ frame: 4, value: keys[0].value.clone() });
                    animation.setKeys(keys);

                    animatedNode.animations.push(animation);

                    this._scene.beginAnimation(animatedNode, 0, 4, true, 0.01);
                }

                // Finalize element
                inverse *= -1;
            }

            return galaxy;
        }

        // Loads the bot datas
        private _loadBotDatas(callback: (data: IBotRoot) => void): void {
            if (CosmosExtension._BotDatas)
                callback(CosmosExtension._BotDatas);
            else {
                BABYLON.Tools.LoadFile("website/resources/bot.json", (data: string) => {
                    CosmosExtension._BotDatas = JSON.parse(data);
                    callback(CosmosExtension._BotDatas);
                });
            }
        }
    }

    EditorExtension.RegisterExtension(CosmosExtension);
}
