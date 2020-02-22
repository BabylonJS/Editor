import * as React from "react";

import { Undefinable } from "../../../shared/types";

export interface IIconProps {
    /**
     * The source of the image. Can be a svg.
     */
    src: string;
    /**
     * Optional id to set to the img element.
     */
    id?: Undefinable<string>;
    /**
     * Optional style to pass to the img element.
     */
    style?: Undefinable<React.CSSProperties>;
    /**
     * Optional callback called on the user clicks on the icon.
     */
    onClick?: Undefinable<(event: React.MouseEvent<HTMLImageElement, MouseEvent>) => void>;
    /**
     * Optional callback called ont he user's mouse is over the icon.
     */
    onOver?: Undefinable<(event: React.MouseEvent<HTMLImageElement, MouseEvent>) => void>;
    /**
     * Optional callback called ont he user's mouse left the icon.
     */
    onLeave?: Undefinable<(event: React.MouseEvent<HTMLImageElement, MouseEvent>) => void>;
}

export interface IIconState {
    /**
     * Style to pass/update to the img element.
     */
    style: React.CSSProperties;
}

/**
 * Defines the icon
 */
export class Icon extends React.Component<IIconProps, IIconState> {
    /**
     * Constructor.
     */
    public constructor(props: IIconProps) {
        super(props);
        this.state = { style: { } };
    }

    /**
     * Renders the icon component.
     */
    public render(): React.ReactNode {
        return (
            <img
                id={this.props.id}
                src={`./css/svg/${this.props.src}`}
                style={{ width: "16px", height: "16px", filter: "invert(1.0)", ...this.props.style, ...this.state.style }}
                onClick={this.props.onClick}
                onContextMenu={this.props.onClick}
                onMouseOver={this.props.onOver}
                onMouseLeave={this.props.onLeave}
            ></img>
        );
    }
}
