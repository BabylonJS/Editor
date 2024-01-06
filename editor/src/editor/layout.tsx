import { platform } from "os";

import { Component, ReactNode } from "react";
import { Layout, Model, TabNode } from "flexlayout-react";

import { Editor } from "./main";

import layoutModel from "./layout.json";
import { EditorGraph } from "./layout/graph";
import { EditorPreview } from "./layout/preview";
import { EditorToolbar } from "./layout/toolbar";
import { EditorConsole } from "./layout/console";
import { EditorInspector } from "./layout/inspector";
import { EditorAssetsBrowser } from "./layout/assets-browser";

import { waitNextAnimationFrame } from "../tools/tools";

export interface IEditorLayoutProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export class EditorLayout extends Component<IEditorLayoutProps> {
    /**
     * The preview of the editor.
     */
    public preview: EditorPreview;
    /**
     * The console of the editor.
     */
    public console: EditorConsole;
    /**
     * The inspector of the editor.
     */
    public inspector: EditorInspector;
    /**
     * The graph of the editor.
     */
    public graph: EditorGraph;

    private _model: Model = Model.fromJson(layoutModel as any);
    private _components: Record<string, React.ReactNode> = {
        "console": <EditorConsole ref={(r) => this.console = r!} />,
        "preview": <EditorPreview editor={this.props.editor} ref={(r) => this.preview = r!} />,
        "inspector": <EditorInspector editor={this.props.editor} ref={(r) => this.inspector = r!} />,
        "graph": <EditorGraph editor={this.props.editor} ref={(r) => this.graph = r!} />,
        "assets-browser": <EditorAssetsBrowser editor={this.props.editor} />,
    };

    public constructor(props: IEditorLayoutProps) {
        super(props);
    }

    public render(): ReactNode {
        return (
            <div className="flex flex-col w-screen h-screen">
                {platform() !== "darwin" &&
                    <EditorToolbar editor={this.props.editor} />
                }

                <div className="relative w-full h-full">
                    <Layout
                        model={this._model}
                        factory={(n) => this._layoutFactory(n)}
                    />
                </div>
            </div>
        );
    }

    private _layoutFactory(node: TabNode): React.ReactNode {
        const componentName = node.getComponent();
        if (!componentName) {
            return <div>Error, see console...</div>;
        }

        const component = this._components[componentName];
        if (!component) {
            return <div>Error, see console...</div>;
        }

        node.setEventListener("resize", () => {
            waitNextAnimationFrame().then(() => this.preview?.engine?.resize());
        });

        return component;
    }
}
