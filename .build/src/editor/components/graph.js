"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var tools_1 = require("../tools/tools");
var EditorGraph = /** @class */ (function () {
    function EditorGraph(editor) {
        var _this = this;
        this.editor = editor;
        this.root = 'ROOT';
        this.currentObject = this.editor.core.scene;
        // Build graph
        this.graph = $("#jstree").jstree({
            "core": {
                "check_callback": true,
                "multiple": false
            },
            "plugins": [
                "contextmenu", "dnd", "search",
                "state", "types", "wholerow"
            ],
            "search": {
                "show_only_matches": true,
                "show_only_matches_children": true
            },
            'contextmenu': {
                'items': customMenu
            }
        }).on('create_node.jstree', function (e, data) {
            console.log('added');
        }).on('changed.jstree', function (e, data) {
            if (data.node) {
                //Actions for selecting node
                if (data.action == "select_node") {
                    _this.currentObject = data.node.data;
                    _this.currentObjectId = data.node.id;
                    _this.editor.core.onSelectObject.notifyObservers(data.node.data);
                }
            }
        });
        ;
        //Manage Contextmenu
        function customMenu(node) {
            var items = {
                'Delete': {
                    'label': 'Delete',
                    'action': function () {
                        console.log(node);
                        node.data && node.data.dispose && node.data.dispose();
                        $("#jstree").jstree("delete_node", node);
                    }
                }
            };
            if (node.id == this.root) {
                items = null;
            }
            return items;
        }
        //Search Function
        var to = null;
        $('#jstree_search').keyup(function () {
            if (to) {
                clearTimeout(to);
            }
            to = setTimeout(function () {
                $('#jstree').jstree(true).search($('#jstree_search').val().toString());
            }, 250);
        });
        this.editor.core.onSelectObject.add(function (node) { return node && _this.select(node.id); });
    }
    /**
    * Rename the node with id "id"
    * @param id the id of the node
    * @param name the new name/id
    */
    EditorGraph.prototype.renameNode = function (id, name) {
        $("#jstree").jstree('rename_node', id, name);
    };
    /**
     * Set parent of the given node (id)
     * @param id the id of the node
     * @param parentId the parent id
     */
    EditorGraph.prototype.setParent = function (id, parentId) {
        /*const parent = <GraphNode>this.graph.element.get(parentId);
        const node = <GraphNode>this.graph.element.get(id);

        parent.count = parent.count ? parent.count++ : 1;

        this.graph.element.remove(node.id);
        this.graph.element.add(parent.id, node);*/
        //this.graph.element.expandParents(node.id);
    };
    /**
     * Adds a new node
     * @param node: the node to add
     * @param parentId: the parent id of the node to add
     */
    EditorGraph.prototype.add = function (node, parentId) {
        //this.graph.element.add(parentId, node);
        console.log(parentId);
        console.log(node);
    };
    /**
     * Selects the given node id
     * @param id the node id
     */
    EditorGraph.prototype.select = function (id) {
        if (id != this.currentObjectId) {
            $('#jstree').jstree("deselect_all");
            $('#jstree').jstree('select_node', id);
            $('#jstree').jstree("open_node", $(id));
        }
    };
    /**
     * Returns the selected node id
     */
    EditorGraph.prototype.getSelected = function () {
        return this.currentObjectId;
    };
    /**
     * Clears the graph
     */
    EditorGraph.prototype.clear = function () {
        $("#jstree").jstree(true).delete_node($("#jstree").jstree(true).get_node(this.root).children);
    };
    /**
     * Fills the graph
     * @param scene: the root scene
     * @param root: the root node
     */
    EditorGraph.prototype.fill = function (scene, root) {
        var _this = this;
        if (scene === void 0) { scene = this.editor.core.scene; }
        var nodes = root ? root.getDescendants() : [];
        if (!root) {
            // Set scene's node
            $('#jstree').jstree().create_node("#", {
                "id": this.root,
                "text": "Scene",
                "data": scene,
                "icon": "w2ui-icon icon-scene"
            });
            //this.graph.element.expand(this.root);
            //this.graph.element.select(this.root);
            this.editor.edition.setObject(scene);
            // Sort nodes alphabetically
            tools_1.default.SortAlphabetically(scene.cameras, 'name');
            tools_1.default.SortAlphabetically(scene.lights, 'name');
            tools_1.default.SortAlphabetically(scene.meshes, 'name');
            // Set nodes
            scene.cameras.forEach(function (c) { return !c.parent && nodes.push(c); });
            scene.lights.forEach(function (l) { return !l.parent && nodes.push(l); });
            scene.meshes.forEach(function (m) { return !m.parent && nodes.push(m); });
            // Set sounds
            this.fillSounds(scene, scene);
        }
        else {
            tools_1.default.SortAlphabetically(nodes, 'name');
        }
        // Add nodes
        nodes.forEach(function (n) {
            // Create a random ID if not defined
            if (!n.id)
                n.id = babylonjs_1.Tools.RandomId();
            // Instance?
            var parent = root ? root.id : _this.root;
            var parentNode = $('#jstree').jstree().create_node(_this.root, {
                "id": n.id,
                "text": n.name,
                "data": n,
                "icon": "w2ui-icon " + _this.getIcon(n),
            });
            $('#jstree').jstree("open_all");
            // Cannot add
            if (!parentNode)
                return;
            // Camera? Add post-processes
            if (n instanceof babylonjs_1.Camera) {
                n._postProcesses.forEach(function (p) {
                    $('#jstree').jstree().create_node(n.id, {
                        "id": p.name,
                        "text": p.name,
                        "data": p,
                        "icon": "w2ui-icon icon-camera",
                    });
                });
            }
            // Sub meshes
            if (n instanceof babylonjs_1.AbstractMesh && n.subMeshes && n.subMeshes.length > 1) {
                n.subMeshes.forEach(function (sm, index) {
                    $('#jstree').jstree().create_node(n.id, {
                        "id": n.id + 'submesh_' + index,
                        "text": sm.getMaterial().name,
                        "data": sm,
                        "icon": "w2ui-icon " + _this.getIcon(n),
                    });
                });
            }
            // Check particle systems
            scene.particleSystems.forEach(function (ps) {
                if (ps.emitter === n) {
                    $('#jstree').jstree().create_node(n.id, {
                        "id": ps.id,
                        "text": ps.name,
                        "data": ps,
                        "icon": "w2ui-icon " + _this.getIcon(ps),
                    });
                }
            });
            // Check lens flares
            scene.lensFlareSystems.forEach(function (lf) {
                if (lf.getEmitter() === n) {
                    $('#jstree').jstree().create_node(n.id, {
                        "id": lf.id,
                        "text": lf.name,
                        "data": lf,
                        "icon": "w2ui-icon " + _this.getIcon(lf),
                    });
                }
            });
            // Sounds
            _this.fillSounds(scene, n);
            // Fill descendants
            _this.fill(scene, n);
            $('#jstree').jstree("open", _this.root);
        });
    };
    /**
    * Returns the icon related to the object type
    * @param object
    */
    EditorGraph.prototype.getIcon = function (obj) {
        if (obj instanceof babylonjs_1.AbstractMesh) {
            return 'icon-mesh';
        }
        else if (obj instanceof babylonjs_1.Light) {
            return 'icon-light';
        }
        else if (obj instanceof babylonjs_1.Camera) {
            return 'icon-camera';
        }
        else if (obj instanceof babylonjs_1.ParticleSystem || obj instanceof babylonjs_1.GPUParticleSystem) {
            return 'icon-particles';
        }
        else if (obj instanceof babylonjs_1.PostProcess) {
            return 'icon-helpers';
        }
        else if (obj instanceof babylonjs_1.Sound) {
            return 'icon-sound';
        }
        return null;
    };
    /**
     * Fills the sounds giving the scene and the root node (attached mesh or scene)
     * @param scene: the scene containing the sound
     * @param root: the root node to check
     */
    EditorGraph.prototype.fillSounds = function (scene, root) {
        // Set sounds
        /*if (scene.soundTracks.length === 0 || scene.soundTracks[0].soundCollection.length === 0)
            return;

        let count = 0;
    
        scene.soundTracks.forEach(st => {
            st.soundCollection.forEach(s => {
                if (root === scene && !s['_connectedMesh']) {
                    this.graph.element.add(this.root, <GraphNode>{
                        id: s.name,
                        text: s.name,
                        img: this.getIcon(s),
                        data: s
                    });
                }
                else if (s['_connectedMesh'] === root) {
                    this.graph.element.add((<Node> root).id, <GraphNode>{
                        id: s.name,
                        text: s.name,
                        img: this.getIcon(s),
                        data: s
                    });

                    count++;
                }
            });
        });

        return count;*/
        return 22;
    };
    /**
     * On the user clicks on a context menu item
     * @param id the context menu item id
     * @param node the related graph node
     */
    EditorGraph.prototype.onMenuClick = function (id, node) {
        /*
        switch (id) {
            // Clone
            case 'clone':
                if (!node || !(node.data instanceof Node))
                    return;
                
                const clone = node && node.data && node.data['clone'] && node.data['clone']();
                clone.name = node.data.name + ' Cloned';
                clone.id = BabylonTools.RandomId();

                const parent = clone.parent ? clone.parent.id :this.root;
                this.graph.add({ id: clone.id, text: clone.name, img: this.getIcon(clone), data: clone }, parent);
                
                // Setup this
                this.currentObject = clone;
                this.editor.core.onSelectObject.notifyObservers(clone);
                break;
            // Other
            default:
                break;
        }*/
    };
    return EditorGraph;
}());
exports.default = EditorGraph;
//# sourceMappingURL=graph.js.map