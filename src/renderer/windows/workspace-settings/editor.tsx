import * as React from "react";
import { Divider, Callout, Intent, FormGroup, InputGroup, Button } from "@blueprintjs/core";

import WorkspaceSettingsWindow from "./index";

export interface IEditorSettingsProps {
    /**
     * Defines the reference to the settings window.
     */
    settings: WorkspaceSettingsWindow;
}

export interface IEditorSettingsState {
    
}

export class EditorSettings extends React.Component<IEditorSettingsProps, IEditorSettingsState> {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const positionGizmoSnapping = this.props.settings.state.positionGizmoSnapping ?? [0, 1, 2, 5, 10];
        const rotationGizmoSnapping = this.props.settings.state.rotationGizmoSnapping ?? [0, 1, 2, 5, 10];

        return (
            <div>
                <Callout intent={Intent.NONE} title="Position Gizmo Snapping Values">
                    <FormGroup key="position-snapping" label="Positon Gizmo Snapping Values">
                        {positionGizmoSnapping.map((p, index) => (
                            <InputGroup id="" key={`position-snapping-${index}`} type="number" min={0} value={p.toString()} step={0.1} onChange={(e) => {
                                positionGizmoSnapping[index] = parseFloat(e.currentTarget.value);
                                this.setState({ positionGizmoSnapping });
                            }} />
                        ))}
                        <Button text="Add..." icon="add" fill={true} />
                    </FormGroup>
                </Callout>
                <Divider />
                <Callout intent={Intent.PRIMARY} title="Rotation Gizmo Snapping Values">
                    <FormGroup key="rotation-snapping" label="Rotation Gizmo Snapping Values">
                        {rotationGizmoSnapping.map((p, index) => (
                            <InputGroup id="" key={`rotation-snapping-${index}`} type="number" min={0} value={p.toString()} step={0.1} onChange={(e) => {
                                rotationGizmoSnapping[index] = parseFloat(e.currentTarget.value);
                                this.setState({ rotationGizmoSnapping });
                            }} />
                        ))}
                        <Button text="Add..." icon="add" fill={true} />
                    </FormGroup>
                </Callout>
            </div>
        );
    }
}
