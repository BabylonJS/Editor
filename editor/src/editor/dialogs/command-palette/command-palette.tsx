import { dirname, join, extname, basename } from "path/posix";

import { Component, ReactNode } from "react";

import { FaFileAlt } from "react-icons/fa";
import { FaCirclePlus } from "react-icons/fa6";
import { HiMiniCommandLine } from "react-icons/hi2";

import { normalizedGlob } from "../../../tools/fs";

import { Editor } from "../../main";

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../ui/shadcn/ui/command";

import { getMeshCommands } from "./mesh";
import { getLightCommands } from "./light";
import { getCameraCommands } from "./camera";
import { getProjectCommands } from "./project";

export interface ICommandPaletteProps {
    editor: Editor;
}

export interface ICommandPaletteState {
    open: boolean;
    query: string;

    files: ICommandPaletteType[];
}

export interface ICommandPaletteType {
    text: string;
    label: string;
    action: () => unknown;
}

export class CommandPalette extends Component<ICommandPaletteProps, ICommandPaletteState> {
    public constructor(props: ICommandPaletteProps) {
        super(props);

        this.state = {
            query: "",
            open: false,
            files: [],
        };
    }

    public render(): ReactNode {
        return (
            <CommandDialog open={this.state.open} onOpenChange={(o) => !o && this.setOpen(o)}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    <CommandGroup heading="Commands">
                        {getProjectCommands(this.props.editor).map((command) => (
                            <CommandItem key={command.text} onSelect={() => command.action()} className="flex items-center gap-2">
                                <HiMiniCommandLine className="w-10 h-10" /> {command.text}
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandGroup heading="Scene">
                        {getLightCommands(this.props.editor).map((command) => (
                            <CommandItem key={command.text} onSelect={() => command.action()} className="flex items-center gap-2">
                                <FaCirclePlus className="w-10 h-10" /> {command.text}
                            </CommandItem>
                        ))}

                        {getMeshCommands(this.props.editor).map((command) => (
                            <CommandItem key={command.text} onSelect={() => command.action()} className="flex items-center gap-2">
                                <FaCirclePlus className="w-10 h-10" /> {command.text}
                            </CommandItem>
                        ))}

                        {getCameraCommands(this.props.editor).map((command) => (
                            <CommandItem key={command.text} onSelect={() => command.action()} className="flex items-center gap-2">
                                <FaCirclePlus className="w-10 h-10" /> {command.text}
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandGroup heading="Files">
                        {this.state.files.map((file) => (
                            <CommandItem key={file.text} onSelect={() => file.action()} className="flex items-center gap-2">
                                <FaFileAlt className="w-10 h-10" /> {file.text}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        );
    }

    public setOpen(open: boolean): void {
        this.setState({ open });

        if (open) {
            this._refreshAssetFiles();
        }
    }

    private async _refreshAssetFiles(): Promise<void> {
        if (!this.props.editor.state.projectPath) {
            return;
        }

        const assetsFolder = join(dirname(this.props.editor.state.projectPath), "assets");
        const glob = await normalizedGlob(join(assetsFolder, "**/*"), {
            ignore: {
                childrenIgnored: (p) => extname(p.name).toLocaleLowerCase() === ".scene",
                ignored: (p) => p.isDirectory() || extname(p.name).toLocaleLowerCase() === ".scene",
            },
        });

        const files = glob.map((file) => ({
            text: basename(file),
            label: file.path,
            action: () => {
                this.props.editor.layout.assets.setBrowsePath(dirname(file));
                this.props.editor.layout.assets.setState({ selectedKeys: [file] });
            },
        }));

        this.setState({ files });
    }
}
