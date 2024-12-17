import { Component, ReactNode } from "react";
import { Icon, NonIdealState } from "@blueprintjs/core";

import { FaCube, FaSprayCanSparkles } from "react-icons/fa6";

import { Tools } from "babylonjs";

import { Editor } from "../main";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/shadcn/ui/tabs";

import { IEditorInspectorImplementationProps } from "./inspector/inspector";

import { EditorSceneInspector } from "./inspector/scene";

import { EditorMeshInspector } from "./inspector/mesh/mesh";
import { EditorTransformNodeInspector } from "./inspector/transform";

import { EditorFileInspector } from "./inspector/file";

import { EditorSpotLightInspector } from "./inspector/light/spot";
import { EditorPointLightInspector } from "./inspector/light/point";
import { EditorDirectionalLightInspector } from "./inspector/light/directional";
import { EditorHemisphericLightInspector } from "./inspector/light/hemispheric";

import { EditorCameraInspector } from "./inspector/camera/editor";
import { EditorFreeCameraInspector } from "./inspector/camera/free";
import { EditorArcRotateCameraInspector } from "./inspector/camera/arc-rotate";

import { EditorSoundInspector } from "./inspector/sound/sound";

import { EditorAdvancedDynamicTextureInspector } from "./inspector/gui/gui";

import { EditorDecalsInspector } from "./inspector/decals/decals";

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

        EditorSoundInspector,
        EditorAdvancedDynamicTextureInspector,
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
                <Tabs defaultValue="entity" className="flex flex-col gap-2 w-full">
                    <TabsList className="w-full">
                        <TabsTrigger value="entity" className="flex gap-2 items-center w-full">
                            <FaCube className="w-4 h-4" /> Entity
                        </TabsTrigger>

                        <TabsTrigger value="decals" className="flex gap-2 items-center w-full">
                            <FaSprayCanSparkles className="w-4 h-4" /> Decal
                        </TabsTrigger>
                    </TabsList>

                    <input
                        type="text"
                        placeholder="Search..."
                        className="px-5 py-2 rounded-lg bg-primary-foreground outline-none w-full"
                    />

                    <TabsContent value="entity">
                        <div className="flex flex-col gap-2 h-full">
                            {this._getContent()}
                        </div>
                    </TabsContent>

                    <TabsContent value="decals">
                        <EditorDecalsInspector editor={this.props.editor} />
                    </TabsContent>
                </Tabs>
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
