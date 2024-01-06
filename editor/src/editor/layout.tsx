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
    /**
     * Defines if the welcome screen should be shown.
     */
    showWelcome: boolean;
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
    /**
     * The assets browser of the editor.
     */
    public assets: EditorAssetsBrowser;

    private _model: Model = Model.fromJson(layoutModel as any);
    private _components: Record<string, React.ReactNode> = {
        "console": <EditorConsole ref={(r) => this.console = r!} />,
        "preview": <EditorPreview editor={this.props.editor} ref={(r) => this.preview = r!} />,
        "inspector": <EditorInspector editor={this.props.editor} ref={(r) => this.inspector = r!} />,
        "graph": <EditorGraph editor={this.props.editor} ref={(r) => this.graph = r!} />,
        "assets-browser": <EditorAssetsBrowser editor={this.props.editor} ref={(r) => this.assets = r!} />,
    };

    public constructor(props: IEditorLayoutProps) {
        super(props);

        try {
            this._model = Model.fromJson(
                JSON.parse(localStorage.getItem("babylonjs-editor-layout") as string)
            );
        } catch (e) {
            this._model = Model.fromJson(layoutModel as any);
        }
    }

    public render(): ReactNode {
        return (
            <div className={`flex flex-col w-screen h-screen ${this.props.showWelcome ? "blur-md transition-all duration-300" : ""}`}>
                <EditorToolbar editor={this.props.editor} />

                <div className="relative w-full h-full">
                    <Layout
                        model={this._model}
                        factory={(n) => this._layoutFactory(n)}
                        onModelChange={(m) => this._saveLayout(m)}
                    />
                </div>
            </div>
        );
    }

    public componentDidCatch(): void {
        localStorage.removeItem("babylonjs-editor-layout");
        window.location.reload();
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

    private _saveLayout(model: Model): void {
        localStorage.setItem(
            "babylonjs-editor-layout",
            JSON.stringify(model.toJson()),
        );
    }
}
