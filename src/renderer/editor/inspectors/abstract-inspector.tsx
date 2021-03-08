import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, InputGroup } from "@blueprintjs/core";

import { Texture, Material, ISize } from "babylonjs";

import { IObjectInspectorProps } from "../components/inspector";

import { TextureAssets } from "../assets/textures";
import { MaterialAssets } from "../assets/materials";

import { IInspectorListItem } from "../gui/inspector/list";

import { Editor } from "../editor";

export abstract class AbstractInspector<T, S> extends React.Component<IObjectInspectorProps, S> {
    /**
     * Defines the reference to the editor.
     */
    protected editor: Editor;
    /**
     * Defines the reference to the edited root object (node, sound, etc.).
     */
    protected selectedObject: T;

    private _inspectorDiv: Nullable<HTMLDivElement> = null;
    private _isMounted: boolean = false;

    /**
    * Constructor.
    * @param props the component's props.
    */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.editor = props.editor;
        this.selectedObject = props._objectRef;
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const content = this.renderContent();

        return (
            <>
                <div style={{ width: "100%", height: "35px" }}>
                    <InputGroup className={Classes.FILL} leftIcon={"search"} type="search" placeholder="Search..." onChange={() => { debugger; }} />
                </div>
                <div ref={(ref) => this._inspectorDiv = ref} style={{ width: "100%", height: "100%", overflow: "auto" }}>
                    {content}
                </div>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        this._isMounted = true;

        this.resize();
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        this._isMounted = false;
    }

    /**
     * Gets wether or not the component is mounted.
     */
    public get isMounted(): boolean {
        return this._isMounted;
    }

    /**
     * Resizes the inspector.
     * @param size defines the new size of the panel.
     */
    public resize(size?: ISize): void {
        if (!this._inspectorDiv) { return; }

        size = size ?? this.editor.getPanelSize("inspector");
        this._inspectorDiv.style.height = `${size.height - 80}px`;
    }

    /**
     * Refreshes the edition tool.
     */
    public refreshDisplay(): void {
        if (this.isMounted) {
            // Call refresh
        }
    }

    /**
     * Renders the content of the inspector.
     */
    public abstract renderContent(): React.ReactNode;

    /**
     * Returns the list of available textures in the assets to be drawn.
     */
    public getTexturesList(): IInspectorListItem<Nullable<Texture>>[] {
        const assets = this.editor.assets.getAssetsOf(TextureAssets) ?? [];
        const empty: IInspectorListItem<Nullable<Texture>> = { label: "None", data: null, description: "No Texture" };

        return [empty].concat(assets.map((a) => {
            const data = (this.editor.scene!.textures.find((t) => t.metadata?.editorId === a.key) ?? null) as Nullable<Texture>;
            const icon = a.base64 ? <img src={a.base64} style={{ width: 30, height: 30 }}></img> : undefined;
            return { label: a.id, data, icon, description: data?.name };
        }));
    }

    /**
     * Returns the list of available materials in the assets to be drawn.
     */
    public getMaterialsList(): IInspectorListItem<Nullable<Material>>[] {
        const assets = this.editor.assets.getAssetsOf(MaterialAssets) ?? [];
        const empty: IInspectorListItem<Nullable<Material>> = { label: "None", data: null, description: "No Material" };

        return [empty].concat(assets.map((a) => {
            const data = (this.editor.scene!.materials.find((m) => m.id === a.key) ?? null) as Nullable<Material>;
            const icon = a.base64 ? <img src={a.base64} style={{ width: 30, height: 30 }}></img> : undefined;
            return { label: a.id, data, icon, description: data?.name };
        }));
    }
}
