import { Component, ReactNode } from "react";

import { SkyMaterial } from "babylonjs-materials";
import { Material, MultiMaterial, PBRMaterial, StandardMaterial } from "babylonjs";

import { Table, TableBody, TableCaption, TableCell, TableRow } from "../../../../ui/shadcn/ui/table";

import { EditorInspectorSectionField } from "../fields/section";

import { EditorSkyMaterialInspector } from "./sky";
import { EditorPBRMaterialInspector } from "./pbr";
import { EditorStandardMaterialInspector } from "./standard";

export interface IEditorPBRMaterialInspectorProps {
    material: MultiMaterial;
}

export interface IEditorMultiMaterialInspectorState {
    material: Material | null;
}

export class EditorMultiMaterialInspector extends Component<IEditorPBRMaterialInspectorProps, IEditorMultiMaterialInspectorState> {
    public constructor(props: IEditorPBRMaterialInspectorProps) {
        super(props);

        this.state = {
            material: props.material.subMaterials[0] ?? null,
        };
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Multi Material">
                    {this._getMaterialSelectorComponent()}
                </EditorInspectorSectionField>

                {this._getMaterialComponent()}
            </>
        );
    }

    private _getMaterialSelectorComponent(): ReactNode {
        return (
            <Table>
                <TableCaption>Select the material to edit.</TableCaption>
                <TableBody>
                    {this.props.material.subMaterials.map((material, index) => (
                        <TableRow
                            onClick={() => this.setState({ material: this.props.material.subMaterials[index] })}
                            className={`cursor-pointer ${material === this.state.material ? "bg-secondary" : ""} transition-all duration-300 ease-in-out`}
                        >
                            <TableCell className="font-medium">{index}</TableCell>
                            <TableCell>{material?.name ?? material?.constructor.name ?? "None"}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    private _getMaterialComponent(): ReactNode {
        if (!this.state.material) {
            return (
                <div className="flex flex-col gap-2 px-2">
                    <div className="text-center text-xl">
                        No material
                    </div>
                </div>
            );
        }

        switch (this.state.material.getClassName()) {
            case "PBRMaterial": return <EditorPBRMaterialInspector key={this.state.material.id} material={this.state.material as PBRMaterial} />;
            case "StandardMaterial": return <EditorStandardMaterialInspector key={this.state.material.id} material={this.state.material as StandardMaterial} />;
            case "SkyMaterial": return <EditorSkyMaterialInspector key={this.state.material.id} material={this.state.material as SkyMaterial} />;
        }
    }
}
