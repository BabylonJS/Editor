import { Component, ReactNode } from "react";

import { IoPlay, IoStop, IoRefresh } from "react-icons/io5";

import { ParticleSystem } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { isParticleSystem } from "../../../../tools/guards/particles";
import { onParticleSystemModifiedObservable } from "../../../../tools/observables";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorTextureField } from "../fields/texture";

import { IEditorInspectorImplementationProps } from "../inspector";

export interface IEditorParticleSystemInspectorState {
    started: boolean;
}

export class EditorParticleSystemInspector extends Component<IEditorInspectorImplementationProps<ParticleSystem>, IEditorParticleSystemInspectorState> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: unknown): boolean {
        return isParticleSystem(object);
    }

    public constructor(props: IEditorInspectorImplementationProps<ParticleSystem>) {
        super(props);

        this.state = {
            started: props.object.isAlive(),
        };
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Common">
                    <div className="flex justify-between items-center px-2 py-2">
                        <div className="w-1/2">
                            Type
                        </div>

                        <div className="text-white/50">
                            {this.props.object.getClassName()}
                        </div>
                    </div>

                    <EditorInspectorStringField label="Name" object={this.props.object} property="name" onChange={() => onParticleSystemModifiedObservable.notifyObservers(this.props.object)} />

                    <div className="flex justify-center items-center gap-2">
                        <Button
                            onClick={() => this._handleStartOrStop()}
                            className={`
                                w-10 h-10 bg-muted/50 !rounded-lg p-0.5
                                ${this.state.started ? "!bg-red-500/35" : "hover:!bg-green-500/35"}
                                transition-all duration-300 ease-in-out
                            `}
                        >
                            {this.state.started
                                ? <IoStop className="w-6 h-6" strokeWidth={1} color="red" />
                                : <IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
                            }
                        </Button>

                        <Button
                            onClick={() => this.props.object.reset()}
                            className="w-10 h-10 bg-muted/50 !rounded-lg p-0.5"

                        >
                            <IoRefresh className="w-6 h-6" strokeWidth={1} color="red" />
                        </Button>
                    </div>
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Textures">
                    <EditorInspectorTextureField object={this.props.object} property="particleTexture" title="Base Texture" />
                </EditorInspectorSectionField>
            </>
        );
    }

    private _handleStartOrStop(): void {
        if (this.state.started) {
            this.props.object.stop();
            this.setState({
                started: false,
            });
        } else {
            this.props.object.start();
            this.setState({
                started: true,
            });
        }
    }
}
