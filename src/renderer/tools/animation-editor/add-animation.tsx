import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Dialog, Classes, MenuItem, Button, Callout, InputGroup, RadioGroup, Radio, Divider, Switch, Intent, NumericInput, FormGroup } from "@blueprintjs/core";
import { Suggest } from "@blueprintjs/select";

import { Animation, Color3, Color4, IAnimatable, Quaternion, Vector2, Vector3 } from "babylonjs";

import { Tools } from "../../editor/tools/tools";

const PropertyPathSuggest = Suggest.ofType<string>();

export interface IAddAnimationProps {
    /**
     * Defines the callback called on the animation has been added.
     */
    onAnimationAdded: (animation: Animation) => void;
}

export interface IAddAnimationState {
    /**
     * Defines wether or not the dialog is opened.
     */
    isOpened: boolean;
    /**
     * Defines the reference to the selected animatable.
     */
    selectedAnimatable: Nullable<IAnimatable>;
    /**
     * Defines the name of the animation.
     */
    animationName: string;
    /**
     * Defines the current value being drawn in the input.
     */
    targetProperty: string;
    /**
     * Defines the list of items to be drawn in the suggest.
     */
    items: string[];
    /**
     * Defines the type of the animation (float, vector, etc.).
     */
    animationType: string;
    /**
     * Defines wether or not blending is enabled for the animation.
     */
    enableBlending: boolean;
    /**
     * Defines the number of frames per second for the animation.
     */
    framesPerSecond: number;
}

export class AddAnimation extends React.Component<IAddAnimationProps, IAddAnimationState> {
    /**
     * Defines the hidden properties due to usage of property descriptors in Babylon.JS
     */
    private static _HiddenProperties: string[] = [
        "position", "rotation", "scaling", "rotationQuaternion",
        "material",

        "target",

        "x", "y", "z",

        "alpha",
    ];

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IAddAnimationProps) {
        super(props);

        this.state = {
            targetProperty: "",
            items: [],
            isOpened: false,
            selectedAnimatable: null,
            animationName: "New Animation",
            animationType: "ANIMATIONTYPE_FLOAT",
            enableBlending: false,
            framesPerSecond: 60,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <Dialog
                usePortal={true}
                className={Classes.DARK}
                title="Add New Animation"
                isOpen={this.state.isOpened}
            >
                <div className={Classes.DIALOG_BODY}>
                    <Callout title="Animation Name">
                        <InputGroup
                            placeholder="Animation Name..."
                            small={true}
                            value={this.state.animationName}
                            onChange={(e) => this.setState({ animationName: e.target.value })}
                        />
                    </Callout>
                    <Divider />
                    <Callout title="Property Path" intent={Intent.WARNING}>
                        <PropertyPathSuggest
                            fill={true}
                            items={this.state.items}
                            inputValueRenderer={(v) => v}
                            closeOnSelect={false}
                            resetOnSelect={false}
                            popoverProps={{
                                fill: true,
                            }}
                            inputProps={{
                                fill: true,
                            }}
                            query={this.state.targetProperty}
                            noResults={<MenuItem disabled={true} text="No results." />}
                            itemRenderer={(i, props) => {
                                if (!props.modifiers.matchesPredicate) { return null; }
                                return (
                                    <MenuItem
                                        text={i}
                                        key={`${i}_${props.index}`}
                                        onClick={props.handleClick}
                                        active={props.modifiers.active}
                                        disabled={props.modifiers.disabled}
                                    />
                                );
                            }}
                            onItemSelect={(i) => {
                                const split = this.state.targetProperty.split(".");
                                split.pop();
                                
                                const value = split.concat(i).join(".");
                                
                                this.setState({ targetProperty: value });
                            }}
                            onQueryChange={(value) => this._handlePropertyPathQueryChanged(value)}
                        />
                    </Callout>
                    <Divider />
                    <Callout title="Animation Type" intent={Intent.WARNING}>
                        <RadioGroup
                            label="Data Type"
                            onChange={(e) => this.setState({ animationType: (e.target as HTMLInputElement).value })}
                            selectedValue={this.state.animationType}
                        >
                            <Radio label="Float" value="ANIMATIONTYPE_FLOAT" />
                            <Radio label="Vector2" value="ANIMATIONTYPE_VECTOR2" />
                            <Radio label="Vector3" value="ANIMATIONTYPE_VECTOR3" />
                            <Radio label="Color3" value="ANIMATIONTYPE_COLOR3" />
                            <Radio label="Color4" value="ANIMATIONTYPE_COLOR4" />
                            <Radio label="Quaternion" value="ANIMATIONTYPE_QUATERNION" />
                        </RadioGroup>
                    </Callout>
                    <Divider />
                    <Callout title="Options">
                        <Switch
                            label="Enable Blending"
                            checked={this.state.enableBlending}
                            onChange={(e) => this.setState({ enableBlending: (e.target as HTMLInputElement).checked })}
                        />
                        <FormGroup label="Frames Per Second">
                            <NumericInput
                                min={1}
                                fill={true}
                                allowNumericCharactersOnly={true}
                                placeholder="Frames Per Second..."
                                value={this.state.framesPerSecond}
                                onChange={(e) => this.setState({ framesPerSecond: Math.max(parseFloat(e.target.value), 1) })}
                            />
                        </FormGroup>
                    </Callout>
                    <Divider />
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button onClick={() => this.setState({ isOpened: false })}>Cancel</Button>
                        <Button onClick={() => this._handleAddAnimation()}>Add</Button>
                    </div>
                </div>
            </Dialog>
        );
    }

    /**
     * Shows the dialog using the given animatable.
     * @param animatable defines the reference to the animatable.
     */
    public showWithAnimatable(animatable: IAnimatable): void {
        this.setState({
            isOpened: true,
            selectedAnimatable: animatable,
        }, () => {
            this.setState({ items: this._getAvailableItems(this.state.targetProperty) });
        });
    }

    /**
     * Called on the query changed for property path.
     */
    private _handlePropertyPathQueryChanged(value: string): void {
        this.setState({ targetProperty: value, items: this._getAvailableItems(value) });

        try {
            const property = Tools.GetProperty(this.state.selectedAnimatable, value);
            
            if (typeof(property) === "number") {
                this.setState({ animationType: "ANIMATIONTYPE_FLOAT" });
            } else if (property instanceof Vector2) {
                this.setState({ animationType: "ANIMATIONTYPE_VECTOR2" });
            } else if (property instanceof Vector3) {
                this.setState({ animationType: "ANIMATIONTYPE_VECTOR3" });
            } else if (property instanceof Color3) {
                this.setState({ animationType: "ANIMATIONTYPE_COLOR3" });
            } else if (property instanceof Color4) {
                this.setState({ animationType: "ANIMATIONTYPE_COLOR4" });
            } else if (property instanceof Quaternion) {
                this.setState({ animationType: "ANIMATIONTYPE_QUATERNION" });
            }
        } catch (e) {
            // Catch silently.
        }
    }

    /**
     * Called on the query changed.
     */
    private _getAvailableItems(value: string): string[] {
        if (!this.state.selectedAnimatable) {
            return [];
        }

        const split = value.split(".");
        const finalProperty = split.pop()!;

        const basePath = split.join(".");
        const property = split.length ? (Tools.GetProperty<any>(this.state.selectedAnimatable, basePath) ?? null) : this.state.selectedAnimatable;

        if (property === null) {
            return [];
        }

        const result: string[] = [];
        const keys: string[] = [];
        
        for (const hiddenKey of AddAnimation._HiddenProperties) {
            const value = property[hiddenKey] ?? null;
            if (value !== null) {
                keys.push(hiddenKey);
            }
        }

        for (const key in property) {
            keys.push(key);
        }

        Tools.SortAlphabetically(keys);

        for (const key of Tools.Distinct(keys)) {
            if (key[0] === "_") { continue; }
            if (key.toLowerCase().indexOf(finalProperty.toLowerCase()) === -1) { continue; }

            const targetValue = property[key];
            if (Array.isArray(targetValue)) { continue; }

            const type = typeof(targetValue);
            if (type === "function" || type === "boolean" || type === "string") { continue; }

            result.push(key);
        }

        return result;
    }

    /**
     * Called on the user clicks on the button "add".
     */
    private _handleAddAnimation(): void {
        if (!this.state.selectedAnimatable?.animations) { return; }

        const targetProperty = Tools.GetProperty<any>(this.state.selectedAnimatable, this.state.targetProperty) ?? null;
        if (targetProperty === null) { return; }

        const animation = new Animation(
            this.state.animationName,
            this.state.targetProperty,
            this.state.framesPerSecond,
            Animation[this.state.animationType],
            Animation.ANIMATIONLOOPMODE_CONSTANT,
            this.state.enableBlending,
        );

        switch (animation.dataType) {
            case Animation.ANIMATIONTYPE_FLOAT:
                animation.setKeys([
                    { frame: 0, value: targetProperty },
                    { frame: 60, value: targetProperty },
                ]);
                break;

            case Animation.ANIMATIONTYPE_VECTOR2:
            case Animation.ANIMATIONTYPE_VECTOR3:
            case Animation.ANIMATIONTYPE_COLOR3:
            case Animation.ANIMATIONTYPE_COLOR4:
            case Animation.ANIMATIONTYPE_QUATERNION:
                animation.setKeys([
                    { frame: 0, value: targetProperty.clone() },
                    { frame: 60, value: targetProperty.clone() },
                ]);
                break;
        }

        this.state.selectedAnimatable.animations.push(animation);
        this.props.onAnimationAdded(animation);

        this.setState({ isOpened: false });
    }
}
