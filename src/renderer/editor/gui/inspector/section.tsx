import * as React from "react";
import { Callout, Divider, MaybeElement, Icon } from "@blueprintjs/core";

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
                style={{ width: "16px", height: "16px", position: "absolute", left: "10px", top: "8px", cursor: "pointer" }}
                onClick={() => this._handleCollapse()}
            >
                {this.props.icon ?? <Icon icon="info-sign" />}
            </div>
        );

        // Add dividers
        const children = this.props.children as React.ReactNode[];
        const dividedChildren: React.ReactNode[] = [];
        
        children.forEach((c, index) => {
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
            <Callout
                title={this.props.title}
                icon={icon}
                style={{
                    height: this.state.collapsed ? "35px" : undefined,
                    paddingLeft: "35px",
                }}
            >
                {this.state.collapsed ? undefined : content}
            </Callout>
        );
    }

    /**
     * Called on the user wants to collapse.
     */
    private _handleCollapse(): void {
        this.setState({ collapsed: !this.state.collapsed });
    }
}
