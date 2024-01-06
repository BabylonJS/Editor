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
            <div className={this.props.className} ref={(r) => this._onGotDivRef(r)} />
        );
    }

    public onComponentWillUnmount(): void {
        this._colorXplr?.destroy();
    }

    private _onGotDivRef(div: HTMLDivElement | null): void {
        if (this._divRef === div) {
            return;
        }

        this._divRef = div;
        this._colorXplr?.destroy();

        if (!this._divRef) {
            return;
        }

        this._colorXplr = createColorXplr({
            style: {
                backgroundColor: "#999",
            },
            color: this.props.color,
            alpha: this.props.alpha,
            onChange: ({ color }) => this.props.onChange?.(color),
            onFinish: ({ color }) => this.props.onFinish?.(color),
        });

        this._divRef.append(this._colorXplr.element);
    }
}
