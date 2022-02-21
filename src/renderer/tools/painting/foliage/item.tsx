import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Mesh } from "babylonjs";

export interface IFoliageAssetItemProps {
    /**
     * Defines the title of the item.
     */
    mesh: Mesh;
    /**
     * Defines the preview of the item (base64).
     */
    preview: Nullable<string>;
}

export interface IFoliageAssetItemState {
    /**
     * Defines the number of active thin instances for the mesh.
     */
    thinInstanceCount: number;
}

export class FoliageAssetItem extends React.Component<IFoliageAssetItemProps, IFoliageAssetItemState> {
    private _intervalId: Nullable<number> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IFoliageAssetItemProps) {
        super(props);

        this.state = {
            thinInstanceCount: 0,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div
                style={{
                    width: "100px",
                    height: "100px",
                    margin: "10px 10px",
                    textAlign: "center",
                    outlineWidth: "3px",
                    position: "relative",
                    borderRadius: "10px",
                    outlineColor: "#48aff0",
                    backgroundColor: "#222222",
                }}
            >
                <small
                    key="item-title"
                    style={{
                        left: "0px",
                        bottom: "0px",
                        color: "white",
                        width: "100px",
                        overflow: "hidden",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                        position: "absolute",
                        textOverflow: "ellipsis",
                    }}
                >
                    <div
                        key="render-image"
                        style={{
                            margin: "auto",
                            width: "80px",
                            height: "80px",
                        }}
                    >
                        <img
                            style={{ width: "100%", height: "100%" }}
                            src={this.props.preview ?? "../css/svg/question-mark.svg"}
                        />
                    </div>
                    {this.props.mesh.name}
                    <div style={{
                        width: "24px",
                        height: "24px",
                        left: "0px",
                        top: "0px",
                        lineHeight: "24px",
                        borderRadius: "15px",
                        position: "absolute",
                        background: "cornflowerblue",
                    }}>
                        {this.state.thinInstanceCount}
                    </div>
                </small>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        this._intervalId = setInterval(() => {
            this.setState({ thinInstanceCount: this.props.mesh.thinInstanceCount });
        }, 500) as any;
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }
    }
}
