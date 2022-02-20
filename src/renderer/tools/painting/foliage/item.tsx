import { Nullable } from "../../../../shared/types";

import * as React from "react";

export interface IFoliageAssetItemProps {
    /**
     * Defines the title of the item.
     */
    title: string;
    /**
     * Defines the preview of the item (base64).
     */
    preview: Nullable<string>;
}

export interface IFoliageAssetItemState {

}

export class FoliageAssetItem extends React.Component<IFoliageAssetItemProps, IFoliageAssetItemState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IFoliageAssetItemProps) {
        super(props);

        this.state = {

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
                    onDoubleClick={(ev) => {
                        ev.stopPropagation();
                        this.setState({ isRenaming: true });
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
                    {this.props.title}
                </small>
            </div>
        );
    }
}
