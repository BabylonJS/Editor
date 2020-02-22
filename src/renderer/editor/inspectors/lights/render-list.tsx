import * as React from "react";
import { ButtonGroup, Button, Classes } from "@blueprintjs/core";

import { RenderTargetTexture, AbstractMesh } from "babylonjs";

import { Editor } from "../../editor";

import { Icon } from "../../gui/icon";
import { Alert } from "../../gui/alert";
import { GraphList, IListItem } from "../../gui/graph-list";

export interface IRenderListProps {
    /**
     * The editor reference.
     */
    editor: Editor;
    /**
     * Defines the reference to the render target
     */
    renderTarget: RenderTargetTexture;
    /**
     * Optional callback called on the user wants to remove elements from the list.
     */
    onRemove: (ids: string[]) => void;
}

export class RenderList extends React.Component<IRenderListProps> {
    private _renderList: GraphList;
    private _addList: GraphList;
    private _refHandler = {
        getRenderList: (ref: GraphList) => this._renderList = ref,
        getAddList: (ref: GraphList) => ref && (this._addList = ref),
    };

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const existing = this.props.renderTarget.renderList!.map((m) => this._getListItem(m));

        return (
            <div style={{ height: "500px" }}>
                <span>Render list:</span>
                <div className={Classes.FILL} key="render-list-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="render-list-add" icon={<Icon src="plus.svg" />} small={true} text="Add Mesh..." onClick={() => this._handleAddToRenderList()} />
                    </ButtonGroup>
                </div>

                <GraphList ref={this._refHandler.getRenderList} list={existing} onRemove={(ids) => this._handleRemoveFromRenderList(ids)} style={{ marginTop: "5px", width: "100%", height: "460px" }} />
            </div>
        );
    }

    /**
     * Returns the item to be drawn in the list.
     */
    private _getListItem(m: AbstractMesh): IListItem {
        return {
            name: m.name,
            id: m.id,
            icon: <Icon src="vector-square.svg" />
        };
    }

    /**
     * Called on the user wants to remove meshes from the shadow map.
     */
    private _handleRemoveFromRenderList(ids: string[]): void {
        this.props.onRemove(ids);
        this._renderList.setState({ list: this.props.renderTarget.renderList!.map((m) => this._getListItem(m)) })
    }

    /**
     * Called on the user wants to add an element to the render list.
     */
    private async _handleAddToRenderList(): Promise<void> {
        const renderList = this.props.renderTarget.renderList!;
        const toAdd = this.props.editor.scene!.meshes.filter((m) => !renderList.find((rl) => rl === m) && !m._masterMesh)
                                                     .map((m) => this._getListItem(m));
        
        const body = <GraphList ref={this._refHandler.getAddList} list={toAdd} style={{ marginTop: "5px", height: "500px" }} />;

        await Alert.Show("Add To Render List", "Select meshes to add to the render list", undefined, body);

        // Configure render list
        this._addList.state.selectedIds.forEach((id) => {
            const mesh = this.props.editor.scene!.getMeshByID(id);
            if (mesh) { renderList.push(mesh); }
        });

        // Update graph list.
        this._renderList.setState({ list: renderList.map((m) => this._getListItem(m)) });
    }
}
