import { Nullable } from "../../../../shared/types";

import * as React from "react";

import {
    ParticleSystem, FactorGradient, IValueGradient,
} from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";

import { InspectorButton } from "../../gui/inspector/button";
import { InspectorSection } from "../../gui/inspector/section";

import { AbstractInspector } from "../abstract-inspector";

import { ParticleSystemFactorGradient } from "./factor-gradient";

export interface IGroundInspectorState {
    /**
     * Defines the list of all available start size gradients.
     */
    startSizeGradients: Nullable<FactorGradient[]>;
    /**
     * Defines the list of all available size gradients.
     */
    sizeGradients: Nullable<FactorGradient[]>;
}

export interface IFactorGradientCreator {
    /**
     * Defines the title of the gradient category.
     */
    title: string;
    /**
     * Defines the list of all available gradients to be edited.
     */
    gradients: Nullable<FactorGradient[]>;
    /**
     * Called on the user wants to add a new gradient.
     */
    onAdd: () => void;
    /**
     * Called on the user wants to remove a gradient.
     */
    onRemove: (gradient: FactorGradient) => void;
    /**
     * Defines the string used on the button to use gradients.
     */
    useString: string;
    /**
     * Defines the string used on the button to add a new gradient.
     */
    addString: string;
}

export class ParticleSystemGradientsInspector extends AbstractInspector<ParticleSystem, IGroundInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            startSizeGradients: this._getNullableGradient(this.selectedObject.getStartSizeGradients()),
            sizeGradients: this._getNullableGradient(this.selectedObject.getSizeGradients()),
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {this.getFactorGradientInspector({
                    title: "Start Size",
                    useString: "Use Start Size Gradients",
                    addString: "Add Start Size Gradients",
                    gradients: this.state.startSizeGradients,
                    onAdd: () => {
                        this.selectedObject.addStartSizeGradient(0, 1, 1);
                        this.setState({ startSizeGradients: this._getNullableGradient(this.selectedObject.getStartSizeGradients()) })
                    },
                    onRemove: (g) => {
                        this.selectedObject.removeStartSizeGradient(g.gradient);
                        this.setState({ startSizeGradients: this._getNullableGradient(this.selectedObject.getStartSizeGradients()) });
                    },
                })}
                {this.getFactorGradientInspector({
                    title: "Size",
                    useString: "Use Size Gradients",
                    addString: "Add Size Gradients",
                    gradients: this.state.sizeGradients,
                    onAdd: () => {
                        this.selectedObject.addSizeGradient(0, 1, 1);
                        this.setState({ sizeGradients: this._getNullableGradient(this.selectedObject.getSizeGradients()) })
                    },
                    onRemove: (g) => {
                        this.selectedObject.removeSizeGradient(g.gradient);
                        this.setState({ sizeGradients: this._getNullableGradient(this.selectedObject.getSizeGradients()) });
                    },
                })}
            </>
        );
    }

    /**
     * Returns the inspector used to configure the given gradients.
     * @param configuration defines the reference to the configuration of the gradient inspector.
     */
    protected getFactorGradientInspector(configuration: IFactorGradientCreator): React.ReactNode {
        if (!configuration.gradients) {
            return (
                <InspectorSection title={configuration.title}>
                    <InspectorButton label={configuration.useString} small={true} onClick={() => configuration.onAdd()} />
                </InspectorSection>
            );
        }

        return (
            <InspectorSection title={configuration.title}>
                {configuration.gradients.map((g, index) => (
                    <ParticleSystemFactorGradient key={`start-size-gradient-${index}`} index={index} particleSystem={this.selectedObject} gradient={g} onRemove={() => {
                        configuration.onRemove(g);
                    }} />
                ))}

                <InspectorButton label={configuration.addString} small={true} onClick={() => configuration.onAdd()} />
            </InspectorSection>
        );
    }

    /**
     * Returns a null value in case of 0 or null gradients.
     */
    private _getNullableGradient<T extends IValueGradient>(gradients: Nullable<T[]>): Nullable<T[]> {
        if ((gradients?.length ?? 0) === 0) {
            return null;
        }

        return gradients;
    }
}

Inspector.RegisterObjectInspector({
    ctor: ParticleSystemGradientsInspector,
    ctorNames: ["ParticleSystem"],
    title: "Gradients",
});
