import { Component, ReactNode } from "react";
import { Icon, NonIdealState } from "@blueprintjs/core";

import { Tools } from "babylonjs";

import { Editor } from "../main";

import { IEditorInspectorImplementationProps } from "./inspector/inspector";

import { EditorSceneInspector } from "./inspector/scene";

import { EditorMeshInspector } from "./inspector/mesh";
import { EditorTransformNodeInspector } from "./inspector/transform";

import { EditorFileInspector } from "./inspector/file";

import { EditorSpotLightInspector } from "./inspector/light/spot";
import { EditorPointLightInspector } from "./inspector/light/point";
import { EditorDirectionalLightInspector } from "./inspector/light/directional";
import { EditorHemisphericLightInspector } from "./inspector/light/hemispheric";

import { EditorCameraInspector } from "./inspector/camera/editor";
import { EditorFreeCameraInspector } from "./inspector/camera/free";
import { EditorArcRotateCameraInspector } from "./inspector/camera/arc-rotate";

export interface IEditorInspectorProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IEditorInspectorState {
    editedObject: unknown | null;
}

export class EditorInspector extends Component<IEditorInspectorProps, IEditorInspectorState> {
    private static _Inspectors: ((new (props: IEditorInspectorImplementationProps<any>) => Component<IEditorInspectorImplementationProps<any>>) & { IsSupported(object: any): boolean; })[] = [
        EditorTransformNodeInspector,
        EditorMeshInspector,

        EditorFileInspector,

        EditorPointLightInspector,
        EditorDirectionalLightInspector,
        EditorSpotLightInspector,
        EditorHemisphericLightInspector,

        EditorCameraInspector,
        EditorFreeCameraInspector,
        EditorArcRotateCameraInspector,

        EditorSceneInspector,
    ];

    public constructor(props: IEditorInspectorProps) {
        super(props);

        this.state = {
            editedObject: null,
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex flex-col gap-2 w-full h-full p-2 text-foreground">
                <input
                    type="text"
                    placeholder="Search..."
                    className="px-5 py-2 rounded-lg bg-primary-foreground outline-none"
                />

                <div className="flex flex-col gap-2 h-full">
                    {this._getContent()}
                </div>
            </div>
        );
    }

    /**
     * Sets the edited object.
     * @param editedObject defines the edited object.
     */
    public setEditedObject(editedObject: unknown): void {
        this.setState({ editedObject });
    }

    private _getContent(): ReactNode {
        if (!this.state.editedObject) {
            return <NonIdealState
                icon={<Icon icon="search" size={96} />}
                title={
                    <div className="text-white">
                        No object selected
                    </div>
                }
            />;
        }

        const inspectors = EditorInspector._Inspectors
            .filter((i) => i.IsSupported(this.state.editedObject))
            .map((i) => ({ inspector: i }));

        return inspectors.map((i) => (
            <i.inspector
                key={Tools.RandomId()}
                editor={this.props.editor}
                object={this.state.editedObject}
            />
        ));
    }
}
