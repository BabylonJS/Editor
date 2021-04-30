import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { FileInput, Tooltip } from "@blueprintjs/core";

import { InspectorUtils } from "../utils";
import { InspectorNotifier } from "../notifier";

export interface IInspectorFileInputProps {
	/**
	 * Defines the reference to the object to modify.
	 */
	object: any;
	/**
	 * Defines the property to edit in the object.
	 */
	property: string;
	/**
	 * Defines the label of the field.
	 */
	label: string;

	/**
	 * Defines wether or not automatic undo/redo should be skipped.
	 */
	noUndoRedo?: boolean;

	/**
	 * Defines the optional callback called on the value changes.
	 * @param value defines the new value of the object's property.
	 */
	onChange?: (value: string) => void;
	/**
	 * Defines the optional callack called on the value finished changes.
	 * @param value defines the new value of the object's property.
	 * @param oldValue defines the old value of the property before it has been changed.
	 */
	onFinishChange?: (value: string, oldValue: string) => void;
}

export interface IInspectorFileInputState {
	/**
	 * Defines the current value of the input.
	 */
	value: string;
}

export class InspectorFileInput extends React.Component<IInspectorFileInputProps, IInspectorFileInputState> {
	private _initialValue: string;
	private _inspectorName: Nullable<string> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IInspectorFileInputProps) {
		super(props);

		const value = props.object[props.property];

		this._initialValue = value;
		this.state = { value };
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div style={{ width: "100%", height: "25px" }}>
				<div style={{ width: "30%", float: "left", borderLeft: "3px solid #1ed36f", padding: "0 4px 0 5px" }}>
					<Tooltip content={this.props.label}>
						<span style={{ lineHeight: "30px", textAlign: "center" }}>{this.props.label}</span>
					</Tooltip>
				</div>
				<div style={{ width: "70%", float: "left", marginTop: "-2px" }}>
					<Tooltip content={this.state.value || "None"} targetProps={{ style: { width: "100%" } }}>
						<FileInput text={this.state.value || "None"} fill={true} buttonText="Browse" onInputChange={(e) => this._handleInputChanged(e)} />
					</Tooltip>
				</div>
			</div>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public componentDidMount(): void {
		super.componentDidMount?.();

		this._inspectorName = InspectorUtils.CurrentInspectorName;
	}

	/**
	 * Called on the user changes the input path.
	 */
	private _handleInputChanged(e: React.FormEvent<HTMLInputElement>): void {
		const files = (e.target as HTMLInputElement).files;
		if (!files?.length) { return; }

		const value = files.item(0)!.path;
		if (value === this._initialValue) {
			return;
		}

		this.props.object[this.props.property] = value;

		this.props.onChange?.(value);
		this.props.onFinishChange?.(value, this._initialValue);

		// Undo/redo
		InspectorNotifier.NotifyChange(this.props.object, {
			caller: this,
		});

		InspectorUtils.NotifyInspectorChanged(this._inspectorName!, {
			object: this.props.object,
			newValue: this.state.value,
			oldValue: this._initialValue,
			property: this.props.property,
			noUndoRedo: this.props.noUndoRedo ?? false,
		});

		this._initialValue = value;
		this.setState({ value });
	}
}
