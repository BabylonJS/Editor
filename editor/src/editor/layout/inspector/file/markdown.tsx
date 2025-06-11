import { shell } from "electron";
import { readFile } from "fs-extra";
import { basename } from "path/posix";

import { useEffect, useState } from "react";
import { AiFillFileMarkdown } from "react-icons/ai";

import { Callout, Divider } from "@blueprintjs/core";
import Markdown, { RuleType } from "markdown-to-jsx";

import { FileInspectorObject } from "../file";

export interface IEditorInspectorMarkdownComponentProps {
    object: FileInspectorObject;
}

export function EditorInspectorMarkdownComponent(props: IEditorInspectorMarkdownComponentProps) {
    const [content, setContent] = useState<string | null>(null);

    useEffect(() => {
        readFile(props.object.absolutePath, "utf-8").then((content) => {
            setContent(content);
        });
    }, []);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 justify-center items-center text-xl font-bold">
                <AiFillFileMarkdown size="24px" />
                {basename(props.object.absolutePath)}
            </div>

            <Divider />

            <Markdown
                children={content ?? ""}
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
