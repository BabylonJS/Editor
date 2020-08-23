import { Nullable } from "../../../../shared/types";

import { LGraphGroup, LiteGraph } from "litegraph.js";
import { GUI, GUIParams, GUIController } from "dat.gui";

import { GraphNode } from "../../../editor/graph/node";

import { Tools } from "../../../editor/tools/tools";
import { undoRedo } from "../../../editor/tools/undo-redo";

import "../../../editor/gui/augmentations/index";

import { IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/inspectors/abstract-inspector";

import GraphEditorWindow from "../index";

export class Inspector extends AbstractInspector<GraphNode | LGraphGroup> {
    /**
     * Defines the reference to the graph editor's window.
     */
    protected graphEditor: GraphEditorWindow;
    /**
     * Defines the reference to current node being updated.
     */
    protected node: Nullable<GraphNode> = null;

    private _shape: string = "";

    /**
     * Constructor.
     * @param editor the editor reference.
     * @param selectedObject the currently selected object reference.
     * @param ref the ref of the inspector properties.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.handleUndoRedo = false;

        this.graphEditor = props.editor as any;
        this.graphEditor.inspector = this;
    }

    /**
     * Called on the component did moubnt.
     */
    public componentDidMount(): void {
        this.tool = new GUI({ autoPlace: false, scrollable: true } as GUIParams);
        (this._div ?? document.getElementById(this._id!))?.appendChild(this.tool.domElement);
    }

    /**
     * Sets the group to edit.
     * @param group defines the reference to the group to edit.
     */
    public setGroup(group: LGraphGroup): void {
        this.selectedObject = group;
        this.onUpdate();
    }

    /**
     * Sets the node to edit.
     * @param node defines the reference to the node to edit.
     */
    public setNode(node: GraphNode): void {
        this.selectedObject = node;
        this.onUpdate();
    }

    /**
     * Called on a controller changes.
     * @param folder the folder containing the modified controller.
     * @param controller the controller that has been modified.
     */
    public onControllerChange(_?: GUI, __?: GUIController): void {
        this.graphEditor.graph.refresh();
    }

    /**
     * Called on a controller finished changes.
     * @param folder the folder containing the modified controller.
     * @param controller the controller that has been modified.
     */
    public onControllerFinishChange(_?: GUI, controller?: GUIController): void {
        if (!controller) { return; }

        const object = controller.object as any;
        if (!object || object === this) { return; }

        const node = this.selectedObject;
        const property = controller.property;
        const value = object[property];
        const initialValue = controller["initialValue"];

        if (value === initialValue) { return; }

        undoRedo.push({
            common: () => {
                this.refreshDisplay();
                if (node instanceof GraphNode) {
                    this._notifyPropertyChanged(node, object, property);
                }

                this.graphEditor.graph.refresh();
            },
            undo: () => object[property] = initialValue,
            redo: () => object[property] = value,
        });
    }

    /**
     * Resizes the edition tool.
     * @param size defines the size of the panel.
     */
    public resize(): void {
        this.tool!.width = this.graphEditor.getPanelSize("inspector").width;
    }

    /**
     * Called on the component did mount.
     * @override
     */
    public onUpdate(): void {
        if (this.node) { this.node.onWidgetChange = null; }
        this.node = null;

        this.clear();

        if (this.selectedObject instanceof LGraphGroup) {
            this._addGroup(this.selectedObject);
        } else {
            this._addNode(this.selectedObject);
        }

        this.resize();
        setTimeout(() => this._handleChanged(), 0);
    }

    /**
     * Adds all the group editable properties.
     */
    private _addGroup(group: LGraphGroup): void {
        const folder = this.tool!.addFolder("Group");
        folder.open();
        folder.add(group, "title").name("Title");
        folder.addColor(group, "color").name("Color");
    }

    /**
     * Adds all the node editable properties.
     */
    private _addNode(node: GraphNode): void {
        this.node = node;
        this.node.onWidgetChange = () => this.onUpdate();

        // Configure
        node.bgcolor = node.bgcolor ?? LiteGraph.NODE_DEFAULT_BGCOLOR;
        node.boxcolor = node.boxcolor ?? LiteGraph.NODE_DEFAULT_BOXCOLOR;
        node.shape = node.shape ?? LiteGraph.ROUND_SHAPE;

        // Functions
        const functions = this.tool!.addFolder("Functions");
        functions.open();
        functions.addButton("Focus").onClick(() => node.focusOn());

        this._addNodeCommon(node);
        this._addNodeColor(node);
        this._addNodeProperties(node);
    }

    /**
     * Adds the common node editable properties.
     */
    private _addNodeCommon(node: GraphNode): void {
        const common = this.tool!.addFolder("Common");
        common.open();
        common.add(node, "title").name("Title");

        const shapes: string[] = ["BOX_SHAPE", "ROUND_SHAPE", "CIRCLE_SHAPE", "CARD_SHAPE", "ARROW_SHAPE"];
        this._shape = shapes.find((s) => node.shape === LiteGraph[s])!;
        common.addSuggest(this, "_shape", shapes).name("Shape").onChange(() => {
            const newShape = this._shape;
            const oldShape = shapes.find((s) => node.shape === LiteGraph[s])!;

            undoRedo.push({
                common: () => {
                    this.refreshDisplay();
                    this.graphEditor.graph.refresh();
                },
                undo: () => node.shape = LiteGraph[oldShape],
                redo: () => node.shape = LiteGraph[newShape],
            });
        });
    }

    /**
     * Adds the color node editable properties.
     */
    private _addNodeColor(node: GraphNode): void {
        const colors = this.tool!.addFolder("Colors");
        colors.open();
        colors.addColor(node, "bgcolor").name("Background Color");
        colors.addColor(node, "boxcolor").name("Box Color");
    }

    /**
     * Adds the node properties editable properties.
     */
    private _addNodeProperties(node: GraphNode): void {
        const properties = this.tool!.addFolder("Properties");
        properties.open();

        for (const p in node.properties) {
            const widget = node.widgets?.find((w) => w.name === p);

            if (widget?.options?.values) {
                const values = (typeof(widget.options.values) === "function") ? widget.options.values() : widget.options.values;
                const propertyController = properties.addSuggest(node.properties, p, values).name(this._getFormatedname(p)).onChange((r) => {
                    const initialValue = propertyController["initialValue"];
                    undoRedo.push({
                        common: () => {
                            this.tool?.updateDisplay();
                            this.graphEditor.graph.refresh();
                        },
                        undo: () => {
                            node.properties[p] = initialValue;
                            node.propertyChanged(p, initialValue);
                        },
                        redo: () => {
                            node.properties[p] = r;
                            node.propertyChanged(p, r);
                        },
                    });
                });
                continue;
            }

            const value = node.properties[p];
            const ctor = Tools.GetConstructorName(value).toLowerCase();

            let controller: Nullable<GUIController> = null;
            switch (ctor) {
                case "number":
                case "string":
                case "boolean":
                    controller = properties.add(node.properties, p).name(this._getFormatedname(p));
                    break;
                case "vector2":
                case "vector3":
                    controller = properties.addVector(this._getFormatedname(p), value) as any;
                    break;
                case "color3":
                    controller = properties.addAdvancedColor(this._getFormatedname(p), value) as any;
                    break;
            }

            if (controller && widget) {
                if (widget.options?.min && controller.min) { controller.min(widget.options.min); }
                if (widget.options?.max && controller.max) { controller.max(widget.options.max); }
                if (widget.options?.step && controller.step) { controller.step(widget.options.step); }
            }
        }
    }

    /**
     * Notifies the given node that property changed.
     */
    private _notifyPropertyChanged(node: GraphNode, object: any, property: string): void {
        if (object !== node.properties) {
            for (const key in node.properties) {
                const value = node.properties[key];
                if (value === object) {
                    property = `${key}.${property}`;
                    break;
                }
            }
        }

        const split = property.split(".");
        node.propertyChanged(property, Tools.GetEffectiveProperty<any>(node.properties, property)[split.pop()!]);
    }

    /**
     * Returns the name of the folder or node in its formated form.
     */
    private _getFormatedname(name: string): string {
        return name[0].toUpperCase() + name.substr(1, name.length - 1).replace(/_/g, " ");
    }
}
