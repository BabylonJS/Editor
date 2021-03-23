import { Nullable } from "../../../../shared/types";

import * as React from "react";

import {
    ParticleSystem, FactorGradient, ColorGradient, IValueGradient,
    Color4,
} from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";

import { InspectorButton } from "../../gui/inspector/fields/button";
import { InspectorSection } from "../../gui/inspector/fields/section";

import { AbstractInspector } from "../abstract-inspector";

import { ParticleSystemColorGradient } from "./color-gradient";
import { ParticleSystemFactorGradient } from "./factor-gradient";

export interface IParticleGradientInspectorState {
    /**
     * Defines the list of all available start size gradients.
     */
    startSizeGradients: Nullable<FactorGradient[]>;
    /**
     * Defines the list of all available size gradients.
     */
    sizeGradients: Nullable<FactorGradient[]>;
    /**
     * Defines the list of all available lifetime gradients.
     */
    lifetimeGradients: Nullable<FactorGradient[]>;
    /**
     * Defines the list of all available velocity gradients;
     */
    velocityGradients: Nullable<FactorGradient[]>;
    /**
     * Defines the list of all available angular speed gradients.
     */
    angularSpeedGradients: Nullable<FactorGradient[]>;
    /**
     * Defines the list of all available color gradients.
     */
    colorGradients: Nullable<ColorGradient[]>;
}

export interface IGradientCreator<T> {
    /**
     * Defines the title of the gradient category.
     */
    title: string;
    /**
     * Defines the list of all available gradients to be edited.
     */
    getGradients: () => Nullable<T[]>;
    /**
     * Called on the user wants to add a new gradient.
     */
    onAdd: () => void;
    /**
     * Called on the user wants to remove a gradient.
     */
    onRemove: (gradient: T) => void;
    /**
     * Defines the string used on the button to use gradients.
     */
    useString: string;
    /**
     * Defines the string used on the button to add a new gradient.
     */
    addString: string;
    /**
     * Defines the key in the state used when updating the state.
     */
    stateKey: keyof IParticleGradientInspectorState;
}

export class ParticleSystemGradientsInspector extends AbstractInspector<ParticleSystem, IParticleGradientInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            startSizeGradients: this._getNullableGradient(this.selectedObject.getStartSizeGradients()),
            sizeGradients: this._getNullableGradient(this.selectedObject.getSizeGradients()),
            lifetimeGradients: this._getNullableGradient(this.selectedObject.getLifeTimeGradients()),
            velocityGradients: this._getNullableGradient(this.selectedObject.getVelocityGradients()),
            angularSpeedGradients: this._getNullableGradient(this.selectedObject.getAngularSpeedGradients()),
            colorGradients: this._getNullableGradient(this.selectedObject.getColorGradients()),
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {this.getFactorGradientInspector({
                    title: "Size",
                    useString: "Use Size Gradients",
                    addString: "Add Size Gradients",
                    stateKey: "sizeGradients",
                    getGradients: () => this.selectedObject.getSizeGradients(),
                    onAdd: () => this.selectedObject.addSizeGradient(1, 1, 1),
                    onRemove: (g) => this.selectedObject.removeSizeGradient(g.gradient),
                })}

                {this.getFactorGradientInspector({
                    title: "Lifetime",
                    useString: "Use Lifetime Gradients",
                    addString: "Add Lifetime Gradient",
                    stateKey: "lifetimeGradients",
                    getGradients: () => this.selectedObject.getLifeTimeGradients(),
                    onAdd: () => this.selectedObject.addLifeTimeGradient(1, 1, 1),
                    onRemove: (g) => this.selectedObject.removeLifeTimeGradient(g.gradient),
                })}

                {this.getFactorGradientInspector({
                    title: "Velocity",
                    useString: "Use Velocity Gradients",
                    addString: "Add Velocity Gradient",
                    stateKey: "velocityGradients",
                    getGradients: () => this.selectedObject.getVelocityGradients(),
                    onAdd: () => this.selectedObject.addVelocityGradient(1, 1, 1),
                    onRemove: (g) => this.selectedObject.removeVelocityGradient(g.gradient),
                })}

                {this.getFactorGradientInspector({
                    title: "Angular Speed",
                    useString: "Use Angular Speed Gradients",
                    addString: "Add Angular Speed Gradient",
                    stateKey: "angularSpeedGradients",
                    getGradients: () => this.selectedObject.getAngularSpeedGradients(),
                    onAdd: () => this.selectedObject.addAngularSpeedGradient(1, 1, 1),
                    onRemove: (g) => this.selectedObject.removeAngularSpeedGradient(g.gradient),
                })}

                {this.getColorGradientInspector({
                    title: "Color",
                    useString: "Use Color Gradients",
                    addString: "Add Color Gradient",
                    stateKey: "colorGradients",
                    getGradients: () => this.selectedObject.getColorGradients(),
                    onAdd: () => this.selectedObject.addColorGradient(1, new Color4(1, 1, 1, 1), new Color4(1, 1, 1, 1)),
                    onRemove: (g) => this.selectedObject.removeColorGradient(g.gradient),
                })}
            </>
        );
    }

    /**
     * Returns the inspector used to configure the given factor gradients.
     * @param configuration defines the reference to the configuration of the gradient inspector.
     */
    protected getFactorGradientInspector(configuration: IGradientCreator<FactorGradient>): React.ReactNode {
        const gradients = configuration.getGradients();

        if (!gradients?.length) {
            return (
                <InspectorSection title={configuration.title}>
                    <InspectorButton label={configuration.useString} small={true} onClick={() => {
                        configuration.onAdd();
                        this._updateGradientState(configuration);
                    }} />
                </InspectorSection>
            );
        }

        return (
            <InspectorSection title={configuration.title}>
                {gradients.map((g, index) => (
                    <ParticleSystemFactorGradient key={`${configuration.stateKey}-${index}-${g.gradient}`} index={index} particleSystem={this.selectedObject} gradient={g} onRemove={() => {
                        configuration.onRemove(g);
                        this._updateGradientState(configuration);
                    }} onFinishChangeGradient={() => {
                        if (!gradients) { return; }

                        gradients.sort((a, b) => a.gradient - b.gradient);
                        this._updateGradientState(configuration);
                    }} />
                ))}

                <InspectorButton label={configuration.addString} small={true} onClick={() => {
                    configuration.onAdd();
                    this._updateGradientState(configuration);
                }} />
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to configure the given color gradients.
     * @param configuration defines the reference to the configuration of the gradient inspector.
     */
    protected getColorGradientInspector(configuration: IGradientCreator<ColorGradient>): React.ReactNode {
        const gradients = configuration.getGradients();
        if (!gradients?.length) {
            return (
                <InspectorSection title={configuration.title}>
                    <InspectorButton label={configuration.useString} small={true} onClick={() => {
                        configuration.onAdd();
                        this._updateGradientState(configuration);
                    }} />
                </InspectorSection>
            );
        }

        return (
            <InspectorSection title={configuration.title}>
                {gradients.map((g, index) => (
                    <ParticleSystemColorGradient key={`${configuration.stateKey}-${index}-${g.gradient}`} index={index} particleSystem={this.selectedObject} gradient={g} onRemove={() => {
                        configuration.onRemove(g);
                        this._updateGradientState(configuration);
                    }} onFinishChangeGradient={() => {
                        if (!gradients) { return; }

                        gradients.sort((a, b) => a.gradient - b.gradient);
                        this._updateGradientState(configuration);
                    }} />
                ))}

                <InspectorButton label={configuration.addString} small={true} onClick={() => {
                    configuration.onAdd();
                    this._updateGradientState(configuration);
                }} />
            </InspectorSection>
        );
    }

    /**
     * Updates the given factor state using its configuration.
     */
    private _updateGradientState(configuration: IGradientCreator<FactorGradient | ColorGradient>): void {
        this.setState({ [configuration.stateKey]: this._getNullableGradient(configuration.getGradients()) } as any);
    }

    /**
     * Returns a null value in case of 0 or null gradients.
     */
    private _getNullableGradient<T extends IValueGradient>(gradients: Nullable<T[]>): Nullable<T[]> {
        if ((gradients?.length ?? 0) === 0) {
            return null;
        }

        return gradients!.slice();
    }
}

Inspector.RegisterObjectInspector({
    ctor: ParticleSystemGradientsInspector,
    ctorNames: ["ParticleSystem"],
    title: "Gradients",
});
