import { readFile } from "fs-extra";
import { basename } from "path/posix";

import { shell } from "electron";

import { Component, ReactNode } from "react";
import { Callout, Divider } from "@blueprintjs/core";

import { AiFillFileMarkdown } from "react-icons/ai";
import Markdown, { RuleType } from "markdown-to-jsx";

import { IEditorInspectorImplementationProps } from "./inspector";

export class FileInspectorObject {
    public readonly isFileInspectorObject = true;

    public constructor(
        public absolutePath: string,
    ) { }
}

export interface IEditorFileInspectorState {
    /**
     * The content of the file.
     */
    content: string;
}

export class EditorFileInspector extends Component<IEditorInspectorImplementationProps<FileInspectorObject>, IEditorFileInspectorState> {
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

        this.state = {
            content: "",
        };
    }

    public render(): ReactNode {
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
                                console.log(node);
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
        this.setState({
            content: await readFile(this.props.object.absolutePath, "utf-8"),
        });
    }
}
