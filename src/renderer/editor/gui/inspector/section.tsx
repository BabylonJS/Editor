import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Callout, Divider, MaybeElement, Icon, H4 } from "@blueprintjs/core";

import { InspectorPreferences } from "./preferences";

export interface IInspectorSectionProps {
    /**
     * Defines the title of the section shown as a header.
     */
    title: string;

    /**
     * Defines the optional icon of the section.
     */
    icon?:  MaybeElement;
    /**
     * Defines wether or not the section is collapsed.
     */
    collapsed?: boolean;
}

export interface IInspectorSectionState {
    /**
     * Defines the current height of the callout.
     */
    collapsed: boolean;
}

export class InspectorSection extends React.Component<IInspectorSectionProps, IInspectorSectionState> {
    private _inspectorName: Nullable<string> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorSectionProps) {
        super(props);

        this.state = {
            collapsed: props.collapsed ?? false,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        // Create icon
        const icon = (
            <div
                key="section-icon"
                style={{ width: "16px", height: "16px", zIndex: 1, position: "absolute", left: "10px", top: "10px", cursor: "pointer" }}
                onClick={() => this._handleCollapse()}
            >
                {this.props.icon ?? <Icon icon={this.state.collapsed ? "add" : "minus"} />}
            </div>
        );

        // Add dividers
        let children = this.props.children as React.ReactNode[] ?? [];
        if (children && !Array.isArray(children)) {
            children = [children];
        }

        const dividedChildren: React.ReactNode[] = [];
    
        children.forEach((c, index) => {
            if (!c) { return; }

            dividedChildren.push(c);
            dividedChildren.push(<Divider key={`section-field-divider-${index}`} />);
        });

        // Get content
        const content = (
            <>
                <Divider key="section-title-divider" />
                {dividedChildren}
            </>
        )

        return (
            <>
                <Divider />
                <Callout
                    icon={icon}
                    style={{
                        // zoom: "0.9",
                        // transform: "scale(0.9)",
                        height: this.state.collapsed ? "35px" : undefined,
                        paddingLeft: "35px",
                        backgroundColor: "rgba(138, 155, 168, 0.1)",
                    }}
                >
                    <div
                        style={{
                            position: "absolute", 
                            width: "100%",
                            height: "25px",
                            backgroundColor: "#333333",
                            marginTop: "-3px",
                            borderRadius: "6px",
                            left: "0px",
                        }}
                    ></div>

                    <H4
                        style={{
                            position: "relative",
                            margin: "1px 0px 0px 10px",
                            cursor: "pointer",
                            fontSize: "14px",
                        }}
                        onClick={() => this._handleCollapse()}
                    >
                        {this.props.title}
                    </H4>
                    <div style={{ width: "100%", height: "5px" }}></div>

                    {this.state.collapsed ? undefined : content}
                </Callout>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        this._inspectorName = InspectorPreferences.CurrentInspectorName;

        this.setState({
            collapsed: InspectorPreferences.IsSectionCollapsed(this.props.title),
        });
    }

    /**
     * Called on the user wants to collapse.
     */
    private _handleCollapse(): void {
        this.setState({ collapsed: !this.state.collapsed });

        InspectorPreferences.SetSectionCollapsed(this.props.title, !this.state.collapsed, this._inspectorName);
    }
}
