import {
    Scene, Node, Mesh, AbstractMesh, Light, Camera, InstancedMesh,
    Sound,
    ParticleSystem, GPUParticleSystem, IParticleSystem,
    PostProcess,
    Tools as BabylonTools
} from 'babylonjs';

import Editor from '../editor';
import Tools from '../tools/tools';
import Graph, { GraphNode } from '../gui/graph';
import SceneFactory from '../scene/scene-factory';

export default class EditorGraph {
    // Public members
    public graph: Graph;
    public root: string = 'ROOT';

    public currentObject: any = this.editor.core.scene;
    public currentObjectId: string;

    constructor(protected editor: Editor) {

        // Build graph
        this.graph = $("#jstree").jstree({
            "core": {
              "check_callback": true,
              "multiple": false
            },
            "types" : {     
                "#" : {
                     "max_children" : 1
                 }
             },
            "dnd" : {
                "use_html5" : true,
                "is_draggable" : function(node) {
                    if ((node[0].data instanceof ParticleSystem || node[0].data instanceof GPUParticleSystem)) {
                        return false;
                    }
                    return true;
                }
            },
            "plugins" : [
              "contextmenu", "dnd", "search",
              "state", "types", "wholerow"
            ],
            "search": {
                "show_only_matches": true,
                "show_only_matches_children": true
            },
            'contextmenu' : {
                'items' : customMenu
            }
          // Parenting by drag and drop
          }).on('move_node.jstree', function(e, data) {
            data.node.data.parent = editor.core.scene.getNodeByName(data.parent);
          }).on('changed.jstree',  (e,data) => {
            if (data.node){
                //Actions for selecting node
              if (data.action == "select_node"){
                  this.currentObject = data.node.data;
                  this.currentObjectId = data.node.id;
                  this.editor.core.onSelectObject.notifyObservers(data.node.data);
              }
            }

          });;

        //Manage Contextmenu
        function customMenu(node)
        {
            var items = {
                'Delete' : {
                    'label' : 'Delete',
                    'icon': 'w2ui-icon icon-error',
                    'action' : function () {
                        node.data && node.data.dispose && node.data.dispose();
                        $("#jstree").jstree("delete_node", node);
                    }
                },
                'Clone' : {
                    'label' : 'Clone',
                    'icon': 'w2ui-icon icon-clone',
                    'action' : function () {
                        console.log(node);
                        const clone = node && node.data && node.data['clone'] && node.data['clone']();
                        clone.name = node.data.name + ' Cloned';
                        clone.id = BabylonTools.RandomId();
                        clone.icon = node.icon
        
                        const parent = clone.parent ? clone.parent.id :'ROOT';
                        $('#jstree').jstree().create_node(parent, {
                            "id": clone.id,
                            "text": clone.name,
                            "data": clone,
                            "icon": clone.icon
                          });

                        // Setup this
                        editor.core.onSelectObject.notifyObservers(clone);
                    }
                }
            }
        
            if (node.id == this.root){
                items = null;
            }
        
            return items;
        }

        //Search Function
        var to = null;
        $('#jstree_search').keyup(function () {
          if(to) { clearTimeout(to); }
          to = setTimeout(function () {
            $('#jstree').jstree(true).search($('#jstree_search').val().toString());
          }, 250);
        });

        this.editor.core.onSelectObject.add((node: Node) => node && this.select(node.id) );

    }

    /**
    * Rename the node with id "id"
    * @param id the id of the node
    * @param name the new name/id
    */
    public renameNode (id: string, name: string): void {
        $("#jstree").jstree('rename_node', id , name );
    }

    /**
     * Set parent of the given node (id)
     * @param id the id of the node
     * @param parentId the parent id
     */
    public setParent (id: string, parentId: string): void {
        /*const parent = <GraphNode>this.graph.element.get(parentId);
        const node = <GraphNode>this.graph.element.get(id);

        parent.count = parent.count ? parent.count++ : 1;

        this.graph.element.remove(node.id);
        this.graph.element.add(parent.id, node);*/
        //this.graph.element.expandParents(node.id);
    }

    /**
     * Adds a new node
     * @param node: the node to add
     * @param parentId: the parent id of the node to add
     */
    public add (node: GraphNode, parentId: string): void {
        //this.graph.element.add(parentId, node);
        console.log(parentId);
        console.log(node);
    }

    /**
     * Selects the given node id
     * @param id the node id
     */
    public select (id: string): void {
        if(id != this.currentObjectId){
           $('#jstree').jstree("deselect_all");
            $('#jstree').jstree('select_node', id);
            $('#jstree').jstree("open_node", $(id));
        }
    }

    /**
     * Returns the selected node id
     */
    public getSelected (): string {
        return this.currentObjectId;
    }

    /**
     * Clears the graph
     */
    public clear (): void {
        $("#jstree").jstree(true).delete_node($("#jstree").jstree(true).get_node(this.root).children);
    }

    /**
     * Fills the graph
     * @param scene: the root scene
     * @param root: the root node
     */
    public fill(scene: Scene = this.editor.core.scene, root?: Node): void {
        let nodes = root ? root.getDescendants() : [];

        if (!root) {
            // Set scene's node
            $('#jstree').jstree().create_node("#", {
                "id": this.root,
                "text": "Scene",
                "data": scene,
                "icon" : "w2ui-icon icon-scene"
              });

            //this.graph.element.expand(this.root);
            //this.graph.element.select(this.root);
            this.editor.edition.setObject(scene);

            // Sort nodes alphabetically
            Tools.SortAlphabetically(scene.cameras, 'name');
            Tools.SortAlphabetically(scene.lights, 'name');
            Tools.SortAlphabetically(scene.meshes, 'name');

            // Set nodes
            scene.cameras.forEach(c => !c.parent && nodes.push(c));
            scene.lights.forEach(l => !l.parent && nodes.push(l));
            scene.meshes.forEach(m => !m.parent && nodes.push(m));

            // Set sounds
            this.fillSounds(scene, scene);
        }
        else {
            Tools.SortAlphabetically(nodes, 'name');
        }

        // Add nodes
        nodes.forEach(n => {
            // Create a random ID if not defined
            if (!n.id)
                n.id = BabylonTools.RandomId();

            // Instance?
            const parent = root ? root.id : this.root;
            const parentNode = $('#jstree').jstree().create_node(this.root, {
                "id": n.id,
                "text": n.name,
                "data": n,
                "icon" : this.getIcon(n),
              });
              $('#jstree').jstree("open_all");

            // Cannot add
            if (!parentNode)
                return;

            // Camera? Add post-processes
            if (n instanceof Camera) {
                n._postProcesses.forEach(p => {
                    $('#jstree').jstree().create_node(n.id, {
                        "id": p.name,
                        "text": p.name,
                        "data": p,
                        "icon" : "w2ui-icon icon-camera",
                      });
                });
            }

            // Sub meshes
            if (n instanceof AbstractMesh && n.subMeshes && n.subMeshes.length > 1) {
                n.subMeshes.forEach((sm, index) => {
                    $('#jstree').jstree().create_node(n.id, {
                        "id": n.id + 'submesh_' + index,
                        "text": sm.getMaterial().name,
                        "data": sm,
                        "icon" : this.getIcon(n)
                      });
                });
            }

            // Check particle systems
            scene.particleSystems.forEach(ps => {
                if (ps.emitter === n) {
                    $('#jstree').jstree().create_node(n.id, {
                        "id": ps.id,
                        "text": ps.name,
                        "data": ps,
                        "icon" : this.getIcon(ps),
                      });
                }
            });

            // Check lens flares
            scene.lensFlareSystems.forEach(lf => {
                if (lf.getEmitter() === n) {
                    $('#jstree').jstree().create_node(n.id, {
                        "id": lf.id,
                        "text": lf.name,
                        "data": lf,
                        "icon" : this.getIcon(lf),
                      });
                }
            });

            
            // Sounds
            this.fillSounds(scene, n);

            // Fill descendants
            this.fill(scene, n);

            $('#jstree').jstree("open", this.root);
        });
    }

    /**
    * Returns the icon related to the object type
    * @param object 
    */
    public getIcon(obj: any): string {
        if (obj instanceof AbstractMesh) {
            return 'w2ui-icon icon-mesh';
        } else if (obj instanceof Light) {
            return 'w2ui-icon icon-light';
        } else if (obj instanceof Camera) {
            return 'w2ui-icon icon-camera';
        } else if (obj instanceof ParticleSystem || obj instanceof GPUParticleSystem) {
            return 'w2ui-icon icon-particles';
        } else if (obj instanceof PostProcess) {
            return 'w2ui-icon icon-helpers';
        } else if (obj instanceof Sound) {
            return 'w2ui-icon icon-sound';
        }

        return null;
    }

    /**
     * Fills the sounds giving the scene and the root node (attached mesh or scene)
     * @param scene: the scene containing the sound
     * @param root: the root node to check
     */
    protected fillSounds (scene: Scene, root: Scene | Node): number {
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
        return 22
    }

    /**
     * On the user clicks on a context menu item
     * @param id the context menu item id
     * @param node the related graph node
     */
    protected onMenuClick (id: string, node: GraphNode): void {
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
    }
}