import { extname } from "path/posix";

import { Component, PropsWithChildren, ReactNode } from "react";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { MdOutlineQuestionMark } from "react-icons/md";

import { Material, Texture } from "babylonjs";

import { configureImportedTexture } from "../../preview/import";

import { EditorInspectorNumberField } from "./number";

import { isTexture } from "../../../../tools/guards/texture";

export interface IEditorInspectorTextureFieldProps extends PropsWithChildren {
    title: string;
    property: string;
    material: Material;

    onChange?: (texture: Texture) => void;
}

export class EditorInspectorTextureField extends Component<IEditorInspectorTextureFieldProps> {
    public render(): ReactNode {
        const textureUrl = isTexture(this.props.material[this.props.property]) && this.props.material[this.props.property].url;

        return (
            <div className="flex gap-4 w-full bg-[#222222] p-5 rounded-lg">
                <div
                    onDrop={(ev) => this._handleDrop(ev)}
                    onDragOver={(ev) => ev.preventDefault()}
                    className="flex justify-center items-center w-24 h-24 aspect-square bg-[#222222]"
                >
                    {textureUrl && (
                        <img className="w-24 h-24 object-contain" src={textureUrl} />
                    )}

                    {!textureUrl && (
                        <MdOutlineQuestionMark className="w-16 h-16" color="white" />
                    )}
                </div>

                <div className="flex flex-col w-full">
                    <div className="px-2">
                        {this.props.title}
                    </div>

                    {textureUrl &&
                        <div className="flex flex-col gap-1 mt-1 w-full">
                            <EditorInspectorNumberField label="Level" object={this.props.material[this.props.property]} property="level" />
                            <EditorInspectorNumberField label="Size" object={this.props.material[this.props.property]} property="uScale" onChange={(v) => {
                                this.props.material[this.props.property].vScale = v;
                            }} />

                            {this.props.children}
                        </div>
                    }

                    {!textureUrl &&
                        <div className="flex justify-center items-center w-full h-full bg-[#222222] text-gray-400">
                            Nothing to edit.
                        </div>
                    }
                </div>
                <div
                    onClick={() => {
                        this.props.material[this.props.property] = null;
                        this.forceUpdate();
                    }}
                    className="flex justify-center items-center w-24 h-full hover:bg-[#333333] rounded-lg transition-all duration-300"
                >
                    <XMarkIcon className="w-6 h-6" color="white" />
                </div>
            </div>
        );
    }

    private _handleDrop(ev: React.DragEvent<HTMLDivElement>): void {
        const absolutePath = ev.dataTransfer.getData("asset");
        const extension = extname(absolutePath).toLowerCase();

        switch (extension) {
            case ".png":
            case ".jpg":
            case ".jpeg":
            case ".bmp":
                this.props.material[this.props.property]?.dispose();
                this.props.material[this.props.property] = configureImportedTexture(new Texture(absolutePath, this.props.material.getScene()));

                this.props.onChange?.(this.props.material[this.props.property]);
                break;
        }

        this.forceUpdate();

        ev.preventDefault();
    }
}
