import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Observable, Observer } from "babylonjs";

import { Icon } from "../../gui/icon";

import { isAbstractMesh, isCamera, isIParticleSystem, isLight, isReflectionProbe, isScene, isSound, isTransformNode } from "./tools/tools";

export interface IGraphIconProps {
    /**
     * Defines the reference to the object.
     */
    object: any;
}

export interface IGraphIconState {
    /**
     * Defines the name of the icon to show.
     */
    icon: string;
    /**
     * Defines wether or not the node is enabled.
     */
    isEnabled: boolean;
}

export class GraphIcon extends React.Component<IGraphIconProps, IGraphIconState> {
    /**
     * Defines the reference to the observable used to notify obsevers that an icon in the graph has been clicked.
     * Once clicked, sets the attached object enabled or disabled.
     */
    public static OnClickedObservable: Observable<void> = new Observable<void>();

    private _clickedObserver: Nullable<Observer<void>> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IGraphIconProps) {
        super(props);

        this.state = {
            icon: this._getIcon(),
            isEnabled: props.object.isEnabled?.() ?? true,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <Icon
                src={this.state.icon}
                style={{
                    cursor: "pointer",
                    opacity: this.state.isEnabled ? "1.0" : "0.5",
                }}
                onClick={() => this._handleSetEnabled()}
            />
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        this._clickedObserver = GraphIcon.OnClickedObservable.add(() => {
            this.setState({ isEnabled: this.props.object.isEnabled?.() ?? true });
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        GraphIcon.OnClickedObservable.remove(this._clickedObserver);
    }

    /**
     * Called on the user clicks on the icon.
     */
    private _handleSetEnabled(): void {
        const isEnabled = !this.state.isEnabled;
        this.setState({ isEnabled });

        this.props.object.setEnabled?.(isEnabled);
        GraphIcon.OnClickedObservable.notifyObservers();
    }

    /**
     * Returns the icon according to the type of the current object.
     */
    private _getIcon(): string {
        if (isAbstractMesh(this.props.object)) {
            return "vector-square.svg";
        }

        if (isTransformNode(this.props.object)) {
            return "clone.svg";
        }

        if (isLight(this.props.object)) {
            return "lightbulb.svg";
        }

        if (isCamera(this.props.object)) {
            return "camera.svg";
        }

        if (isIParticleSystem(this.props.object)) {
            return "wind.svg";
        }

        if (isScene(this.props.object)) {
            return "camera-retro.svg";
        }

        if (isSound(this.props.object)) {
            return this.props.object.isPlaying ? "volume-up.svg" : "volume-mute.svg";
        }

        if (isReflectionProbe(this.props.object)) {
            return "reflection-probe.svg";
        }

        return "clone.svg";
    }
}
