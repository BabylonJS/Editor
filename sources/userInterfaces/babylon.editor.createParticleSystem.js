var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUICreateParticleSystem = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function GUICreateParticleSystem(core, particleSystem, createUI) {
                var _this = this;
                if (createUI === void 0) { createUI = true; }
                // Public members
                this.core = null;
                // Private members
                this._window = null;
                this._layouts = null;
                this._leftPanel = null;
                this._layoutID = "BABYLON-EDITOR-CREATE-PARTICLE-SYSTEM";
                this._formTabID = this._layoutID + "TAB-UPDATE-FORM";
                this._editorTabID = this._layoutID + "TAB-UPDATE-EDITOR";
                this._editElement = null;
                this._editElementID = this._layoutID + "FORM";
                this._inputElementID = this._layoutID + "INPUT";
                this._editor = null;
                this._editorElementID = this._layoutID + "EDITOR";
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._particleSystem = null;
                this._particleSystemToEdit = null;
                // Initialize
                this.core = core;
                if (createUI) {
                    // UI
                    this._createUI();
                    // Scene
                    this._engine = new BABYLON.Engine(document.getElementById(this._layoutID + "CANVAS"));
                    this._scene = new BABYLON.Scene(this._engine);
                    this._camera = new BABYLON.ArcRotateCamera("Camera", 1, 1.3, 30, new BABYLON.Vector3(0, 0, 0), this._scene);
                    this._camera.attachControl(this._engine.getRenderingCanvas(), false);
                    this._engine.runRenderLoop(function () {
                        _this._scene.render();
                    });
                    this._particleSystem = GUICreateParticleSystem.CreateParticleSystem(this._scene, particleSystem.getCapacity(), particleSystem);
                    this._particleSystemToEdit = particleSystem;
                    // Finish
                    core.eventReceivers.push(this);
                    this._createEditor();
                }
                else {
                    // Assume that particleSystem isn't null
                    this._particleSystem = particleSystem;
                    this._scene = particleSystem._scene;
                }
            }
            // On event
            GUICreateParticleSystem.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === "Apply") {
                        this._setParticleSystem();
                        this._window.close();
                    }
                    else if (button === "Cancel") {
                        this._window.close();
                    }
                    return true;
                }
                else if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CHANGED) {
                    var panel = this._layouts.getPanelFromType("left");
                    if (event.guiEvent.caller !== this._leftPanel)
                        return false;
                    // Code here to change tab
                    var tabID = event.guiEvent.data;
                    var form = $("#" + this._layoutID + "FORM").hide();
                    var editor = $("#" + this._layoutID + "EDITOR").hide();
                    if (tabID === this._formTabID) {
                        form.show();
                    }
                    else if (tabID === this._editorTabID) {
                        editor.show();
                        var exporter = this.core.editor.exporter;
                        this._editor.setValue("var " + exporter._exportParticleSystem(this._particleSystemToEdit), -1);
                    }
                    return true;
                }
                return false;
            };
            // Creates the UI
            GUICreateParticleSystem.prototype._createUI = function () {
                var _this = this;
                // Window
                var layoutDiv = EDITOR.GUI.GUIElement.CreateDivElement(this._layoutID, "width: 100%; height: 100%;");
                this._window = new EDITOR.GUI.GUIWindow("EditParticleSystem", this.core, "Edit Particle System", layoutDiv, new BABYLON.Vector2(800, 600));
                this._window.modal = true;
                this._window.showMax = true;
                this._window.showClose = true;
                this._window.buttons = ["Apply", "Cancel"];
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    if (!maximized) {
                        width = _this._window.size.x;
                        height = _this._window.size.y;
                    }
                    _this._layouts.setPanelSize("left", width / 2);
                    _this._layouts.setPanelSize("main", width / 2);
                };
                this._window.on({ type: "open" }, function () {
                    _this._window.maximize();
                });
                this._window.setOnCloseCallback(function () {
                    _this._window.destroy();
                    _this._layouts.destroy();
                });
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateDivElement(this._editElementID)
                    + EDITOR.GUI.GUIElement.CreateElement("div", this._editorElementID)
                    + EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", this._inputElementID, "display: none;");
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("canvas", this._layoutID + "CANVAS");
                this._layouts = new EDITOR.GUI.GUILayout(this._layoutID, this.core);
                this._leftPanel = this._layouts.createPanel(leftDiv, "left", 380, true).setContent(leftDiv);
                this._layouts.createPanel(rightDiv, "main", 380, true).setContent(rightDiv);
                this._layouts.buildElement(this._layoutID);
                var leftPanel = this._layouts.getPanelFromType("left");
                var editTabID = this._layoutID + "TAB-EDIT";
                leftPanel.createTab({ id: this._formTabID, caption: "Edit" });
                leftPanel.createTab({ id: this._editorTabID, caption: "Generated Code" });
                this._layouts.on({ type: "resize" }, function () {
                    _this._engine.resize();
                    _this._editElement.width = leftPanel.width - 30;
                    _this._editor.resize();
                });
                // Code editor
                this._editor = ace.edit(this._editorElementID);
                this._editor.setValue([
                    "var callback = function (particles) {",
                    "\t",
                    "};"
                ].join("\n"), -1);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                this._editor.getSession().on("change", function (e) {
                    var value = _this._editor.getValue() + "\ncallback;";
                    try {
                        var result = eval.call(window, value);
                        //Test function
                        result(_this._particleSystem._stockParticles);
                        _this._particleSystem.updateFunction = result;
                    }
                    catch (e) {
                    }
                });
                $(this._editor.container).hide();
            };
            // Creates the editor
            GUICreateParticleSystem.prototype._createEditor = function (container) {
                var elementId = container ? container : this._layoutID + "FORM";
                this._editElement = new EDITOR.GUI.GUIEditForm(elementId, this.core);
                this._editElement.buildElement(elementId);
                var ps = this._particleSystem;
                this._editElement.remember(ps);
                // Name
                this._editElement.add(ps, "id").name("ID");
                // Texture
                this._editElement.add(this, "_setParticleTexture").name("Choose Texture...");
                this._editElement.add(ps, "blendMode", ["ONEONE", "STANDARD"], "Blend Mode: ").onFinishChange(function (result) {
                    switch (result) {
                        case "ONEONE":
                            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
                            break;
                        case "STANDARD":
                            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
                            break;
                        default: break;
                    }
                });
                // Emitter
                var emitterFolder = this._editElement.addFolder("Emitter");
                var minEmitBoxFolder = emitterFolder.addFolder("Min Emitter");
                minEmitBoxFolder.open();
                minEmitBoxFolder.add(ps.minEmitBox, "x").step(0.01);
                minEmitBoxFolder.add(ps.minEmitBox, "y").step(0.01);
                minEmitBoxFolder.add(ps.minEmitBox, "z").step(0.01);
                var minEmitBoxFolder = emitterFolder.addFolder("Max Emitter Folder");
                minEmitBoxFolder.open();
                minEmitBoxFolder.add(ps.maxEmitBox, "x").step(0.01);
                minEmitBoxFolder.add(ps.maxEmitBox, "y").step(0.01);
                minEmitBoxFolder.add(ps.maxEmitBox, "z").step(0.01);
                // Emission
                var emissionFolder = this._editElement.addFolder("Emission");
                emissionFolder.add(ps, "minSize").name("Min Size").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxSize").name("Max Size").min(0.0).step(0.01);
                emissionFolder.add(ps, "minLifeTime").name("Min Life Time").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxLifeTime").name("Max Life Time").min(0.0).step(0.01);
                emissionFolder.add(ps, "emitRate").name("Emit Rate").min(0.0).step(1);
                emissionFolder.add(ps, "minEmitPower").name("Min Emit Power").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxEmitPower").name("Man Emit Power").min(0.0).step(0.01);
                emissionFolder.add(ps, "updateSpeed").name("Update Speed").min(0.0).step(0.001);
                emissionFolder.add(ps, "minAngularSpeed").name("Min Angular Speed").min(0.0).max(2 * Math.PI).step(0.01);
                emissionFolder.add(ps, "maxAngularSpeed").name("Max Angular Speed").min(0.0).max(2 * Math.PI).step(0.01);
                // Gravity
                var gravityDirectionFolder = this._editElement.addFolder("Gravity and directions");
                var gravityFolder = gravityDirectionFolder.addFolder("Gravity");
                gravityFolder.open();
                gravityFolder.add(ps.gravity, "x").step(0.01);
                gravityFolder.add(ps.gravity, "y").step(0.01);
                gravityFolder.add(ps.gravity, "z").step(0.01);
                var direction1Folder = gravityDirectionFolder.addFolder("Direction 1");
                direction1Folder.add(ps.direction1, "x").step(0.01);
                direction1Folder.add(ps.direction1, "y").step(0.01);
                direction1Folder.add(ps.direction1, "z").step(0.01);
                var direction2Folder = gravityDirectionFolder.addFolder("Direction 2");
                direction2Folder.add(ps.direction2, "x").step(0.01);
                direction2Folder.add(ps.direction2, "y").step(0.01);
                direction2Folder.add(ps.direction2, "z").step(0.01);
                // Colors
                var colorFolder = this._editElement.addFolder("Colors");
                var color1Folder = colorFolder.addFolder("Color 1");
                color1Folder.add(ps.color1, "r").step(0.01).min(0.0).max(1.0);
                color1Folder.add(ps.color1, "g").step(0.01).min(0.0).max(1.0);
                color1Folder.add(ps.color1, "b").step(0.01).min(0.0).max(1.0);
                color1Folder.add(ps.color1, "a").step(0.01).min(0.0).max(1.0);
                var color2Folder = colorFolder.addFolder("Color 2");
                color2Folder.add(ps.color2, "r").step(0.01).min(0.0).max(1.0);
                color2Folder.add(ps.color2, "g").step(0.01).min(0.0).max(1.0);
                color2Folder.add(ps.color2, "b").step(0.01).min(0.0).max(1.0);
                color2Folder.add(ps.color2, "a").step(0.01).min(0.0).max(1.0);
                var colorDeadFolder = colorFolder.addFolder("Color Dead");
                colorDeadFolder.add(ps.colorDead, "r").step(0.01).min(0.0).max(1.0);
                colorDeadFolder.add(ps.colorDead, "g").step(0.01).min(0.0).max(1.0);
                colorDeadFolder.add(ps.colorDead, "b").step(0.01).min(0.0).max(1.0);
                colorDeadFolder.add(ps.colorDead, "a").step(0.01).min(0.0).max(1.0);
                return this._editElement;
            };
            // Set the particle system
            GUICreateParticleSystem.prototype._setParticleSystem = function () {
                var excluded = ["id", "name"];
                for (var thing in this._particleSystem) {
                    if (thing[0] === "_" || excluded.indexOf(thing) !== -1)
                        continue;
                    var value = this._particleSystem[thing];
                    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean")
                        this._particleSystemToEdit[thing] = value;
                    if (value instanceof BABYLON.Vector3 || value instanceof BABYLON.Color4)
                        this._particleSystemToEdit[thing] = value;
                    if (value instanceof BABYLON.Texture)
                        this._particleSystemToEdit[thing] = BABYLON.Texture.CreateFromBase64String(value._buffer, value.name, this.core.currentScene);
                }
            };
            // Set the particle texture
            GUICreateParticleSystem.prototype._setParticleTexture = function () {
                var _this = this;
                var input = $("#" + this._inputElementID);
                if (!input[0])
                    $("#BABYLON-EDITOR-UTILS").append(EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", this._inputElementID, "display: none;"));
                input = $("#" + this._inputElementID);
                input.change(function (data) {
                    var files = data.target.files || data.currentTarget.files;
                    if (files.length < 1)
                        return;
                    var file = files[0];
                    BABYLON.Tools.ReadFileAsDataURL(file, function (result) {
                        _this._particleSystem.particleTexture = BABYLON.Texture.CreateFromBase64String(result, file.name, _this._scene);
                        input.remove();
                    }, null);
                });
                input.click();
            };
            GUICreateParticleSystem.CreateParticleSystem = function (scene, capacity, particleSystem, emitter) {
                particleSystem = particleSystem || {};
                var dummy = null;
                if (emitter)
                    dummy = emitter;
                else
                    dummy = new BABYLON.Mesh("New Particle System", scene, null, null, true);
                var ps = new BABYLON.ParticleSystem("New Particle System", capacity, scene);
                ps.emitter = dummy;
                ps.minEmitBox = particleSystem.minEmitBox || new BABYLON.Vector3(-1, 0, 0);
                ps.maxEmitBox = particleSystem.maxEmitBox || new BABYLON.Vector3(1, 0, 0);
                ps.color1 = particleSystem.color1 || new BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
                ps.color2 = particleSystem.color2 || new BABYLON.Color4(0.2, 0.5, 1.0, 1.0);
                ps.colorDead = particleSystem.colorDead || new BABYLON.Color4(0, 0, 0.2, 0.0);
                ps.minSize = particleSystem.minSize || 0.1;
                ps.maxSize = particleSystem.maxSize || 0.5;
                ps.minLifeTime = particleSystem.minLifeTime || 0.3;
                ps.maxLifeTime = particleSystem.maxLifeTime || 1.5;
                ps.emitRate = particleSystem.emitRate || 1500;
                // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
                ps.blendMode = particleSystem.blendMode || BABYLON.ParticleSystem.BLENDMODE_ONEONE;
                var buffer = particleSystem.particleTexture ? particleSystem.particleTexture._buffer : null;
                ps.particleTexture = particleSystem.particleTexture ? BABYLON.Texture.CreateFromBase64String(buffer, particleSystem.particleTexture.name, scene) : BABYLON.Texture.CreateFromBase64String("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAABGdBTUEAALGPC/xhBQAAAwBQTFRFAAAAAwMBBgUBCQgCDAoDDwwEEQ4EFBEFFhMGGRUGHBcHHhkIIBsJIx0JJR8KJyELKSMMLCUMLSYNMCgOMSoPNCwPNS0QNy8ROTASOjISPTQTPjYUQDcVQTgVQzoWRTsXRj0YSD4YST8ZS0EaTEIbTUMcT0UdUEYdUUceU0gfVEkgVUsgVkwhV00iWE4jWk8kW1AlXFElXVImXlMnX1QoYFUpYlcpY1gqZFkrZVosZlstZ1wuaF0uaV4val8wa2AxbGEybWIzbmM0b2Q1cGU1cWY2cmc3c2g4c2g5dGk6dWo6dms7d2w8eG09eW4+em8/e3BAfHFBfXJCfXNDfnREgHZFgXdGgnhHg3lIhHlJhXpKhntLh3xMiH1NiX5NiX9OioBPi4FQjIJRjYNSjYNTjoRUj4VVkIZWkYdXkohYk4lZlIpalYtbloxcl41dmI5emI9fmZBgmpFhm5JinJJjnZNknpRln5Vmn5ZnoJdooZhpoplqoplro5pspJttpJxupZ1vpp5wp55xqJ9yqaBzqqF0qqF1q6J2rKN3rKR4raV5rqZ6r6Z7sKd8sah9sal+sqqAs6uBs6uCtKyDta2Etq6Ft6+GuLCHuLCIubGJubKKurOLu7SMvLSNvbWOvraQvreRv7iSv7iTwLmUwbqVwruWw7yXxL2YxL2Zxb6bxb+cxsCdx8GeyMGfycKgycOhysSiy8Wjy8WkzMalzcenzsioz8mpz8mq0Mqr0Mus0cyu0s2v0s2w086x1M+y1dCz1dC01tG119K319O42NS52dS62tW72ta829e+3Ni/3NjA3dnB3trC39vE39vF4NzG4N3H4d7I4t/J49/L5ODM5OHN5eLO5eLQ5uPR5+TS6OXT6OXU6ebV6efX6ujY6+nZ7Ona7erc7evd7uze7uzf7+3h8O7i8e/j8e/k8vDm8vHn8/Lo8/Lp9PPr9fTs9vXt9vXu9/bw9/fx+Pjy+fjz+vn1+vr2+/v3+/v5/Pz6/f37/v78/v7+////AAAAAAAAVfZIGgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC41ZYUyZQAANjRJREFUeF7tfWdYVdmy7b2n24gJMIsCCiJIDpIkB5WkIioGEAQREMGcMeecxZyzmDErYgJEBAFz1ja12snuPufe+973vVE159p726f7nHvvdwj22/VDBQlrjFk1qmquuWr9m9a0pjWtaU1rWtOa1rSmNa1pTWta05rWtKY1rWlNa1rTmta0pjWtaU1rWtOa1rSmNa1pTWvlY//OJj/4/8cE7N8z+QV/YpNA/6HJL/3zmcQn7S+/MflpafJb/jwmcZFJwF99bvQZ+rT8Ipj8zj+DSUQSO8H9+vdM8qBBgvz+L9wkGIkdQKt9XY2terUa0qqLT1STNGiSIH/IF2sShgo8Ya9eo3r1mjVr1KipNpBQE59lJgQLag7kT/oiTSBQ0POSV69JwGvVqlUbpqOjI/+oXbtW7VrERE1m4c/Bgbh4BX21GtVp0Rm5Th1YXbZ69fgvfKxTh5ioBRrwlUyCBgfyR35JJi6c4BN6uHetmrVq69Qm4PXq1a/fAKarMnxQvz5xQTSABcREdcHBl0oBX7NYfEYP8Fh3YAd0XV09PX39hg0bNlIZPtDX19MDEaCBvEHhQLgB/7QviQK+Xl581jxyex34OZadoDdq1LhxkyZNmzZTW9OmTZs0adwYROiDBfIFhQO4gYoC+dOrvPHFSt/H2tesibXnldfTb9gI0Js1a96ihYFBS1grNvzDwMCgRfPmIKIJWBAkgANoJbvBl0UBX6kCHxCgePUQ73oEvimwG7RsZWhkZGzcunUbxVq3bm1sbGRo2KolaGgGEgQH0g2+LAr4KrH8FPo1anLg09o3bATwLVoAOwM3bdvWzKwdzNzcnP5sZ2bW1tTUpE1r0EAkkCPo6zVoUK+ujo6k4GvIIXEgf09VNUbPwc+hT77fgNYe6A0IfBsTUzOgtmhvZWltZWNtbW2DP2xsrKwt21tagIe2piYgAZ7QvBn5gS4oQCSovIDplb+qKhpfn9C+GjUAH6Kvi7iH4zN6Am9hYWllbWNrZ+/g4OjoJMzR0dHBwd7O1tbGsj1YaGvahh0BfkBuQJFQqxYYqFblnYDQw8j7SfkIvh65vkFLoDdt286ivaWNDaA7dXB2cXVzdYd1hOEvNzdXFxdnJ0cHO1sbKysLczPTNq3hB+wGLAYokGpU55zIJMtfWLWMr4zFr3p1cv66DL8Z4t4IMd+uvaWVDWN3dXP38PTy9vbx9fWT5uvr4+3l6dERNDg7OTjYWltZEgfG7AaNG+pxICAOqrQTMHyx/DVq6eiQ8zN8Q+M2pmaIeVt7Ryese0dPLx9f/4DATp27BAUFCwsK6tKlc6dAfz9fHy8PdzcXZ3iCDSTBzARuoFAg4kBVG8rfWnVMwCfx4+WvB+lj+Fj9dhZWNnYOTgTe28c/oFOXoJDQsK7duoeH95AW3r17t65hIcFdOgUG+BEJrs6OdnbW7YkCQ6Kgkb5u/XqIAzgBU1D1GGD8X33Fy18by6/XsHGT5gaAD9+nxXcGeh8//07A3rVbeEREz96Rffr2g/Xv369f3759I3v36hnRI7xrWGhwl0B/X28PdxdndgOmoAXJoW79uigLqmgYCPzk/ih8EPz6DZs0b4HYB3xrW7i+u6e3X0Dn4JCu4QS9b/+o6JjYgXHx8YPY4uPjBsYMiI7q1yeyV0SPbmEh4MDHq6Obi6O9pMCghYgDndo1a6h8oAoxwPgR/uT+ED8sf9MWLY1a8+o7OLt29PLF2ocCfa8+/aJi4gYlDE5KTkkZOjQ1NS0tLTU1dejQlCHJiYMT4mOj+/eN7BnRPQx+4Oft6QY1YAqMDQ2awQmoMGItrGIMAP6//4VbfnJ/jn4DQ2MTMxX8wC609r379o8ZOGhwUsrQYcNHjho9dtz48RPYxo8bO2b0yBHDUlOGJCbExUT3i+zZo3toUCd/H093Vyc7a0vztm2MWsIJKAyQEKuaEAj549IXub+BfiNa/jZtIX0OHVw7evsFdgnt1qNXn/4xcQlJKanDR44eN2HS5KnTZsycNWs226yZM6ZPm5w+cfzY0SPShg4ZPGggOIgI7xoMCrwQCJDDdqbsBA31oIU6NblHrDIMqPHXqk3h37iZQStjUwS/vaOLu5dfYFBo94je/aIHDkpKSRs5ZvykydNmzp47f+GiJUuXLVvOtmzpksWLFsybM2v61PQJY0cNBwfxMVF9evXoGtzZ38fDvYO9rRU7AdIB1QS1aoKCKsOACn9NEf4k/rz8js7unnB+wI/sHxOfOCR1xJjx6dNmzpm/aOnylasz1q7fsHHTps2bN2/atHHD+nVr16xasWzxwnmzp0+ZNG7UsJTkhIHRfQUF3h4uTvZwAhNjpAMSAjSJlA+rBgO4BNZ/4If7o/Rr3srIhJbfCd4f0CWE4Mdi8YeNAvpZ8xYuXbF67fpNW7bt2Ll7z959+/bv379v3949u3ft3L5188Z1a1YtWzx/zowpE8eOTB0yWFAQ1MnX093ZwRZKgHTQDLUxSmOSwirBgIIfnS/hh/rD/c0tbRyw/H6dgrvR6g9KHjpi7MSpM+cuXLYyY/3mbTt27zuQeejI0WPHs7JOwLKyjh87cvhQ5v49u7Zv2bhu9YrFC2ZPTx8/Ki0lMS66b8/uoV0CfDqSGFogDAyaMwM6XBOJzkBeSqWYxvqj+NMHfsPWpuZWdrz8QWHhvfoNiE9KHTF20rQ5C5auzNiwBeAzDx/NOnnqzLnzF7KzL17Mybl4MfvC+XNnz5w6cfzIwQN7d27btG718kXzZk6ZMGZYSsLAqD4R3ULgBG7ODjYIAwhBE4UBygWVS4DAL+Kf5B/Zr42ZhbV9BzekvpBuEX2i4xJTRoxNnz5n0fI16zfv2LP/0NGsU2fOX8y5dOXqtdy8vHyyvLzc3KtXLl+6mH3uNEjI3Ltr68a1K5fMnzVlwqi0IYNi+/XqEdrF36eji6OtJbKBBgPSB+TVVLx9vv4NIf/Aj/B3dvfy7xIa3qt/bELKsDGTGP7Gbbv2Hzx64vT57EtXruXlF9woLCwqKi6+BSsuLrpZWFhwPS/36uWc82dPHT+cuWfH5nWrmIKRqUnx0XCCoEBfD1cnZANT41aUDKAD5AOVKwNEgMRfF/7fzMAIxY+No0tHn8CgrhGR0fFJaaMmTJ29aHnGxm27DxzJOn3+4uWreddv3CwqLiktLbt9+46w27fLykpLbhXfLLyRn3sl58LZk8cO7tu5hSiYkT5ueMrg2P69wkM7+Xm6dbADA62RDBrq1qtX6Qwo+GvUkv4P+bcEfg+fwODuPfvFDE4ZPm7KzPnLsPp7Mo+ePJt96WpeQWHxLUC/c/fuvXv37z8Qdv/+/Xt37965TSwU3ci/diXn3Omsw0TBysVzpk0cnZocHx3ZI6yLnzdKAkghGEAUNKhbmyqiymMAv5YIEPUP9J/x2zq6evh1CgnvHRWXlDpq4rR5i1dtYPjnLl7JvV5YdKsU4O8B+cOHjzTt4cOH4OHeXZBw62ZB/rVLF85kHd6/c3PGsgUzJ48dnjIopm9E16AAL3dnwQDpALVGlSkD+LVfAX/1WnXqIP8j/gV+T7/OYT36RA8aMmxs+syFKzK27DrA8PNuCPT3f4tdbUQCc1BceJ0oOH5o77YNqxfPmzZhZEriwH49uwchH6oZQEUEBmi7uFIYEOvPBVB9XZT/0D/G7985NKJPzKCUEeOmzlmyeuP2fUeyzjL8kjJGL8H+kT18SBzADYiCU8cyd29Zu2LBzEljUpMG9u/VLVgwACVs2ayJvi7LAO0PVAID+JVwAMKvU0+3YRPC357Xv0vXHn1iElJGTZw+b9naLbsyj5++cJnh372nufbw+YdSAigeNL2C/OAOU5Bz7sSRfds3rFw8a/LYYclx/XuGhwT6dOxgT7mgZbPG+tQb1iAZqBwCCH8NJEBdfdS/rUn/CX+3iL6xg4eOngT3X7dt7+GT53KuFTD8+wpGgfwe7K40+remLoCCu3cQCHlXsk8fO7Br85qlc6aOHz4kPqq3YAC5wMQIVbFeg7rUGlaGC+AXkgBWhwAiAQJ/WwtrB4r/rj2BP3XM5NmLVm3cceDo6ewr+YW3yu4o8BWxu0vJT8PuUF5AWlA4IApulxQV5MIJDu3dunbZvOkTRggGArzdnewsURMaNEV3TDJQCQzg18kAqMsCaGSK+s/Fww/x3zc2kfAvWbNp18Gsczm5BcWlt+H8AhbWnhMehK60hAx1EP9dWlJ6GxrBuVGQQBSU3SrMv5J96si+betXzBcMkA6AAVtLszYQQiEDlRAEEn+N2jpogDkBWtk7d/TtFAb94/VfkrFlz6ET5y/nYfnvqlYfa4+VLysj4EVFRTcVw79RE5ZQgQASEAvi6x/cu11aVHDtIsJgx4YVCyQD3YP8vdwcbTkVUBBUhgvgl4kAEALYqnU7S7sO7j6dQnpEMv45SzO27j1y6sLV/KKSO3L5efGp2CktEbXvDbKCggL6q7CwECwUSw6gB9ILyAlu5OacPZ65EwzMAANxUT27Bvl5ujpYW5AQNtKj/RFioOIJ4BKYKsCWEAAbJzevwODwyAEJhH/JWuA/nX0N7n9HLj9neCpzqOIF+ILrBdfRCF2/Tn/SXyACJAgOqFSSrN27XVKYd+lcVubOjSvZB5ALunb29XC2t2rXxpBrYm4MKzQIBP5qlAE5ACAADq5e/kHde0UlDB1N8b9139HTF3NvFJfdVYDA+W/Ler+gAKjzYLkqwwdgAe5AHAgKHjygb3z04N6dkpv5l8+fOAgG5k8fPywptl9EaCcf9w627c0oCJALdWpVr8Z3DeX1lbuJEoj2QBqICsASAoACoGdUfMqoSYj/rXuPnsnJvXEL6idQcHGDQh/wBXhCfU1tzAI+DxJuFMINiALFCe7fKS26foUY2LB8/rRxaYmxkT1CAiADNkoQ1KEdsgp0ARkA6IHq6zZu3tK4bXtbJ3fvwLCIvnFDRkyYuWjNFvh/Tl5hyW2BAdqH+pbhw+0ZPTBf/Y0xC/hPQQG8gFInf/uDu2XEQFbmjvXL500Zkzp4QO9uQX4eLg5W5iIIaG9A6KC8wnI24P8LHKCWDjuAkYm5NSqggJDwyNjEYeOmL1y1ac8R+H9hCcJfALh3B7EP54frC/QS82+NOBBecLMIWnAbSkA+8EgwcC7rwPZ1S+ekj0oZBCHsTPWQpVlruIC+KAYqzAWkA1APwCWQDIBuvaKRAKbOX7Fx16FT2bk3gJ+vHkp+p6wEun8Dq0+OL9GSCf//jA/iQFJQSkogfsa9sqL8y+eO79+asXjWxBHJA/v2CA3kIKByqFED0sGKcwGVA9TTFSWQjaO7NyqA/hCA9DnL1u88eOLCNcT//YePH3P4o7UpvgnZx+qrsAI2kUGhz6ZBA/6HBBGtcwkxACd6DB8oLcq/dObo3i2rF0IIE2MiUQ0gE1i243IIPUHFuYCGA+iRArazcnDxCggO7xObPGLCrMUZ2w5knb9SUHz73sNHIIDUv6yEtA/Lr2AUood41zAmQfl/CGI+nAA1JEvhY9KB0pt5OacP7960EjJAQRCGIHCybW9qhCDgVFhRLgACKAUIB2hpBAXs4O5LAZCQOnb6wtVb9h47e/l6cZlwXrH+RYU38vNVzk/o8ynrIfdLo2qASZAcEEPMAFpomQzu3ykpvHbx5MEd65fNSR9JQYBMgHKIioEmehXoAn/nAFQCBIZE9ItLGTV53vKNuw4jARSV3lXhLylG2UPLz9jI9VnnoPWo/7gQRhlINSEqIgoSSQE8BEoAIZAMPLx/+1bB1QvH92/LWDRjfBplgi6+HVEMtNVwga8qjIDPHAAK2D1yQOLw8TMXr91+4GQ2JQC+aIG/iHKfChdVPKLok3vCZFQbU4WkQQErAQmBioF7t4uvXz57dM+mFfMmj06J6x8BHdR0gQqqBQj/19VqogbQlw7g5h0YGtF/UMqYKfNXbdl37NyVAhJAXjTgLyqi8Ffj51LnJipeZPoy2QuXUYNwixIFfa2iFfji67yLKLsJloGLpw7tXLdk1oThSdDBLn5qF+CNgQogQIkAnbq6KIKpBoIDBHWPjEkeMXH2sg0UAPlFZRBAxn8H6w9MubkKonxyfZQ53PRw80s7wuiQqU0QhbJaLfnrC2+WlMqi8MGdkhtXL2QdQCaYNnboIHIBb1cHagnQFdaXm+TlTwBXwbXQBjdqhi7Q2sFFOAAUcNGabQeQAQuFAFAfU4b4B35Nn+YShzp/AeoxDF8regVUi1wuKR7DDPBmIldEkIHi65fOHNm9cfmc9BFJsXABVgFTY4Mm+g3q6lREDLADfM37IHAAQ9P2NkIB4ACT5izfuOfo2csyALiZh/6r8LOqwflR4fH22OMnT589e/b8+XP8+fTpk8e0AYKMyRQoTsAM3LylbCmgIryZm30iEzo4fVwquwBUwMqsTUu4AO+MlHtXLCNASmBrMyt7Fy92gKFwgIxtmScv5skAoP2ckps3C6T/X7uGgC5A7HNqB/pnz1+8fPmNtJcvnj97+oSy/Z1SRA0YUNFGN5KKS+SeEnJhwZWzR4ULJJMK+Lo72VqYGrVAMUQtUbnHgBIBderrNW5uaGJh40Q1QO+YpOHp7ADnrsgSmLYySgiJWEtaSmgfw3/46MlToH/1+vWbt8LevHn96puX4ABuQHUT1PAzBlRCSCVxHooBcgFWgZAAT5SDZq0NeF+g/GVQRkANaoMggaaWts6e/sER/eJTxk6DAqgdAP58pxT173URzcKVi0oIxyMs/stvAP7dt+/fv//w4QP+/Pbbd2/BwQuiAMyVknSqowDJkGRABEHJjSvnju6BC0wanjSgV7fOPm6OVuYmtDlWX1SD5U+AjAC0QaiC3bw7de01IHHYxNnLN+5mBxAKSHtZEAC5/nQ7WCa0x89eAP7bd+8/fPz43Xffk3333cePH95/++7N629ePH8CsUfxQNyJ4KGaUBUEKAbIBTK3rVk4dUwKysFgf48ONogByGBFxICMgNqiCDCxQA70DQrvM3DI6KkLkALIAagHYAUUAcCryOms6BZWEcv/8tWbt9++/wDsP/wI++kn/PHDD99/9/GDoOAplvm28B4leiAD9M3ErHSB3RuWzZqQlhDdM0zIIHXF6AnLPQaYALETREWApb2LZwAkMCF1/Myl63cdOas4ACK59BYHAOFH/oP8M/6nz795BfgfvwP6nz59+lnYp0+g4YfvmYJXLxAGSCAaDOTRPWV0hmoXOLF/66r5k0clUyakzTHqCSsiBmQEUBWEHMBtgHfnrr1ikkakz1u5eX9Wdq6iAHRTQxUAWEJe/wePnr745g2cH/B/+vTzL7/8+uuvf4Xhr19+/gQKyAveQgmeSAakA1EAQT9JP8DtnVsFl88c3rlu8fRxQ+P7UQw4U0/IeaBWTXGzWF7vv9yIAFkFiRxAVWB437iUMdMWZew4dPrS9VtAqTgAZQC6fsr/N0uQyoH/1Zt3Hz5+/+OPn4Ae0P8mjEkABz8iEN6/ffWSGKAcQhURM5gPBlUuUHbz2vnjezeRDA5GDHTydrGzbNu6ZdOGVAvVKGcChATUbQAJQB9khxwQgghImzBr2QbkwKsoAj9zAIE/n0L4tsD/7YfvaPVp6f/2t/9QjEkABT/9+P3H9+9ev3z2GD/iVrHah0AhdUX44Y9QDubnnMrctnrBFI6Bzr7ujuiIWomWsHxFgAmQZSBVQYgAzgEjEQFb9p8gCaRrpH1cOMB1efGoZovhvxI/vP9nWn2g/0/Yf8HwF3FADHz66YfvFAaQRgqkilAQcSJgGSy9ceXM4V3rFs+QMYBy2MKE+oHyLgZZAqCBXAa2ggQ4unEOQAQspAi4XIA2mC8RESwdgCpAFDK49ifPvyH80D7gZ/gEXjHm4K+//MIMvH398imqPshAQZ4MAk4EXBBTDOReoBiYPXFYQhTygKezHVpC6gfKWQSEBFRXlYG2Th0RAf0GcQ7YffS8KgJoE4z2QOjSKQMWoz16/Owl4v/7H8n9Jfz/ozZBAZzg559/+uHj+zevnj9F61PC9RATABUoLrnDRfb927fyc05mbl09f/LI5BjUQkiEohhsQJsC5U6A3AowMrWABASE9owaPHzSnBWb92VlUwTgAh9CAtXhSw5QUnb/EfL/uw/fQf1o+X8Dn0xS8Cv5wMdv33zz/MlDdgFREpOQ0CEDcrCHVAogD6xdNA21UJ9w9AMQgdYsArVrChUsHwY0NdDA2MzS3tULEhCTNHLy/NXbMk+pc8Dt0qJC6QBUxt2CYzx58ert+48U/3/9mwr+/1WMPyIKmIEfv//w7s3LZ4/uIxOoXaBAuc8s8sCx3RuWzhyfSiLg19HJxtzEUKpgeRNAGsidIO0F+aATJglYtHbHYVRBSg4o4xyosXLkACQApH8q/BK8MEkBMfDzJ5KBVy8eP7zLKkAuwLUEHzTgGCjOz87at3nFnInDBkdFhAagErAwNRSVQDmqIEWAhgaaW6MTRBUQP3SskIBrN0UVJNVL47qhAC++efueAwD+//fwySQDpAM/fY8gIBe4TccGNZiUBNy5df0SRADF4Iik6F6ohl2ggrQrIkqh8todVxMADWxlYm7TwYOrgGETZi/f9JkElKhyQC7XAEiBcICPcIBf/wr8RIBE/ZkRA6SECAK4AFTggRQT9U/iGGMROHtoR8bCqaOHxPbu1tlbUwXLLw0QAZQEqA4kDUQrjEaANHDuyi0HTubkFytJEKGrWjeUcHfuP35ODvDDJwgAO4BE/FsTDKAe+On7D98iFSLab6Gjkr6EnlDUQgiNwqvnjqISmD4WKoh2wI1UELWgbt3a5ZgHBQG0GSLrQBevwLCeA5JGpkMDD566VCAbIZKAG6qrpgiABL5GCpQO8AfrTyZd4FdWgW+ePeZMqHCpSoRIkDdzzx/bAxUcNzSub3iQr7uTrAXp/kg5E4AsyEmAWkHUgb1jkkdNpTLojKKB9zWlCzmgBBEACfxvOIDaBaACH969esExoC4oqKCiX0EqmJd9fB9KoQmpg/pTGuhgTZsi5ZwHWQJoM4B7YTNLBzfvzt16x6aMRhLYeUTVCEAClD6AAhfKhQh49RY10D91AJUL/PIJtQDFwN2y4kKQyT+L+gFRCTxAGkBLzGkgISoixN+DimHqiOvp1KxRbt2AQoDsBEQWRCE8dsYSTgKFWGoiQN0IwW1BwB1Uwa/fQQL/qQOoXYBk8M03zx5BBGQtxATQkRsigNPAga2r5qUPT4xGHvQEAabcDYjTMuVIQHUmgMoAK0fOgnFDx81cumHPsQu5ShL4LG7pmNDDpy9ff/uRI+CfOIDiAr/+jGLo7avnJAKyqxIqSE01fsfdWwWXTx3chmJ4RNIA2Q2gEODbI9XL7RahIEDWQW3a2QgC4oeOn7Vs497jShakzTCpgUK4FAn48ZOMAAn19w0E/BfFAIsAJUJiU0NQlTRw4/LpQ9vXLJgyMmkAFQLOdpZKJVR+R+aYAHo4VBLg5O4X3KNffCoI4DJAnQU1kwAawUfPuAr6WRZBEurvG8cAEfDDx3evWQUlAYJNScA96ohRCNCWwIBeXTsxAepNofIhAD9UTQA1w04diYBBqaIOuqguA2g3UOW1t+AXRABp4H+DAI4BRQVBwF0QIDYFPieg8MrZw1QJjUI/CAJc7NEQVywBqIQFAWkgYPP+ExfzZStEBGiELQigMoiSADSQqkCJ9A9MUUElDTABUlHVBJQVXj2LfhAEDFERYKwmAAzIq/4XmkJAbdkK2DAB/RUCcn6PAGoFlSz40/+SgGINAoo0CDinENAbBLgSAeXcDGgJ+IMQEBrwD0NAasD/gACpAUoI/J0GcAhUrgZABDkLqETw97MACPjfZoF/KIJoBz8jwM6y3AkAAyBAfVcEdYBfkEyDG/dSGhR1gJoAXDNt4xAB/7s6gNKgUgd8RsBdToNcByANyjpAElB+OyKSALkhZG7tKAshrgSPK5Ug3xVUX7OsBN9QJfjr/6ASFIXQ4/t3VJXgNSqExE3ih3dLCi6f5kpQFEKyEgQBVAqXKwEavYCjmy96gbih3AscO597s0xdCqt7AeqGn75AKSx6gX8mAlIDf+YtEfTD1AuoFVWWwg9QCvOW0Lz0EYnRPVV7YkovUM4EcDdIt0XcvMWW4PTF63ZRNyh2xDSaIW5hS26jGXoltgP+G80Q74pBA7/jTbF7ZerW+vNmKOfkgS0r506Sm4KqWyPleYMYBMj9ANkOu1I7HDOE2+HDZ6/Idpi2BDX3sagdFiooYuAfMiAdABJAlbBmFuSfJdth2hW9KHZF0xL6cztsIw5JlPN+gPq2AB2Qs3ehXfEBySMnL1iz/dCZywUlvFsB4YbbaqQBOIZoB1X98B8ywA4gIoCbQaGB6jKghE8fgICi3Ozjezdq7Itbm4u7gwoB8pr/pSYIoHvDfF+kvZ2LZ2BYz+jEEenzVm3VuC1AN/U0lZs3BCgGfvz5F7knKvH+1jgH/sdfRRXAEUB9hTqj4EfJMoBvDKxfMmNcitgSo9ujLZtWwJYYn4/hO2OmFjbOtCsclTBs4pwV1Axo5EFNEaBSiBIh7whIFfgDBqQC8G4A9YIUAbQhpGggnbEgAigLnjsibg3FRtI5IT4kUhG7wlwJ0ba4oYmshVEJjUMhgDx4DWlAJQKfXTbnAboxxveFyAV+jwF8loogujdEDvANb4d8pqe3bstt15LryIIoA/jmoKiEzYxpW7xORRDAhQDfHHb37RIeGZcyltPA2auFpfLGiGofS8RA6Z0HaAjFjQElCP6eAoFfuS3ADsAbYswkfhBtsCs3Rorzc05QEkgfnhiFLChuD5d3IUgMyEpIyYN0PKB37JDRUxeu2X6Q7o6LBbr32c1hvjMiXeCHTyIVMgOfUcDw/+s/KQXS/WF2gAd01B4OIF2JmCQCHt4vK8q7cGzvxuWzJyhJQGbBcq2DmABKA/S0ZBMD5cZAL6GCWw6cRDvEIqC6OwwCVDKouICQgf9kIYCpwBN8Xn8UgXxGAjmQHEA2AiKhIgkKCUAveGQXNHAs3xbwc+ckIDeFyy0LihigNKDcHrd19qAzYtQQ064gimHVzUGKAdnCkAsgNp7Q3UG+Pfzr3zQpkKY+IMA3h18jBSAHgsd8ySOXVLIMKim4xDuCU0ejGe7exdvV0aodH5RDEii/LChFgI9JKipI/WBfFMMQgZ10SE6UQpwHlBhg36Xjs09fvHr7LR0QkicEEAgKB/gXwyf/J/yUAp88uKc+aCXEVHRCfFvk4on9JAEohFX7QeV+a1BDBes1gArSxribT+dukbHJo6bwAYEcGQN0SEx1tIFOt/CdfT4i8f67H+iMCB+QYgqEiVNCyjGpd3w8QqOnoEBCDhARgEKL7gzu2bB01oQ0Pi7s4WynPi9djhKgqKBoh8TNMbo7GD14OCqBTRQDqhvk4mgDESAuvuQ2ZODZy9fvEAVggJyAzogBOBmfE6NjYp+AH+tPx0WBXxVHmhJIEYAkeGhHBlUBcX1YApRCuDw3xcmkCIiTsvTAoHNHv5Ae/dARz1iybhfaAZEH+FEBKgXk1ecV3CgqRRH75PnL19ABOiX5izgnJ07KiZOCv/Dyfwf8r4AfHMKJJIfioJWsglAH52VTBMxLH5kU07sryiB7S7o3TAdEylUDVSIgS6E2vCVADSFiYMHqrZl0h5zPyT2gUkDDf6mRJQbIB97SScEf6aCoOCbKJs6K0lFR6D+t/300FFwDMYXioJU4KEmn5BABuzkCkARDA7yc6bkhSAA/OFWOEqAWAZ26ug2btTSmSkDEAB8W33Ps/DXUQuwCfFBOUQFaQLq3Dx+go9J8VpZPCvNhWWD/5Wc+KcuHhV+/fM7rTw9bSPxSAaQDUBV0KnP7moUUAZQExTFBvi9WzhKgKQJUCZi2t0c7gDwQj2Jw0dodB09ful4sL1M+LqFGoPjAi2/evIUS0GnpH38CC7Cf6Kg0HRR+/+4N8t8Two/1x3cLDxIKgCqQHOBeaeE1OiW4Yu6kEYkDEAHerk42ZuKMWHnuhggjFxANoYgBG94VipSnpfdloR+QLvDZaWd6XIgfA8X/QQheIQ7efwAH3/8gjJ4ZUE7L0zlhiV/lAPzgFD1pQw5w6zqKgJ3r0Anyg2MBnrwhyklQR0ZA+RIgREC3EW2LWVIxGIqOMHX8zCXrdh4+Qz0xuwDVwxQEUsWkD5TdvffoyTN6XIaeF/nw4aOwD/S4xFt+XuIpbSlJ/MrDJnxKVKaAe6U3r13I2rdl1bzJI4fERnYP8qW9AFNDeoK6XDshaaoYoE0RQxPx1CA9MYFSYNUWtQvwM1O3bpKMsRsDRj49McYn/Z7QMzOv6KGZd9+yvSP0r16+eP6EHhqSD5vJ9eduQgkA4QB0WH7JzPFpg6PorLirAz1CXjERoI4BPi1Ld0cc+bx09OC0CbPIBUgF5IFpAlJImUDxgYIbKAnFQ2NPntKDM69evRb26hU/Nwb4/Kw5iFPWn1MIBYAoAqkIggPs37Jq/pRRkMAeQWiE+IhcxUSAZgzQ1jBqITshg3Epo9kFjiMRiJ6QGVA/9sE+QI9NCgoe0lODz5+/ePHy5csXLwD+2dPH9C0En0YtoISQ30UptFgGAD05mS8UYNaEYYNRBtMzU9bmohPkWwLlHAFKDIiNQXIByKAPuUDisPHkAodQDxdzOUjuKmVAMoCiGFUxz8YQY+UeP3ny5CnsyZPHNCGABunJ5ybVD9vmUwaUAUBF4I2r54/v2wwHGE0OEOzviT7ArLUBHRCrmIeHlRhQnpyEC3gGwAUGpoyaQolA49lplEO3hTcrPkBwaDaGmClJ49N4jhyNlLx394764eFcFWX4BmqllAdH6enpkwd3rF0yc0KadAAnGqNBfQBVQRVEAMWALAX40UmfzqwC42YsztieeSI7V/3wMNdzqnim0QGCAh6XxHOz2Gi8FtCLKTvqx8eZsCLaB2L8/Ojw5bNHqQZIHzWEHAA50N7SzJgPyIkIKG/8MgaEC8gJKi6epAIDh4ycNGfZht2Hz/Dj42BAPAbKD8IqkFgJ+Pl5Gh5QUlIqjEaLFeML6blp+lpJF31pET0owvjpiDACIOvAtjULp49LTWAHQB/Ec1S4E64IB9CQQW4J+elZNMVhPaMGpY6dtkA1QAAyQHFNeyNFNwpQ1IqgpjgQg3JAAs1QAxFiqhpN10L7lKv+QvIW+D8P06FpLGJ8wMGd65fOnjgiObZPOCuAJY+T0iUJLN8+QGVqGZQuQIkAtUBs0vCJs5as3X7gRPY1eoBYg4GbNwiacIJrBC3vOg3RoDlqYnwGTdcSA5alp1DxSI+KSfywB3dpks7ZI3s2rZw/VUxR6eTtToN0DEUOhASWbx+gGLkAjRJVuYC1o5t3p1CeojN53vINuw6duph7k4doCAbKOBuqw4C0APAAkAep0ACVfOQ9Qi+cn8WCJogU08OCYv1RH0IAzh3ftzVj0YwJYo6On6czjVKSDlBT5MCKIQAqoOkCHTzoEfLohLRx0xaspDlSl/JukhAq2a2kCELAY4Q0OSDLA1L2e5j6PzlKeJSSwI8fc49HqGRl7li3dPYkMUQm0MvNATWAbAMqzAF+4wIt0BKhK6ZJWn1ik4fTJLGt+2iQDg+SoaVjH+DqRmOUDhnWm2bK0LrD5CdFiOTTWDlRNkL/HqNChABeyz55aOeG5XPFGCFWQCoCWzarWAdQu0DtOvX0GtHWGE0SEqOkkAlmL1m77cDxc2Cg7O5DRMFjNDA0SY5nY1BroAH2701EB7wfy4/6lydNcE1VUph78RSNUVowbWwaBUCwP01T4/khlAIq0AHULqCeJSWHiUUlpIyePHfZuh2ZWeevXOeb+RwF6tkYnOY0vP0z47hg+DxR77aYn0P+z/hPH9mzefXCGeOHJw3so4wSk/P0xBChCiVA1gIN4AJynJx/cHeapzl26rwVG3Zmnjh/laJAZHAqCOQ8PQoEDnpNt+doIPA0bl/Cp+Vn+ef4L8zNoUFia2iU2pD4fhFhNFFRKqB+g4odJgfTcAH9xs3EQEG0BCE9kAuHjZs+HwwcPAEf4GN9XMTxkBhR6sqMJ5VPGKGn6VpUJ0r46Ba4/gd5NFb04pmjSACLZ9Mwvehe3br4ebjYy3GCUEB6CVkFEyA6gtp1dfU5CFAMdPTtHBbRdyCEEAxs3Hkw69zl/EJ5O5MHyt4VFNC4JJqbBUFQG1IiTdeiEvE3Q0Xv3y0rpsGyhH/J7MljhiZEkwB4uaoCoD5PGC+vhwR+34gAlIPqqbrm1g4uHjRUsz8NlZy+YOXGnZlZ5y7RUF3RyGEl5VBZ5gCxIGaoCRM1EUpDKo/RIyjwqaEqLbp+NfvUkb1bM5bOmUzjJCPDQwJ5sjDP1aUBQooCVhwBYIDerIYgqEMvVkAQWNBcbf+g7j2RCpiBDTsOHD+Tc40eHFdimcZp35Ujo4gEmqImDR/A8+H6sk0U8OH+6CfzL184eXjPlowlhD8xpk9EaCefjiiB2pkY0msGKmeyMrsAT9aupysma5MMeAUEIxUwA/NXrN++/+jp7KvXb8rJBwSItIB6P+5/islEO0Bj1dAZ3QZ69Qh2qiBKi2/kXT6XdWj35jWL4f+pg2P79AijoboOPF28aSPd+nKsMAiQ11YxBgbkaGnaG2IZoGogICi8t2Rg+bqtew+fvHA5T9zUEqDEdGkmoYxGqEnDv7k5xtprwKczp9evXqSpyptWS/x9I8I6+3m6ONhYcAlUedPV8fuU4eL1ebi4STsruw4dvQNDehADw8dPm7s0Y8vug8fPXiQnEDWNMLEBQpPl5StGYPiA37gh0TN8sfznTx3Zt2PDykWz0gX+rl0Yf3shALQTWknz9fEbRRDU4VxoYGxqbmXfoaNPYGh4r6i45GHjpsxesnrTjv1HT124lCvm6yteQH7ALGga7Q09+gz+rcJ8LH/WwT1b1y1fMH3SqKGDEf9IgJQA2vNo9YYNOANUhgPA2AW+5jeMNNCj8cKm5taoCH0CoQP945LSxqbPWrhy/bY9h7LOZMsXTKjUTRrthwmTn2CT8OkVE+dPHjmwc1PGkrn0ko2EGIp/P09XRxotTxUAbYRWGn4RBCiHatA7dho2QSqgEftgICAYuSA2MXXUpOnzlmVs2rn/yAnxipESzu+fo/2NkUxSvVDMb9g4fQzLv37l4tlTxg4fMig6kuIf629r2a6NUQt68RwLQKUEABl+q5IL6+s2pJdMtCUGSAn5LQspI8ZPnb145bqtu8VLZvIK6M4IcQASfocFAi+qpaIb8jUz+3ZsXLN03oz0MWlJ8dG9+VVDjB8JgOYpi4nSlfqeHeoJaHeIpuxLBpAL/IPCIiIHDBoybEz6zHlLVovXDJ27ePkanRcCByT3IuoVExvD9IIZOheUezXnPL9oaPPaFQtnT50wcmjiwP69uocE+nry67YoAUIA6QUjlRYAZESAYECnLhho2gIMmCMXuHv5dQ7t0bt/XOLQkeOnzFpIL5oCBSfOXMi5Qqe9iokEkfOFUULg0fu0g5p39XI2vW5LvGpq7vT0McOGJMT0jegWHOiDDthGrD8qQJ6pXrnvW1MYqEGpQK9R0+b0qj161Zynb6eQbj37wgnSRk+kV43Ru7b2Hz5+6uyFHPjBdZS9ovThCoAmqnKPcD0/7+qli+dPnziauVe8aWvmlHEjUhIHRtF7pvy9O9IL58zaAH8Txg8BEO/iltdT8cYMkBAyA4gCygWWtk6uHj4QgojIqIGDU4aPFW9b27B1597Mw8dPnqHXrdE9P94aJqM9URqgeOVyzoVzQH9o/+7tm+S71kanJg+K6duze0gnfy/3Dg7WwM8vXRT4qQesVAKkDFAypLcNMwMm7drbODh3pDDoDieITxrK79tbuGzVuk3bdoGDY1knz5w7n51z6fLlK1doN+DKlcuXcrKzz589ffL4kUP79+zYsmHNCgEf3h8b1TuiaxDc383J3sqiLfKf9H+RACoXPxEghFBhoFlLI37jXgc3D9/AoDAoQUx8Mr9xcfb8xctXr9u0defufZmHjh47fuLUqTNnzrKdOX3qxInjx44c3L931/YtGzJWLl04Z8bkCaOGpwweGN0Hy98Z7k/yZ476Dw2AwK9sAlUmfg0hVDFgYIRkYGXr6NLRy79zCL1zM3ZQcurw0RMmT5+zABys3bB5645de/buP3Dw0KHDbIcOZh7Yt3f3Tnrh5pqVSxfNmzV10rhRaSmD46L79goPC4L6u3WwJ/kT7xpsUI+OhFZmAtSwzxigty42NWjVmt46Sk7gE6C8dDYpJW3UuElTZsyev2jpilUZ6zZs2rx12/YdO3bs3Lljx/ZtW7ds3rh+7ZqVy5YsnDtrWvr4MSOGJjP8Hl2DO/l5ubs42llZmJnQi3cbov6pQzOECT8IkNdReaZmgF660gDJoEVLIxMzCys7RygB4oApGBCXkDx0ODiYTC/eXbh46fIVq1avycjIWLs2I2PN6lUrVyxbsmjB3FkzpqZPGDMyLSUpPjZKwPf39nR1gvqLd87Sq5fFy6cp/qsC/s98oBa9eZakkF69amlj54Q4kG9e7hsdM2hwytBhI8eMn5g+dfqM2XPmzV+wYCHbgvnz5s6ZNWPa5PQJ9O7plKSEgQP6R/Zk+D6e7s6OtlB/eusw5I/euUv1T9XBr2aAq2ISgsbNWrQyJiewFe/eDugS0rVHz8h+0bHxg5NSUoeNGDV2HGiYPGXKVLYpk9MnTRw/dszI4WlDhyQOiovB4tML2DsDfkdnRztEv2kbw5bN+fXr9NblatW+RgFYBQRAGi6E24JqNYQU6jcSTkDv3pdvX+8cHNadOIiKGRifmDwkJTVt2PARI0cJGzlyxLC01KEpQ5IS4mKj+/fpHRHeld+97uHuQuJnbtaGl7+hbv166P9U9U8VgQ8jAuAE1UBBbXoBrR45ARKioABe4OnjH9glOKxbj569+/SLGhA7MG5QQmJSUnLykCFDkpOTkxIHD4qPi40RL98P7wb0Ab5eHm4ujvY2JH7GYvl162P5Kf1XqeVno+VQSSHaY139xkiIrYzbtAUFdg5Ozm4eXj7+neAH3cJ7RPTsHdm3f1T0gAEDYtgGDIiO6t+3T2QvgO/eNaRL5wA/b8+Orh3I+QG/NcQfy4/sR+6P9Fc18t/nJhj4CxWFNWoJJ0Bv0NLQiCiwsrF3hBsQB4GduwSHhnXrDhoievaC9e5Nf/aMiOgR3q1raHBQF6y9tycW38nRzprhG7aC+NPy10X1UxNeJuBXLfwwZoCEoFpN5MM69RtACRAHhsYIBAsra1t7J2dXdw9Pb1+/ALAQFBwSGhbWVVhYWGhoSHBQ504B/r4+Xh4d3Vw6ONjZWCHzMfzmTbH8gI/un+RPyH+Vw68SAmSDGqQEEEM9FQVm5nADWzvHDiABnuDt4+vnHxAY2ElYYGCAv78fsHt6uLu5ODs52Npg8dsBvpGArwvvF8uvqH8VxK8RBqCgFtWFgoLmBq2MWpsQB5Y2NvYOjk7OLq5u7h4eHp5einl6enh0dHdzde7g5GBva2vVHuhNWxsbGrSQ8OH9VPwq1W+VhA+jS5NayHWhoKBxk+YtDAyNWsMP2lm0t7SytbUDC04dOjg7u7i4uLq6uDi7OAO6o4O9vY21laWFuRmtvWFLLH6TRoDP3l+Tit+qvPzCBANwgq+roypiCignNmna3KBlKyPjNiZtzczMiQVrBASZPQx/2cLp4fbtLcyx9CZtjCnymzVtDOnThC+Xvwrj13QCyoi1QEFdUKAPDhAKLVuRI5iYtjVr187CAjxYtmeztLRob27ezgwr36a1sVGrlgYtmtHi66HwkfCp96na7q8yQcFXX0EKqDtAQuBI0EcoNJUkGLcGDSamsLZs+IeJSRvCzuCbN8XaN6TFp9j/Dfwqj1/tBExBTeEGiARw0FCQ0MIANLRqZWhoZGRkbAzURoZGhoatWhJ2OH4ToNcDesr7tVH4fGHwyfhSFQpQGUEMyA0kCY2aNGkKGpo3b0FmYMB/EfKmwE7gGT1VfVj8LxE+GV8uUwAtAAXkBnXq1IMjNNDV1ddvCBoaN27cRGX4oFGjhg319fQawPHr1dXRqQ34NYFeQ/u+IPwwvmJQIPRQcEAkkCcwDXp6evoqwwe6usCOqIfq6dSqJSKfEv+XCZ9MXDa8gCIBHJAcQBRr6xANdevBHdSGjwg6yj04PsAra/8FwycTl071MXNQrUb1mioWwAMxIQ3/huARdgJPGz6fof8y4ZPJ65ccEAlAVwMgYSBCbfQJxi7AC/RfPHwyiUFwQI5ALIAGhDiiQhr+ycgZO6HHV/8p0AuTSIgDIoFcAUZwNUx8Uq68Av5PAZ9NwhEkCBoUItjEJxi7GvyfBr0wCYqNgWqagK6B/c+GXprEpmG/QS1Nfvmf0yTGPzT5ZX96k3DVJj+vNa1pTWta05rWtKY1rWlNa1rTmta0pjWtaU1rWtOa1rSmNa1pTWta05rWtKY1rWlNa1rTmta0pjWtae1fYv/2b/8PzNPBBCUEx2UAAAAASUVORK5CYII=", "ParticleTexture", scene);
                ps.gravity = particleSystem.gravity || new BABYLON.Vector3(0, -9.81, 0);
                ps.direction1 = particleSystem.direction1 || new BABYLON.Vector3(-7, 8, 3);
                ps.direction2 = particleSystem.direction2 || new BABYLON.Vector3(7, 8, -3);
                ps.minAngularSpeed = particleSystem.minAngularSpeed || 0;
                ps.maxAngularSpeed = particleSystem.maxAngularSpeed || Math.PI;
                ps.minEmitPower = particleSystem.minEmitPower || 1;
                ps.maxEmitPower = particleSystem.maxEmitPower || 3;
                ps.updateSpeed = particleSystem.updateSpeed || 0.005;
                ps.start();
                return ps;
            };
            return GUICreateParticleSystem;
        })();
        EDITOR.GUICreateParticleSystem = GUICreateParticleSystem;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.createParticleSystem.js.map