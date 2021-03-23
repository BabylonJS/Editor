import * as React from "react";
import { Popover } from "@blueprintjs/core";

import { PickingInfo, Vector3, Observable, Node, Scene } from "babylonjs";

import { Editor } from "../editor";

import { Nullable, Undefinable } from "../../../shared/types";
import { IFile } from "../project/files";

export interface IAssetsComponentProps {
    /**
     * The editor reference to be used in the assets component.
     */
    editor: Editor;
    /**
     * The id of the component.
     */
    id: string;
    /**
     * Optional callback called on the user double clicks an asset.
     */
    onClick?: Undefinable<(item: IAssetComponentItem, img: HTMLImageElement) => void>;
    /**
     * Optional callback called on the user double clicks an asset.
     */
    doubleClick?: Undefinable<(item: IAssetComponentItem, img: HTMLImageElement) => void>;
    /**
     * Optional style to apply.
     */
    style?: Undefinable<React.CSSProperties>;
}

export interface IAssetComponentItem {
    /**
     * Defines the id of the texture.
     */
    id: string;
    /**
     * Defines the preview of the texture in base64.
     */
    base64: string;
    /**
     * The key string used by React.
     */
    key: string;
    /**
     * Optional style that can be added to the item node.
     */
    ref?: Nullable<HTMLDivElement>;
    /**
     * Optional style options for the div.
     */
    style?: Undefinable<React.CSSProperties>;
    /**
     * Defines the extra data describing the asset item.
     */
    extraData?: {
        [index: string]: number | string | boolean;
    }
}

export interface IDragAndDroppedAssetComponentItem extends IAssetComponentItem {
    /**
     * Defines the id of the component containing the asset being drag'n'dropped.
     */
    assetComponentId: string;
}

export interface IAssetsComponentState {
    /**
     * Defines all the assets to draw in the panel.
     */
    items: IAssetComponentItem[];
    /**
     * Defines the height of the panel.
     */
    height: number;
}

export interface IAbstractAssets {
    /**
     * Refreshes the component.
     * @param object the optional object reference that has been modified in the editor.
     */
    refresh<T>(object: Undefinable<T>): Promise<void>;
    /**
     * Called on the user drops an asset in editor. (typically the preview canvas).
     * @param item the item being dropped.
     * @param pickInfo the pick info generated on the drop event.
     */
    onDropAsset(item: IAssetComponentItem, pickInfo: PickingInfo): void;
    /**
     * Called on the user drops files in the assets component and returns true if the files have been computed.
     * @param files the list of files being dropped.
     */
    onDropFiles?(files: IFile[]): boolean | Promise<boolean>;
    /**
     * Called on an asset item has been drag'n'dropped on graph component.
     * @param data defines the data of the asset component item being drag'n'dropped.
     * @param nodes defines the array of nodes having the given item being drag'n'dropped.
     */
    onGraphDropAsset?(data: IAssetComponentItem, nodes: (Scene | Node)[]): boolean;
}

export class AbstractAssets extends React.Component<IAssetsComponentProps, IAssetsComponentState> implements IAbstractAssets {
    /**
     * Defines the list of all available assets.
     */
    public items: IAssetComponentItem[] = [];
    /**
     * Defines the observable used to notify observers that an asset has been updated.
     */
    public updateAssetObservable: Observable<void> = new Observable<void>();

    /**
     * The editor reference.
     */
    protected editor: Editor;
    /**
     * Defines the size of assets to be drawn in the panel. Default is 100x100 pixels.
     */
    protected size: number = 100;
    /**
     * Defines the type of the data transfer data when drag'n'dropping asset.
     */
    public readonly dragAndDropType: string = "text/plain";

    /**
     * Stores the current list of nodes drawn in the panel..
     * @warning should be used with care.
     */
    protected _itemsNodes: React.ReactNode[] = [];

    private _filter: string = "";
    private _dropListener: Nullable<(ev: DragEvent) => void> = null;
    private _itemBeingDragged: Nullable<IAssetComponentItem> = null; 

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IAssetsComponentProps) {
        super(props);

        this.editor = props.editor;
        this.state = { items: this.items, height: 0 };
    }

    /**
     * Refreshes the component.
     */
    public async refresh(): Promise<void> {
        this.setState({ items: this.items });
    }

    /**
     * Called once a project has been loaded, this function is used to clean up
     * unused assets files automatically.
     */
    public async clean(): Promise<void> {
        // Empty for now...
    }

    /**
     * Called on the user drops an asset in editor. (typically the preview canvas).
     * @param item the item being dropped.
     * @param pickInfo the pick info generated on the drop event.
     */
    public onDropAsset(_: IAssetComponentItem, __: PickingInfo): void {
        // Nothing to do by default.
    }

    /**
     * Called on the user double clicks an item.
     * @param item the item being double clicked.
     * @param img the double-clicked image element.
     */
    public onDoubleClick(item: IAssetComponentItem, img: HTMLImageElement): void {
        if (this.props.doubleClick) {
            this.props.doubleClick(item, img);
        }
    }

    /**
     * Called on the user clicks on an item.
     * @param item the item being clicked.
     * @param img the clicked image element.
     */
    public onClick(item: IAssetComponentItem, img: HTMLImageElement): void {
        if (this.props.onClick) {
            this.props.onClick(item, img);
        }
    }

    /**
     * Called on the user right-clicks on an item.
     * @param item the item being right-clicked.
     * @param event the original mouse event.
     */
    public onContextMenu(_: IAssetComponentItem, event: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        event.stopPropagation();
    }

    /**
     * Called on the user right-clicks on the component's main div.
     * @param event the original mouse event.
     */
    public onComponentContextMenu(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        // Empty for now.
    }

    /**
     * Called on the user pressed the delete key on the asset.
     * @param item defines the item being deleted.
     */
    public onDeleteAsset(_: IAssetComponentItem): void {
        // Empty for now...
    }

    /**
     * Called on an asset item has been drag'n'dropped on graph component.
     * @param data defines the data of the asset component item being drag'n'dropped.
     * @param nodes defines the array of nodes having the given item being drag'n'dropped.
     */
    public onGraphDropAsset(_: IAssetComponentItem, __: (Scene | Node)[]): boolean {
        return false;
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        // Filter
        const filter = this._filter.toLowerCase();
        if (filter !== "") {
            this._itemsNodes = this.state.items.filter((i) => i.id.toLowerCase().indexOf(filter) !== -1)
                                         .map((i) => this._getItemNode(i));
        } else {
            this._itemsNodes = this.state.items.map((i) => this._getItemNode(i));
        }

        // Render!
        const size = this.editor.getPanelSize("assets");

        if (!this._itemsNodes.length) {
            return (
                <div style={{ width: "100%", height: "100%" }} onContextMenu={(e) => this.onComponentContextMenu(e)}>
                    <h1 style={{
                        float: "left",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        overflow: "hidden",
                        position: "relative",
                        fontFamily: "Roboto,sans-serif !important",
                        opacity: "0.5",
                        color: "white",
                    }}>Empty</h1>
                </div>
            );
        }

        return (
            <div
                onContextMenu={(e) => this.onComponentContextMenu(e)}
                style={{ width: "100%", height: size.height - 60, overflow: "auto", ...this.props.style }}
                children={this._itemsNodes}
            ></div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        this.resize();
        if (this.editor.scene) { this.refresh(); }
    }

    /**
     * Sets the new filter on the user wants to filter the assets.
     * @param filter the new filter to search assets.
     */
    public setFilter(filter: string): void {
        this._filter = filter;
        this.setState({ items: this.items });
    }

    /**
     * Resizes the element.
     */
    public resize(): void {
        this.setState({ height: this.editor.getPanelSize("assets").height });
    }

    /**
     * Updates the given item thumbnail.
     * @param key defines the key (identifier) or the item to update.
     * @param base64 defines the new base64 value of the thumbnail.
     */
    public updateAssetThumbnail(key: string, base64: string): void {
        const items = this.state.items?.slice() ?? [];
        const item = items.find((i) => i.key === key);
        if (item) {
            item.base64 = base64;
            this.setState({ items });
        }
    }

    /**
     * Returns the jsx element according to the given component item.
     */
    private _getItemNode(item: IAssetComponentItem): JSX.Element {
        const popoverContent = (
            <div style={{ padding: "15px" }}>
                {this.getItemTooltipContent(item) ?? item.id}
            </div>
        );

        return (
            <div key={item.key} ref={(ref) => item.ref = ref} style={{
                position: "relative",
                width: `${this.size}px`,
                height: `${this.size + 15}px`,
                float: "left",
                margin: "10px",
                borderRadius: "10px",
            }}>
                <Popover content={popoverContent} usePortal={true} interactionKind="click" autoFocus={true} enforceFocus={true} canEscapeKeyClose={true} boundary="window">
                    <img
                        src={item.base64}
                        style={{ width: `${this.size}px`, height: `${this.size}px`, borderRadius: "15px", objectFit: "contain", ...item.style ?? { } }}
                        onClick={(e) => this.onClick(item, e.target as HTMLImageElement)}
                        onDoubleClick={(e) => this.onDoubleClick(item, e.target as HTMLImageElement)}
                        onContextMenu={(e) => this.onContextMenu(item, e)}
                        onDragStart={(e) => this.dragStart(e, item)}
                        onDragEnd={(e) => this.dragEnd(e)}
                        onDrop={() => this._itemBeingDragged && this.dropOver(item, this.itemBeingDragged!)}
                        onDragEnter={() => this._itemBeingDragged && this.dragEnter(item)}
                        onDragLeave={() => this._itemBeingDragged && this.dragLeave(item)}
                        onKeyDown={(ev) => ev.keyCode === 46 && this.onDeleteAsset(item)}
                    ></img>
                </Popover>
                <small style={{
                    float: "left",
                    width: `${this.size}px`,
                    left: "50%",
                    top: "8px",
                    transform: "translate(-50%, -50%)",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    position: "relative",
                }}>{item.id}</small>
            </div>
        );
    }

    /**
     * Returns the current item that is being dragged.
     */
    protected get itemBeingDragged(): Nullable<IAssetComponentItem> {
        return this._itemBeingDragged;
    }

    /**
     * Returns the content of the item's tooltip on the pointer is over the given item.
     * @param item defines the reference to the item having the pointer over.
     */
    protected getItemTooltipContent(_: IAssetComponentItem): Undefinable<JSX.Element> {
        return undefined;
    }

    /**
     * Called on the user starts dragging the asset.
     */
    protected dragStart(e: React.DragEvent<HTMLImageElement>, item: IAssetComponentItem): void {
        this._dropListener = this._getDropListener(item);
        this._itemBeingDragged = item;

        e.dataTransfer.setData(this.dragAndDropType, JSON.stringify({
            id: item.id,
            key: item.key,
            extraData: item.extraData,
            assetComponentId: this.props.id,
        } as IDragAndDroppedAssetComponentItem));

        this.editor.engine!.getRenderingCanvas()?.addEventListener("drop", this._dropListener);
    }

    /**
     * Called on the currently dragged item is over the given item.
     * @param item the item having the currently dragged item over.
     */
    protected dragEnter(_: IAssetComponentItem): void {
        // Nothing to do now...
    }

    /**
     * Called on the currently dragged item is out the given item.
     * @param item the item having the currently dragged item out.
     */
    protected dragLeave(_: IAssetComponentItem): void {
        // Nothing to do now...
    }

    /**
     * Called on the currently dragged item has been dropped.
     * @param item the item having the currently dragged item dropped over.
     * @param droppedItem the item that has been dropped.
     */
    protected dropOver(_: IAssetComponentItem, __: IAssetComponentItem): void {
        // Nothing to do now...
    }

    /**
     * Called on the user ends dragging the asset.
     * @param e defines the reference to the drag'n'drop event.
     */
    protected dragEnd(e: React.DragEvent<HTMLImageElement>): void {
        e.dataTransfer?.clearData();

        this.editor.engine!.getRenderingCanvas()?.removeEventListener("drop", this._dropListener!);
        this._dropListener = null;
        this._itemBeingDragged = null;
    }

    /**
     * Called on an item has been dropped on the game's canvas.
     */
    private _getDropListener(item: IAssetComponentItem): (ev: DragEvent) => void {
        return (ev: DragEvent) => {
            const pick = this.editor.scene!.pick(
                ev.offsetX,
                ev.offsetY,
                undefined,
                false,
            );
            if (!pick) { return; }
            if (!pick.pickedMesh) { pick.pickedPoint = Vector3.Zero(); }

            this.onDropAsset(item, pick);
        };
    }
}
