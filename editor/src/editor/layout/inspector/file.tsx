import { readFile } from "fs-extra";
import { basename, extname } from "path/posix";

import { shell } from "electron";

import { Component, ReactNode, useState } from "react";
import { Callout, Divider } from "@blueprintjs/core";

import Markdown, { RuleType } from "markdown-to-jsx";
import { AiFillFileMarkdown, AiFillPicture } from "react-icons/ai";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../ui/shadcn/ui/table";

import { IEditorInspectorImplementationProps } from "./inspector";

export class FileInspectorObject {
    public readonly isFileInspectorObject = true;

    public constructor(
        public readonly absolutePath: string,
    ) { }
}

export interface IEditorFileInspectorState {
    /**
     * The content of the file.
     */
    content: string;
}

export class EditorFileInspector extends Component<IEditorInspectorImplementationProps<FileInspectorObject>, IEditorFileInspectorState> {
    private _extension: string;

    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: any): object is FileInspectorObject {
        return object?.isFileInspectorObject;
    }

    public constructor(props: IEditorInspectorImplementationProps<FileInspectorObject>) {
        super(props);

        this._extension = extname(props.object.absolutePath).toLowerCase();

        this.state = {
            content: "",
        };
    }

    public render(): ReactNode {
        switch (this._extension) {
            case ".png":
            case ".jpg":
            case ".jpeg":
            case ".bmp":
                return (
                    <>
                        <this._getImageComponent {...this.props} />
                    </>
                );

            case ".md": return this._getMarkdownComponent();
            default: return null;
        }
    }

    private _getImageComponent(props: IEditorInspectorImplementationProps<FileInspectorObject>): ReactNode {
        const [width, setWidth] = useState(0);
        const [height, setHeight] = useState(0);

        return (
            <div className="flex flex-col gap-2">
                <div className="flex gap-2 justify-center items-center text-xl font-bold">
                    <AiFillPicture size="24px" />
                    {basename(props.object.absolutePath)}
                </div>

                <Divider />

                <div className="w-full aspect-square p-5 rounded-lg bg-black/50">
                    <img
                        alt=""
                        draggable={false}
                        src={props.object.absolutePath}
                        className="w-full aspect-square object-contain"
                        onLoad={(ev) => {
                            setWidth(ev.currentTarget.naturalWidth);
                            setHeight(ev.currentTarget.naturalHeight);
                        }}
                    />
                </div>

                <div className="bg-black/50 p-5 rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Property</TableHead>
                                <TableHead>Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Width</TableCell>
                                <TableCell>{width}px</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Height</TableCell>
                                <TableCell>{height}px</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    private _getMarkdownComponent(): ReactNode {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex gap-2 justify-center items-center text-xl font-bold">
                    <AiFillFileMarkdown size="24px" />
                    {basename(this.props.object.absolutePath)}
                </div>

                <Divider />

                <Markdown
                    children={this.state.content}
                    options={{
                        renderRule(next, node, _, state) {
                            if (node.type === RuleType.codeBlock) {
                                return (
                                    <Callout
                                        key={state.key}
                                        className="w-full whitespace-break-spaces p-5 rounded-lg mb-3"
                                    >
                                        {node.text}
                                    </Callout>
                                );
                            }

                            if (node.type === RuleType.link) {
                                return (
                                    <a
                                        key={state.key}
                                        className="parent text-blue-400"
                                        onClick={() => shell.openExternal(node.target)}
                                    >
                                        {node.children.map((c) => c["text"]).join(" ")}
                                    </a>
                                );
                            }

                            return next();
                        },
                    }}
                />
            </div>
        );
    }

    public async componentDidMount(): Promise<void> {
        switch (this._extension) {
            case ".md":
                this.setState({
                    content: await readFile(this.props.object.absolutePath, "utf-8"),
                });
                break;
        }
    }
}
