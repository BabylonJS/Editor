import { Undefinable, Nullable } from "../../../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { MenuItem, InputGroup, Position, Tooltip } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";

import * as dat from "dat.gui";

const ListSelect = Select.ofType<string>();

export interface _IListSuggestProps {
    controller: SuggestController;
}

export interface _IListSuggestState {
    list: string[];
    value: string;
}

export class _ListSuggest extends React.Component<_IListSuggestProps, _IListSuggestState> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: _IListSuggestProps) {
        super(props);
        this.state = {
            list: props.controller.list,
            value: props.controller.object[props.controller.property],
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <ListSelect
                items={this.state.list}
                itemRenderer={(i, props) => {
                    if (!props.modifiers.matchesPredicate) { return null; }
                    const showLabel = this.props.controller.__renderer?.onShowLabel;
                    const showIcon = this.props.controller.__renderer?.onShowIcon;

                    let label = (showLabel && showLabel(i)) ?? undefined;
                    if (label && label.length > 50) { label = label.substr(0, 50) + "..."; }

                    const icon = (showIcon && showIcon(i)) ?? undefined;

                    return <MenuItem active={props.modifiers.active} disabled={props.modifiers.disabled} icon={icon} label={label} key={`${i}_${props.index}`} text={i} onClick={props.handleClick} />;
                }}
                itemPredicate={(query, i) => i.toLowerCase().indexOf(query.toLowerCase()) !== -1}
                itemsEqual={(a, b) => a.toLowerCase() === b.toLowerCase()}
                noResults={<MenuItem disabled={true} text="No results." />}
                onItemSelect={(i) => {
                    this.props.controller.object[this.props.controller.property] = i;
                    if (this.props.controller.__onChange) { this.props.controller.__onChange(i); }
                    if (this.props.controller.__onFinishChange) { this.props.controller.__onFinishChange(i); }

                    this.props.controller["initialValue"] = this.state.value;
                    this.setState({ value: i });
                }}
                // activeItem={this.props.controller.object[this.props.controller.property]}
                // scrollToActiveItem={true}
                resetOnClose={true}
                resetOnQuery={true}
                resetOnSelect={true}
                inputProps={{
                    fill: true
                }}
                popoverProps={{
                    fill: true,
                    enforceFocus: true,
                    autoFocus: true,
                    usePortal: true,
                    position: Position.RIGHT,
                }}
            >
                <InputGroup
                    style={{ position: "relative", fontSize: "11px", height: "14px", width: "100%", borderRadius: "0px" }}
                    small={true}
                    placeholder="Search..."
                    readOnly={true}
                    value={this.state.value ?? "(No selection)"}
                    disabled={false}
                    onMouseEnter={() => {
                        if (this.props.controller.__renderer?.onUpdate) {
                            this.setState({ list: this.props.controller.__renderer.onUpdate() });
                        }
                    }}
                ></InputGroup>
                {this._getRightImg()}
            </ListSelect>
        );
    }

    /**
     * Returns an element that will be drawn on right of the input group.
     */
    private _getRightImg(): Undefinable<JSX.Element> {
        const onShowTooltip = this.props.controller.__renderer?.onShowTooltip;
        if (!onShowTooltip) { return undefined; }

        return (
            <Tooltip position={Position.BOTTOM_RIGHT} content={onShowTooltip ? onShowTooltip(this.state.value) : undefined}>
                <div style={{ position: "absolute", width: "22px", height: "22px", right: "0px", top: "0px" }} children={onShowTooltip(this.state.value)}></div>
            </Tooltip>
        )
    }
}

/**
 * Suggest conroller.
 */
export class SuggestController extends dat.controllers.Controller {
    /**
     * @hidden
     */
    public object: any;
    /**
     * @hidden
     */
    public property: string;
    /**
     * @hidden
     */
    public list: string[];
    /**
     * @hidden
     */
    public __onChange: (r: string) => void;
    /**
     * @hidden
     */
    public __onFinishChange: (r: string) => void;
    /**
     * @hidden
     */
    public __renderer: Undefinable<{
        onShowLabel?: (item: string) => string;
        onShowIcon?: (item: string) => JSX.Element;
        onShowTooltip?: (item: string) => JSX.Element | undefined;
        onUpdate?: () => string[];
    }>;

    private _title: HTMLSpanElement;

    private _suggest: Nullable<_ListSuggest> = null;

    /**
     * Constructor.
     * @param object the object to modify.
     * @param property the property of the object tu get and set changes.
     * @param list the list of suggestions.
     * @param onShowLabel optional callback called when rendering a suggestion item.
     */
    public constructor(object: any, property: string, list?: string[], renderer?: {
        onShowLabel?: (item: string) => string;
        onShowIcon?: (item: string) => JSX.Element;
        onUpdate?: () => string[];
        tooltip?: JSX.Element;
    }) {
        super(object, property);
        if (typeof(object[property]) !== "string") { throw "Can't create a suggest on types different from 'string'"; }

        // Common
        if (!list && !renderer?.onUpdate) {
            throw new Error("Must provide at least a list of onUpdate function.");
        }
        this.list = list ?? renderer!.onUpdate!();
        this.__renderer = renderer;

        // Create title
        this._title = document.createElement("span");
        this._title.classList.add("property-name");
        this._title.innerHTML = property;
        this.domElement.appendChild(this._title);

        // Create div
        const div = document.createElement("div");
        div.classList.add("c");
        this.domElement.appendChild(div);

        ReactDOM.render(<_ListSuggest ref={(ref) => this._suggest = ref} controller={this}></_ListSuggest>, div);
    }

    /**
     * Registers the onChange callback.
     */
    public onChange(callback: (r: string) => void): SuggestController {
        this.__onChange = callback;
        return this;
    }

    /**
     * Registers the onFinishChange callback.
     */
    public onFinishChange(callback: (r: string) => void): SuggestController {
        this.__onFinishChange = callback;
        return this;
    }

    /**
     * Updates the current display of the controller.
     */
    public updateDisplay(): SuggestController {
        this._suggest?.setState({ value: this.object[this.property] });
        return this;
    }

    /**
     * Sets a new name for the field.
     * @param name the new name of the field.
     */
    public name(name: string): SuggestController {
        this._title.innerHTML = name;
        return this;
    }
}

dat.GUI.prototype.addSuggest = function (object: any, property: string, list?: string[], renderer?: {
    onShowLabel?: (item: string) => string;
    onShowIcon?: (item: string) => JSX.Element;
    onUpdate?: () => string[];
}): SuggestController {
    // Create controller
    const controller = new SuggestController(object, property, list, renderer);

    // Create li element
    const li = document.createElement("li");
    li.classList.add("cr");
    li.classList.add("string");
    li.appendChild(controller.domElement);

    this.__ul.appendChild(li);

    // Finish
    this.onResize();
    controller.__li = li;
    controller.__gui = this;
    this.__controllers.push(controller);

    return controller;
};
