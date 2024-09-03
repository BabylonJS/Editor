import { Component, ReactNode } from "react";

import { ToolbarComponent } from "../../../ui/toolbar";

export interface INodeMaterialEditorWindowProps {

}

export default class NodeMaterialEditorWindow extends Component {
    public constructor(props: INodeMaterialEditorWindowProps) {
        super(props);
    }

    public render(): ReactNode {
        return (
            <div className="flex flex-col">
                <ToolbarComponent />
            </div>
        );
    }
}
