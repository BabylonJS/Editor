import * as React from "react";
import { Tabs, Tab, TabId } from "@blueprintjs/core";

import { Editor } from "../editor";
import { AbstractInspector } from "../inspectors/abstract-inspector";

import { Tools } from "../tools/tools";
import { Nullable, Undefinable } from "../../../shared/types";

export interface IObjectInspector {
    ctor: (new (props: IObjectInspectorProps) => AbstractInspector<any>);
    ctorNames: string[];
    title: string;
    isSupported?: Undefinable<(obj: any) => boolean>;
    /**
     * The reference to the inspector.
     * @hidden
     */
    _ref?: Undefinable<AbstractInspector<any>>;
    /**
     * @hidden
     */
    _id?: Undefinable<string>;
}

export interface IObjectInspectorProps {
    /**
     * Defines the editor reference.
     */
    editor: Editor;
    /**
     * Defines the id of the tool.
     */
    toolId: string;
    /**
     * The object reference to edit.
     * @hidden
     */
    _objectRef: any;
}

export interface IInspectorProps {
    /**
     * Defines the editor reference.
     */
    editor: Editor;
}

export interface IInspectorState {
    /**
     * Defines the reference to the selected object in the editor.
     */
    selectedObject: any;
    /**
     * Defines the number of times the component has been refreshed.
     */
    refreshCount: number;
}

export class Inspector extends React.Component<IInspectorProps, IInspectorState> {
    /**
     * The selected object reference.
     */
    public selectedObject: any = null;

    private _editor: Editor;
    private _firstTabId: TabId = "";
    private _activeTabId: Nullable<TabId> = null;

    private _refHandler = {
        getInspector: (ref: AbstractInspector<any>) => ref && (Inspector._objectInspectorsConfigurations.find((a) => a._id === ref.props.toolId)!._ref = ref),
    };

    private static _objectInspectorsConfigurations: IObjectInspector[] = [];

    /**
     * Registers the given object inspector.
     * @param objectInspectorConfiguration the object inspector configuration.
     */
    public static registerObjectInspector(objectInspectorConfiguration: IObjectInspector): void {
        objectInspectorConfiguration._id = Tools.RandomId();
        this._objectInspectorsConfigurations.push(objectInspectorConfiguration);
    }

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IInspectorProps) {
        super(props);

        this._editor = props.editor;
        this._editor.inspector = this;

        this.state = { selectedObject: null, refreshCount: 0 };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.selectedObject) { return null; }

        const tabs: JSX.Element[] = [];
        const ctor = Tools.GetConstructorName(this.state.selectedObject);

        this._firstTabId = "";

        Inspector._objectInspectorsConfigurations.forEach((i) => {
            if (i.isSupported) {
                if (!i.isSupported(this.state.selectedObject)) { return; }
            } else {
                if (i.ctorNames.indexOf(ctor) === -1) { return; }
            }

            const tabId = i._id!
            if (this._firstTabId === "") {
                this._firstTabId = tabId;
            }

            const objectInspector = <i.ctor key={this.state.selectedObject.id ?? this.state.selectedObject._id ?? this.state.selectedObject.uniqueId} editor={this._editor} _objectRef={this.state.selectedObject} toolId={i._id!} ref={this._refHandler.getInspector} />;
            const tab = <Tab id={tabId} title={i.title} key={i._id!} panel={objectInspector} />;

            tabs.push(tab);
        });

        if (!tabs.find((t) => t.key === this._activeTabId)) {
            this._activeTabId = null;
        }

        if (!tabs.length) {
            return null;
        }

        return (
            <Tabs
                animate={true}
                id="inspector"
                key="inspector"
                renderActiveTabPanelOnly={true}
                vertical={false}
                children={tabs}
                onChange={(id) => this._handleActiveTabChanged(id)}
                selectedTabId={this._activeTabId || this._firstTabId}
            ></Tabs>
        );
    }

    /**
     * Sets the selected object in the scene or graph to be edited.
     * @param object the selected object reference used by the inspector to be modified.
     */
    public setSelectedObject<T>(object: T): void {
        this.selectedObject = object;
        this.setState({ selectedObject: object, refreshCount: this.state.refreshCount + 1 });
    }

    /**
     * Refreshes the inspector.
     */
    public refresh(): void {
        this.setState({
            refreshCount: this.state.refreshCount + 1,
        });
    }

    /**
     * Refreshes the current display of the current inspector.
     */
    public refreshDisplay(): void {
        Inspector._objectInspectorsConfigurations.forEach((i) => i._ref?.refreshDisplay());
    }

    /**
     * Resizes the inspector.
     */
    public resize(): void {
        Inspector._objectInspectorsConfigurations.forEach((i) => i._ref?.resize());
    }

    /**
     * Called on the user changes the active tab.
     */
    private _handleActiveTabChanged(tabId: TabId): void {
        this._activeTabId = tabId;
        this.forceUpdate();
    }
}
