import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import Transfer, { TransferItem } from "antd/lib/transfer";

import { AbstractMesh } from "babylonjs";

import { Editor } from "../../../editor";

export interface IMeshTransferProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
    /**
     * Defines the array where the scene's meshes should be transfered/removed.
     */
    targetArray: AbstractMesh[];

    /**
     * Defines the optional custom labels for the transfer component.
     */
    labels?: [string, string];

    /**
     * Defines the optional callback called on the transfer changed.
     */
    onChanged?: () => void;
    /**
     * Defines the optional callback called on an item is being transfered to the target array
     * in order to check if it can be transfered.
     */
    canTransferMesh?: (m: AbstractMesh) => boolean;
}

export interface IMeshTransferState {
    /**
     * Defines the list of all excluded meshes for the light.
     */
    excludedMeshes: TransferItem[];
    /**
     * Defines the list of all included meshes for the light.
     */
    includedMeshes: TransferItem[];
    /**
     * Defines the list of all selected keys for excluded meshes.
     */
    selectedKeys: string[];
}

export class MeshTransferComponent extends React.Component<IMeshTransferProps, IMeshTransferState> {
    private _divRef: Nullable<HTMLDivElement> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IMeshTransferProps) {
        super(props);

        this.state = {
            selectedKeys: [],
            excludedMeshes: this._getExcludedMeshes(),
            includedMeshes: this._getIncludedMeshes(),
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div
                style={{
                    marginLeft: "-35px",
                    marginRight: "-10px",
                }}
                ref={(r) => this._divRef = r}
                onDrop={(e) => this._handleDrop(e)}
                onDragOver={() => this._handleDragOver()}
                onDragLeave={() => this._handleDragLeave()}
            >
                <Transfer
                    listStyle={{
                        width: "50%",
                        height: "490px",
                    }}
                    showSearch
                    titles={[
                        this.props.labels?.[0] ?? "Included",
                        this.props.labels?.[1] ?? "Excluded",
                    ]}
                    selectedKeys={this.state.selectedKeys}
                    render={(i) => i.title ?? i.key ?? null}
                    onChange={(t, d, m) => this._handleTransferChange(t, d, m)}
                    onSelectChange={(s, t) => this._handleSelectionChange(s, t)}
                    dataSource={this.state.excludedMeshes.concat(this.state.includedMeshes)}
                    targetKeys={this.state.excludedMeshes.filter((im) => im.key).map((im) => im.key!)}
                />
            </div>
        );
    }

    /**
     * Returns the list of all exclided meshes as transfer items.
     */
    private _getExcludedMeshes(): TransferItem[] {
        return this.props.targetArray.map((m) => this._getDataTransferFromMesh(m));
    }

    /**
     * Returns the list of all included meshes as transfer items.
     */
    private _getIncludedMeshes(): TransferItem[] {
        return this.props.editor.scene!.meshes
            .filter((m) => !m._masterMesh && (this.props.canTransferMesh?.(m) ?? true))
            .filter((m) => this.props.targetArray.indexOf(m) === -1)
            .map((m) => this._getDataTransferFromMesh(m));
    }

    /**
     * Returns a transfer item built from the given mesh reference.
     */
    private _getDataTransferFromMesh(mesh: AbstractMesh): TransferItem {
        return { key: mesh.id, title: mesh.name, disabled: false };
    }

    /**
    * Called on the user selects keys in the excluded meshes data transfer.
    */
    private _handleSelectionChange(sourceSelectedKeys: string[], targetSelectedKeys: string[]): void {
        this.setState({ selectedKeys: sourceSelectedKeys.concat(targetSelectedKeys) });
    }

    /**
     * Called on the user 
     */
    private _handleTransferChange(_: string[], direction: string, moveKeys: string[]): void {
        switch (direction) {
            // Exclude
            case "right":
                moveKeys.forEach((k) => {
                    const mesh = this.props.editor.scene!.getMeshById(k);
                    if (!mesh) { return; }

                    if (this.props.targetArray.indexOf(mesh) === -1) {
                        this.props.targetArray.push(mesh);
                    }
                });
                break;

            // Include
            case "left":
                moveKeys.forEach((k) => {
                    const mesh = this.props.editor.scene!.getMeshById(k);
                    if (!mesh) { return; }

                    const index = this.props.targetArray.indexOf(mesh);
                    if (index !== -1) {
                        this.props.targetArray.splice(index, 1);
                    }
                });
                break;
        }

        this.setState({
            excludedMeshes: this._getExcludedMeshes(),
            includedMeshes: this._getIncludedMeshes(),
        });

        this.props.onChanged?.();
    }

    /**
     * Called on the user drags an element over the transfer component.
     */
    private _handleDragOver(): void {
        if (this._divRef) {
            this._divRef.style.background = "#333333";
        }
    }

    /**
     * Called on the user stopped dragging an element over the transfer component.
     */
    private _handleDragLeave(): void {
        if (this._divRef) {
            this._divRef.style.background = "";
        }
    }

    /**
     * Called on the user dropped an element on the transfer component.
     */
    private _handleDrop(event: React.DragEvent<HTMLDivElement>): void {
        this._handleDragLeave();

        if (!event.dataTransfer?.getData("graph/node")) {
            return;
        }

        const selectedNodes = this.props.editor.graph.state.selectedNodes.filter((n) => n.nodeData instanceof AbstractMesh).map((n) => n.nodeData);
        if (!selectedNodes.length) {
            return;
        }

        selectedNodes.forEach((n) => {
            if (!(this.props.canTransferMesh?.(n) ?? true)) {
                return;
            }

            const index = this.props.targetArray.indexOf(n);
            if (index === -1) {
                this.props.targetArray.push(n);
            }
        });

        this.setState({
            excludedMeshes: this._getExcludedMeshes(),
            includedMeshes: this._getIncludedMeshes(),
        });

        this.props.onChanged?.();
    }
}
