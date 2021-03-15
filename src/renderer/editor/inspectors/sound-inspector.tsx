import { join } from "path";

import { Nullable } from "../../../shared/types";

import * as React from "react";

import { Sound } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../components/inspector";

import { AbstractInspector } from "./abstract-inspector";

import { InspectorList } from "../gui/inspector/list";
import { InspectorNumber } from "../gui/inspector/number";
import { InspectorButton } from "../gui/inspector/button";
import { InspectorSection } from "../gui/inspector/section";
import { InspectorBoolean } from "../gui/inspector/boolean";

import { Project } from "../project/project";

export interface ISoundInspectorState {
    /**
     * Defines the current volume of the sound
     */
    volume: number;
    /**
     * Defines the current playback rate of the sound.
     */
    playbackRate: number;
    /**
     * Defines the current rolloff factor of the sound.
     */
    rolloffFactor: number;

    /**
     * Defines wether or not the sound is playing.
     */
    isPlaying: boolean;
}

export class SoundInspector extends AbstractInspector<Sound, ISoundInspectorState> {
    private _updateInterval: Nullable<number> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            volume: this.selectedObject.getVolume(),
            playbackRate: this.selectedObject["_playbackRate"],
            rolloffFactor: this.selectedObject.rolloffFactor,
            isPlaying: this.selectedObject.isPlaying,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <InspectorSection title="Common">
                    <InspectorBoolean object={this.selectedObject} property="loop" label="Loop" />
                    <InspectorBoolean object={this.selectedObject} property="autoplay" label="Auto Play" />
                </InspectorSection>

                {this._getReaderInspector()}

                <InspectorSection title="Controls">
                    <InspectorNumber object={this.state} property="volume" label="Volume" min={0} max={1} step={0.01} onChange={(v) => {
                        this.selectedObject.setVolume(v);
                    }} />
                    <InspectorNumber object={this.state} property="playbackRate" label="Playback Rate" min={0} max={1} step={0.01} onChange={(v) => {
                        this.selectedObject.setPlaybackRate(v);
                    }} />
                    <InspectorNumber object={this.state} property="rolloffFactor" label="Rolloff Factor" min={0} max={1} step={0.01} onChange={(v) => {
                        this.selectedObject.updateOptions({ rolloffFactor: v });
                    }} />
                </InspectorSection>

                {this._getSpatialInspector()}
            </>
        );
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        if (this._updateInterval) {
            clearInterval(this._updateInterval);
        }

        this._updateInterval = null;
    }

    /**
     * Called on the user wants to play the sound.
     */
    private _handlePlay(): void {
        this.setState({ isPlaying: true });
    }

    /**
     * Called on the user wants to stop the sound.
     */
    private _handleStop(): void {
        this.setState({ isPlaying: false });
    }

    /**
     * Returns the inspector used to play/stop the selected sound.
     */
    private _getReaderInspector(): React.ReactNode {
        if (!Project.DirPath || !this.state.isPlaying) {
            return (
                <InspectorSection title="Actions">
                    <InspectorButton label="Play" onClick={() => this._handlePlay()} />
                </InspectorSection>
            );
        }

        const path = join(Project.DirPath, this.selectedObject.name);

        return (
            <InspectorSection title="Actions">
                <InspectorButton label="Stop" onClick={() => this._handleStop()} />
                <audio src={path} style={{ width: "100%" }} controls={true} autoPlay={true}></audio>
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to configure the spatial properties of the sound.
     */
    private _getSpatialInspector(): React.ReactNode {
        if (!this.selectedObject.spatialSound) {
            return undefined;
        }

        return (
            <InspectorSection title="Spatial">
                <InspectorList object={this.selectedObject} property="distanceModel" label="Distance Model" items={[
                    { label: "Linear", data: "linear" },
                    { label: "Exponential", data: "exponential" },
                    { label: "Inverse", data: "inverse" },
                ]} onChange={(v) => {
                    this.selectedObject.updateOptions({ distanceModel: v });
                }} />

                <InspectorNumber object={this.selectedObject} property="maxDistance" label="Max Distance" min={0} step={0.01} onChange={(v) => {
                    this.selectedObject.updateOptions({ maxDistance: v });
                }} />
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: SoundInspector,
    ctorNames: ["Sound"],
    title: "Sound",
});
