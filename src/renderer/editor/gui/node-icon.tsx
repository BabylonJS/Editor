import { AbstractMesh, Light, Camera, Bone, Node } from "babylonjs";
import React, { Component } from "react";
import { Icon, IIconProps } from "./icon";

export type INodeIconProps = {
    /**
     * The node that the icon is based on
     */
    node: Node;
} & Omit<IIconProps, "src">;

export interface INodeIconState {

}

/**
 * Displays an icon to represent a given node based on its type.
 * ie. an instance of a camera displays a camera
 */
export class NodeIcon extends Component<INodeIconProps, INodeIconState> {
    constructor(props :INodeIconProps) {
        super(props);
        this.state ={}
    }

    render() {
        const { node, ...otherProps } = this.props;
        return <Icon src={NodeIcon.getIconSrc(node)} {...otherProps}></Icon>;
    }

    /**
     * Gets the svg source for a given node
     */
    public static getIconSrc(node: Node): string {
        if (node instanceof AbstractMesh)
            return "vector-square.svg";

        if (node instanceof Light)
            return "lightbulb.svg";

        if (node instanceof Camera)
            return "camera.svg";

        if (node instanceof Bone)
            return "bone.svg";


        return "clone.svg";
    }
}
