import { Component, ReactNode } from "react";

import { CreateBoxVertexData, CreateGroundVertexData, Mesh } from "babylonjs";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

export interface IGeometryInspectorProps {
    object: Mesh;
}

export class GeometryInspector extends Component<IGeometryInspectorProps> {
    public render(): ReactNode {
        if (this.props.object.metadata?.type === "Box") {
            return this._getBoxInspectorComponent();
        }

        if (this.props.object.metadata?.type === "Ground") {
            return this._getGroundInspectorComponent();
        }

        return null;
    }

    private _getBoxInspectorComponent(): ReactNode {
        const onChange = () => {
            this.props.object.geometry?.setAllVerticesData(CreateBoxVertexData({
                width: this.props.object.metadata.width,
                height: this.props.object.metadata.height,
                depth: this.props.object.metadata.depth,
            }), false);
        };

        return (
            <EditorInspectorSectionField title="Box">
                <EditorInspectorNumberField object={this.props.object.metadata} property="width" label="Width" step={0.1} onChange={() => onChange()} />
                <EditorInspectorNumberField object={this.props.object.metadata} property="height" label="Height" step={0.1} onChange={() => onChange()} />
                <EditorInspectorNumberField object={this.props.object.metadata} property="depth" label="Depth" step={0.1} onChange={() => onChange()} />
            </EditorInspectorSectionField>
        );
    }

    private _getGroundInspectorComponent(): ReactNode {
        const onChange = () => {
            this.props.object.geometry?.setAllVerticesData(CreateGroundVertexData({
                width: this.props.object.metadata.width,
                height: this.props.object.metadata.height,
                subdivisions: this.props.object.metadata.subdivisions >> 0,
            }), false);
        };

        return (
            <EditorInspectorSectionField title="Ground">
                <EditorInspectorNumberField object={this.props.object.metadata} property="width" label="Width" step={0.1} onChange={() => onChange()} />
                <EditorInspectorNumberField object={this.props.object.metadata} property="height" label="Height" step={0.1} onChange={() => onChange()} />
                <EditorInspectorNumberField object={this.props.object.metadata} property="subdivisions" label="Subdivisions" step={1} min={1} onChange={() => onChange()} />
            </EditorInspectorSectionField>
        );
    }
}
