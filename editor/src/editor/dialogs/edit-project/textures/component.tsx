import { shell } from "electron";

import { Component, ReactNode } from "react";
import { IoOpenOutline } from "react-icons/io5";

import { Label } from "../../../../ui/shadcn/ui/label";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Switch } from "../../../../ui/shadcn/ui/switch";
import { Separator } from "../../../../ui/shadcn/ui/separator";

import { Editor } from "../../../main";

import { openSingleFileDialog } from "../../../../tools/dialog";

import { getCompressedTexturesCliPath, setCompressedTexturesCliPath } from "../../../../project/export/ktx";

export interface IEditorEditProjectTextureComponentProps {
    editor: Editor;
}

export class EditorEditProjectTextureComponent extends Component<IEditorEditProjectTextureComponentProps> {
    public render(): ReactNode {
        return (
            <div className="flex flex-col gap-[10px] w-full mt-[10px]">
                <Separator />

                <Label className="text-xl font-[400]">Textures</Label>

                <div className="flex justify-between items-center gap-2">
                    Compress textures using PVRTexTool CLI.

                    <Button variant="ghost" className="flex items-center gap-[5px]" onClick={() => shell.openExternal("https://www.imaginationtech.com/")}>
                        <IoOpenOutline className="w-4 h-4" /> Download
                    </Button>
                </div>

                <div className="flex flex-col gap-[10px]">
                    <div className="flex justify-between items-center">
                        <Label>PVRTexTool CLI path</Label>
                        <div className="flex items-center gap-1">
                            Enabled
                            <Switch checked={this.props.editor.state.compressedTexturesEnabled} onCheckedChange={(v) => this.props.editor.setState({ compressedTexturesEnabled: v })} />
                        </div>
                    </div>

                    <Button variant="outline" className="justify-start w-[460px] text-muted whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => this._handleBrowsePVRTexToolCliPath()}>
                        {getCompressedTexturesCliPath() ?? "None"}
                    </Button>
                </div>
            </div>
        );
    }

    private _handleBrowsePVRTexToolCliPath(): void {
        const file = openSingleFileDialog({
            title: "Select PVRTexTool CLI executable",
        });

        if (file) {
            setCompressedTexturesCliPath(file);
        }

        this.forceUpdate();
    }
}
