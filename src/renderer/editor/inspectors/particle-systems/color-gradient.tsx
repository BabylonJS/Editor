import * as React from "react";
import Slider from "antd/lib/slider";
import { Button } from "@blueprintjs/core";

import { ParticleSystem, ColorGradient } from "babylonjs";

import { InspectorColorPicker } from "../../gui/inspector/fields/color-picker";

export interface IParticleSystemColorGradientProps {
    /**
     * Defines the reference to the particle system.
     */
    particleSystem: ParticleSystem;
    /**
     * Defines the reference to the gradient.
     */
    gradient: ColorGradient;
    /**
     * Defines the index of the gradient
     */
    index: number;

    /**
     * Defines the callback called on the gradient is removed.
     */
    onRemove: () => void;
    /**
     * Defines the callback called on the gradient finished change.
     */
    onFinishChangeGradient: () => void;
}

export interface IParticleSystemColorState {
    /**
     * Defines the current gradient value.
     */
    gradient: number;
}

export class ParticleSystemColorGradient extends React.Component<IParticleSystemColorGradientProps, IParticleSystemColorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IParticleSystemColorGradientProps) {
        super(props);

        this.state = {
            gradient: props.gradient.gradient,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "calc(100% + 15px)", height: "30px" }}>
                <span style={{ float: "left", lineHeight: "30px", textAlign: "center", marginLeft: "-20px" }}>
                    #{this.props.index}
                </span>

                <div style={{ width: "20%", height: "30px", float: "left", paddingTop: "3px", marginLeft: "5px" }}>
                    <InspectorColorPicker object={this.props.gradient} property="color1" label="Factor 1" noLabel={true} />
                </div>
                <div style={{ width: "20%", height: "30px", float: "left", paddingTop: "3px", marginLeft: "5px" }}>
                    <InspectorColorPicker object={this.props.gradient} property="color2" label="Factor 2" noLabel={true} />
                </div>

                <div style={{ width: "calc(55% - 24px)", height: "30px", float: "left", padding: "0px 5px", marginTop: "0px" }}>
                    <Slider
                        key="min-max-slider"
                        value={this.state.gradient}
                        min={0}
                        max={1}
                        step={0.001}
                        onChange={(v) => {
                            this.props.gradient.gradient = v;
                            this.setState({ gradient: v });
                        }}
                        onAfterChange={() => {
                            this.props.onFinishChangeGradient();
                        }}
                    />
                </div>

                <Button style={{ float: "left", marginTop: "3px" }} icon="trash" small={true} onClick={() => this.props.onRemove()} />
            </div>
        );
    }
}
