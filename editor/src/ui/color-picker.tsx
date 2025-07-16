import { Component, ReactNode } from "react";

import { Color, ColorXplrApp, createColorXplr, ColorXplrParams } from "@jniac/color-xplr";

export interface IColorPickerProps extends Pick<ColorXplrParams, "alpha" | "color"> {
    className?: string;

    onChange: (color: Color) => void;
    onFinish: (color: Color) => void;
}

export class ColorPicker extends Component<IColorPickerProps> {
	private _divRef: HTMLDivElement | null = null;
	private _colorXplr: ColorXplrApp | null = null;

	public render(): ReactNode {
		return (
			<div className={this.props.className} ref={(r) => this._divRef = r} />
		);
	}

	public componentDidMount(): void {
		if (this._divRef) {
			this._onGotDivRef(this._divRef);
		}
	}

	public componentWillUnmount(): void {
		this._colorXplr?.destroy();
	}

	private _onGotDivRef(div: HTMLDivElement): void {
		this._colorXplr?.destroy();

		this._colorXplr = createColorXplr({
			style: {
				backgroundColor: "#999",
			},
			color: this.props.color,
			alpha: this.props.alpha,
			onChange: ({ color }) => this.props.onChange?.(color),
			onFinish: ({ color }) => this.props.onFinish?.(color),
		});

		div.append(this._colorXplr.element);
	}
}
