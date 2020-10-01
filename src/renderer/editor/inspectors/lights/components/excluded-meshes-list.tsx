import * as React from "react";
import Transfer, { TransferItem } from "antd/lib/transfer";

import { AbstractMesh, Light } from "babylonjs";

import { Editor } from "../../../editor";

export interface IExcludedMeshesListProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
    /**
     * Defines the reference to the render target
     */
    light: Light;
}

export interface IExcludedMeshesListState {
    /**
     * Defines the list of all excluded meshes.
     */
    excludedMeshes: TransferItem[];
    /**
     * Defines the list of all included meshes.
     */
    includedMeshes: TransferItem[];

    /**
     * Defines the list of all selected keys.
     */
    selectedKeys: string[];
}

export class ExcludedMeshesList extends React.Component<IExcludedMeshesListProps, IExcludedMeshesListState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IExcludedMeshesListProps) {
        super(props);
        this.state = {
            excludedMeshes: this._getExcludedMeshes(),
            includedMeshes: this._getIncludedMeshes(),
            selectedKeys: [],
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
                render={(i) => i.title ?? i.key}
                targetKeys={this.state.includedMeshes.map((im) => im.key)}
                onSelectChange={(s, t) => this._handleSelectionChange(s, t)}
                onChange={(t, d, m) => this._handleChange(t, d, m)}
                showSearch={true}
                listStyle={{
                    width: "calc(50% - 20px)",
                    height: "490px",
                }}
            />
        )
    }

    /**
     * Called on the user selects keys.
     */
    private _handleSelectionChange(sourceSelectedKeys: string[], targetSelectedKeys: string[]): void {
        this.setState({ selectedKeys: sourceSelectedKeys.concat(targetSelectedKeys) });
    }

    /**
     * Called on the transfer changed.
     */
    private _handleChange(_: string[], direction: string, moveKeys: string[]): void {
        switch (direction) {
            // Exclude
            case "right":
                moveKeys.forEach((k) => {
                    const mesh = this.props.editor.scene!.getMeshByID(k);
                    if (!mesh) { return; }

                    if (this.props.light.excludedMeshes.indexOf(mesh) === -1) {
                        this.props.light.excludedMeshes.push(mesh);
                    }
                });
                break;

            // Include
            case "left":
                moveKeys.forEach((k) => {
                    const mesh = this.props.editor.scene!.getMeshByID(k);
                    if (!mesh) { return; }

                    const index = this.props.light.excludedMeshes.indexOf(mesh);
                    if (index !== -1) {
                        this.props.light.excludedMeshes.splice(index, 1);
                    }
                });
                break;
        }

        this.setState({
            excludedMeshes: this._getExcludedMeshes(),
            includedMeshes: this._getIncludedMeshes(),
        });
    }

    /**
     * Returns the list of all exlucded meshes.
     */
    private _getExcludedMeshes(): TransferItem[] {
        return this._getMeshes().filter((m) => this.props.light.excludedMeshes.indexOf(m) === -1).map((m) => ({
            key: m.id,
            title: m.name,
            disabled: false,
        }));
    }

    /**
     * Returns the list of all included meshes.
     */
    private _getIncludedMeshes(): TransferItem[] {
        return this.props.light.excludedMeshes!.map((m) => ({
            key: m.id,
            title: m.name,
            disabled: false,
        }));
    }

    /**
     * Returns the list of all meshes that can cast shadows.
     */
    private _getMeshes(): AbstractMesh[] {
        return this.props.editor.scene!.meshes.filter((m) => !m._masterMesh);
    }
}
