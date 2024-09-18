import { Component, ReactNode } from "react";

import { Animation, IAnimationKey } from "babylonjs";

import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorVectorField } from "../../inspector/fields/vector";
import { EditorInspectorSectionField } from "../../inspector/fields/section";

import { EditorAnimation } from "../../animation";

export interface IEditorAnimationInspectorProps {
    animationEditor: EditorAnimation;
}

export interface IEditorAnimationInspectorState {
    key: IAnimationKey | null;
}

export class EditorAnimationInspector extends Component<IEditorAnimationInspectorProps, IEditorAnimationInspectorState> {
    public constructor(props: IEditorAnimationInspectorProps) {
        super(props);

        this.state = {
            key: null,
        };
    }

    public render(): ReactNode {
        return (
            <div
                className={`
                    absolute top-0 right-0 w-96 h-full p-2 bg-background border-l-primary-foreground border-l-4
                    ${this.state.key ? "translate-x-0" : "translate-x-full pointer-events-none"}
                    transition-all duration-300 ease-in-out
                `}
            >
                {this.state.key && this._getKeyInspector()}
            </div>
        );
    }

    /**
     * Sets the rerefence to the key to edit.
     * @param key defines the reference to the key to edit.
     */
    public setEditedKey(key: IAnimationKey | null): void {
        this.setState({ key });
    }

    private _getKeyInspector(): ReactNode {
        if (!this.state.key) {
            return null;
        }

        const animationType = getAnimationTypeForObject(this.state.key.value);

        return (
            <div className="flex flex-col gap-2 h-full">
                <div className="mx-auto font-semibold text-xl py-2">
                    Key
                </div>

                <EditorInspectorSectionField title="Properties">
                    <EditorInspectorNumberField object={this.state.key} property="frame" label="Frame" step={1} min={0} onChange={() => this.props.animationEditor.timelines.forceUpdate()} />

                    {animationType === Animation.ANIMATIONTYPE_FLOAT &&
                        <EditorInspectorNumberField object={this.state.key} property="value" label="Value" />
                    }

                    {animationType === Animation.ANIMATIONTYPE_VECTOR3 &&
                        <EditorInspectorVectorField object={this.state.key} property="value" label="Value" />
                    }
                </EditorInspectorSectionField>
            </div>
        );
    }
}
