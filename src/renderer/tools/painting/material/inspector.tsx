import * as React from "react";
import { H4 } from "@blueprintjs/core";

import { IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/inspectors/abstract-inspector";

import { DecalsPainter } from "../../../editor/painting/decals/decals";

export interface IMaterialPainterState {

}

export class MaterialPainterInspector extends AbstractInspector<DecalsPainter, IMaterialPainterState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.selectedObject = new DecalsPainter(this.editor);

        this.state = {
            selectedMaterialAsset: null,
        };
    }

    /**
     * Renders the component.
     */
     public render(): React.ReactNode {
        return (
            <>
                <H4 style={{ textAlign: "center" }}>Material Painter</H4>
                {super.render()}
            </>
        );
    }

    /**
     * Renders the content of the inspector.
     */
     public renderContent(): React.ReactNode {
        return (
            <div>
                TODO
            </div>
        );
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        this.selectedObject?.dispose();
    }
}
