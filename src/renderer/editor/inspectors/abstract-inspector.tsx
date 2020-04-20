import * as React from "react";
import { GUI, GUIParams, GUIController } from "dat.gui";
import { Divider, InputGroup, Classes } from "@blueprintjs/core";

import { Node, Color3, Tags, Color4, Vector3, Vector4, BaseTexture } from "babylonjs";

import { Nullable } from "../../../shared/types";

import { Editor } from "../editor";

import { SuggestController } from "../gui/augmentations/suggest";
import { TextureAssets } from "../assets/textures";

import { IObjectInspectorProps } from "../components/inspector";

import { undoRedo } from "../tools/undo-redo";
import { IObjectModified } from "../tools/types";

export abstract class AbstractInspector<T> extends React.Component<IObjectInspectorProps> {
    /**
     * Defines the GUI reference.
     */
    public tool: Nullable<GUI> = null;
    
    /**
     * The editor reference.
     */
    protected editor: Editor;
    /**
     * The selected object reference.
     */
    protected selectedObject: T;

    private _id: string;
    private _isMounted: boolean = false;

    /**
     * Constructor.
     * @param editor the editor reference.
     * @param selectedObject the currently selected object reference.
     * @param ref the ref of the inspector properties.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.editor = props.editor;
        this._id = props.toolId;
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div id={this._id} style={{ width: "100%", height: "100%" }}>
                <InputGroup className={Classes.FILL} leftIcon={"search"} type="search" placeholder="Search..." onChange={(e) => this._handleSearchChanged(e.target.value)} />
                <Divider />
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public abstract onUpdate(): void;

    /**
     * Called on a controller changes.
     */
    public onControllerChange(): void {
        // Empty. Can be overrided by other inspectors.
    }

    /**
     * Called on a controller finished changes.
     */
    public onControllerFinishChange(): void {
        Tags.AddTagsTo(this.selectedObject, "modified");
    }

    /**
     * Gets wether or not the component is mounted.
     */
    protected get isMounted(): boolean {
        return this._isMounted;
    }

    /**
     * Called on the component did moubnt.
     */
    public componentDidMount(): void {
        this.selectedObject = this.editor.inspector.selectedObject;
        this._isMounted = true;

        this.tool = new GUI({ autoPlace: false, scrollable: true } as GUIParams);
        document.getElementById(this._id!)?.appendChild(this.tool.domElement);

        this.resize();
        this.onUpdate();

        setTimeout(() => this._handleChanged(), 0);
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        this._isMounted = false;
        if (this.tool) { this.tool.destroy(); }
    }

    /**
     * Refreshes the inspector tool.
     */
    public refresh(): void {
        this.editor.inspector.refresh();
    }

    /**
     * Refreshes the edition tool.
     */
    public refreshDisplay(): void {
        if (this.tool) {
            this.tool.updateDisplay();
        }
    }

    /**
     * Clears the given folder.
     */
    public clearFolder(folder: GUI): void {
        while (folder.__controllers.length) {
            folder.remove(folder.__controllers[0]);
        }

        for (const key in folder.__folders) {
            folder.removeFolder(folder.__folders[key]);
        }
    }

    /**
     * Resizes the edition tool.
     */
    public resize(): void {
        const size = this.editor.getPanelSize("inspector");
        if (this.tool) {
            this.tool.width = size.width;
            this.tool.domElement.style.height = `${size.height - 100}px`;
        }
    }

    /**
     * Returns the reference to the texture identified by the given editor name.
     * @param editorName the name of the texture to find.
     */
    protected getTexture(editorName: string): Nullable<BaseTexture> {
        if (editorName === "None") { return null; }

        const texture = this.editor.scene!.textures.find((t) => t.metadata?.editorName === editorName);
        return texture ?? null;
    }

    /**
     * Adds a new texture field to the inspector.
     * @param parent the parent folder where to add the texture field.
     * @param object the object to modify.
     * @param property the property to modify in the given object.
     * @param onChange optional callback called on the texture changed.
     */
    protected addTexture(parent: GUI = this.tool!, object: any, property: string, onChange?: (texture: Nullable<BaseTexture>) => void): SuggestController {
        const assets = this.editor.assets.getAssetsOf(TextureAssets)!;
        const textures = ["None"].concat(assets.map((a) => a.id));

        if (!assets) {
            return parent.addSuggest(object, property, textures);
        }

        const o = { textureName: object[property]?.metadata?.editorName ?? "None" };

        return parent.addSuggest(o, "textureName", textures, {
            onShowIcon: (i) => {
                const asset = assets.find((a) => a.id === i);
                if (!asset) { return undefined; }

                return <img src={asset.base64} style={{ width: 20, height: 20 }}></img>;
            },
            onShowTooltip: (i) => {
                const asset = assets.find((a) => a.id === i);
                if (!asset) { return undefined; }

                return <img src={asset.base64} style={{ maxWidth: "100%", width: 100, maxHeight: "100%", height: 100 }}></img>;
            },
        }).onChange(() => {
            object[property] = this.getTexture(o.textureName);
            if (onChange) { onChange(object[property]); }
        });
    }

    /**
     * Adds a color folder to edit RGB(A)
     * @param parent the parent folder where to add the color folder.
     * @param name the name of the color folder.
     * @param object the base object to modify.
     * @param property the path to the color property.
     */
    protected addColor(parent: GUI, name: string, object: any, property: string): GUI {
        const folder = parent.addFolder(name);
        folder.open();

        const color = object[property] as Color3;
        const getHexString = () => {
            const hex = color.toHexString();
            return (color instanceof Color4 ? hex.slice(0, 7) : hex);
        };
        const o = { color: getHexString() };

        folder.add(color, "r").min(0).max(1).step(0.01).onChange(() => {
            o.color = getHexString();
            this.refreshDisplay();
        });
        folder.add(color, "g").min(0).max(1).step(0.01).onChange(() => {
            o.color = getHexString();
            this.refreshDisplay();
        });
        folder.add(color, "b").min(0).max(1).step(0.01).onChange(() => {
            o.color = getHexString();
            this.refreshDisplay();
        });

        if (color instanceof Color4) {
            folder.add(color, "a").min(0).max(1).step(0.01);
        }

        folder.addColor(o, "color").name("Color").onChange(() => {
            const value = Color3.FromHexString(o.color);
            object[property].r = value.r;
            object[property].g = value.g;
            object[property].b = value.b;
            this.refreshDisplay();
        });

        return folder;
    }

    /**
     * Adds a vector folder to edit XY(Z)(W)
     * @param parent the parent folder where to add the vector folder.
     * @param name the name of the vector folder.
     * @param object the base object to modify.
     * @param property the path to the vector property.
     */
    protected addVector(parent: GUI, name: string, object: any, property: string): GUI {
        const folder = parent.addFolder(name);
        folder.open();

        const vec = object[property];
        folder.add(vec, "x").step(0.1);
        folder.add(vec, "y").step(0.1);

        if (vec instanceof Vector3 || vec instanceof Vector4) {
            folder.add(vec, "z").step(0.1);
        }

        if (vec instanceof Vector4) {
            folder.add(vec, "w").step(0.1);
        }

        return folder;
    }

    /**
     * Called on the user wants to filter the tools.
     */
    private _handleSearchChanged(filter: string, root?: GUI): void {
        if (!root) { root = this.tool!; }

        for (const f in root.__folders) {
            const folder = root.__folders[f];
            let fullFolder = false;

            if (folder.name.toLowerCase().indexOf(filter.toLowerCase()) === -1) {
                folder.domElement.style.display = "none";
            } else {
                folder.domElement.style.display = '';

                // Found, re-show parents
                let parent = folder.parent;
                while (parent && parent.name) {
                    parent.domElement.style.display = '';
                    parent = parent.parent;
                }

                fullFolder = true;
            }

            // Controllers
            folder.__controllers.forEach(c => {
                // Get li element
                const li = c["__li"];
                if (!li) { return; }

                // Full folder? show controllers of the current folder
                if (fullFolder) {
                    li.style.display = '';
                    return;
                }

                // Filter li element
                if (li.innerText.toLowerCase().indexOf(filter.toLowerCase()) === -1) {
                    li.style.display = "none";
                } else {
                    li.style.display = '';

                    // Found, re-show parents
                    let parent = c["__gui"];
                    while (parent && parent.name) {
                        parent.domElement.style.display = '';
                        parent = parent.parent;
                    }
                }
            });

            this._handleSearchChanged(filter, folder);
        }
    }

    /**
     * Called on the tool is mounted to handle onChange & onFinishChange
     */
    private _handleChanged(root?: GUI): void {
        if (!root) { root = this.tool!; }

        root.__controllers.forEach((c) => {
            const existingChangeFn = c["__onChange"];
            const existingFinishChangeFn = c["__onFinishChange"];

            c.onChange((r) => {
                if (existingChangeFn) { existingChangeFn(r); }
                this.onControllerChange();

                if (c.object === this) { return; }

                const modificationInfos = { object: this.selectedObject, path: this._getPropertyPath(c) } as IObjectModified<T>;
                if (this.selectedObject instanceof Node && this.selectedObject.metadata && this.selectedObject.metadata.prefab) {
                    this.selectedObject.metadata.prefab.properties = this.selectedObject.metadata.prefab.properties ?? { };
                    this.selectedObject.metadata.prefab.properties![modificationInfos.path] = true;
                }
                this.editor.objectModigyingObservable.notifyObservers(modificationInfos);
            });

            c.onFinishChange((r) => {
                if (existingFinishChangeFn) { existingFinishChangeFn(r); }
                this.onControllerFinishChange();
                
                if (c.object === this) { return; }
                
                // Notify
                const modificationInfos = { object: this.selectedObject, path: this._getPropertyPath(c) } as IObjectModified<T>;
                this.editor.objectModifiedObservable.notifyObservers(modificationInfos);

                // Undo/redo
                if (!c.object) { return; }
                const property = c["property"];
                const initialValue = c["initialValue"];

                undoRedo.push({
                    common: () => {
                        this.tool?.updateDisplay();
                        this.editor.graph.refresh();
                    },
                    redo: () => c.object[property] = r,
                    undo: () => c.object[property] = initialValue,
                });
            });
        });

        for (const f in root.__folders) {
            this._handleChanged(root.__folders[f]);
        }
    }

    /**
     * Returns the proeprty path of the controller.
     */
    private _getPropertyPath(controller: GUIController): string {
        if (!controller.__path) {
            if (controller.object === this.selectedObject) {
                return controller.property;
            }

            for (const key in this.selectedObject) {
                const value = this.selectedObject[key];
                if (value === controller.object) {
                    return `${key}.${controller["property"]}`;
                }
            }
        }

        return `${controller.__path + "." ?? ""}${controller["property"]}`;
    }
}
