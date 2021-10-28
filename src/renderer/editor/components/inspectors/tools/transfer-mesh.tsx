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
     * Defines the callback called on the transfer changed.
     */
    onChanged?: () => void;
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
            <Transfer
                dataSource={this.state.excludedMeshes.concat(this.state.includedMeshes)}
                titles={["Included", "Excluded"]}
                selectedKeys={this.state.selectedKeys}
                render={(i) => i.title ?? i.key ?? null}
                targetKeys={this.state.excludedMeshes.filter((im) => im.key).map((im) => im.key!)}
                onSelectChange={(s, t) => this._handleSelectionChange(s, t)}
                onChange={(t, d, m) => this._handleTransferChange(t, d, m)}
                showSearch={true}
                style={{
                    marginLeft: "-35px",
                    marginRight: "-10px",
                }}
                listStyle={{
                    width: "50%",
                    height: "490px",
                }}
            />
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
            .filter((m) => !m._masterMesh)
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
                    const mesh = this.props.editor.scene!.getMeshByID(k);
                    if (!mesh) { return; }

                    if (this.props.targetArray.indexOf(mesh) === -1) {
                        this.props.targetArray.push(mesh);
                    }
                });
                break;

            // Include
            case "left":
                moveKeys.forEach((k) => {
                    const mesh = this.props.editor.scene!.getMeshByID(k);
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
}
