import { BiCaretDown } from "react-icons/bi";
import { Component, ReactNode } from "react";

import { SkyMaterial } from "babylonjs-materials";
import { Material, MultiMaterial, PBRMaterial, StandardMaterial } from "babylonjs";

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
            <div className="relative flex gap-4 items-center px-5">
                <div className="w-1/2 text-ellipsis overflow-hidden whitespace-nowrap">
                    Material
                </div>

                <select
                    defaultValue={0}
                    className="relative w-full p-2 rounded-lg bg-[#222222] text-white appearance-none"
                    onChange={(ev) => this.setState({ material: this.props.material.subMaterials[parseInt(ev.target.value)] })}
                >
                    {this.props.material.subMaterials.map((material, index) => (
                        <option key={index} value={index}>{material?.name ?? "Default"}</option>
                    ))}
                </select>

                <BiCaretDown className="absolute right-10 top-2 text-white/50" />
            </div>
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
