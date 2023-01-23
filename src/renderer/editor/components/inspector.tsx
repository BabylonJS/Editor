import { Nullable, Undefinable } from "../../../shared/types";

import * as React from "react";
import { Tabs, Tab, TabId, NonIdealState, Icon as BPIcon, Button } from "@blueprintjs/core";

import { Scene, SubMesh, Sound } from "babylonjs";

import { Editor } from "../editor";

import { AbstractInspector } from "./inspectors/abstract-inspector";

import { Tools } from "../tools/tools";

export interface IObjectInspector {
    ctor: (new (props: IObjectInspectorProps) => AbstractInspector<any, any>);
    ctorNames: string[];
    title: string;
    isSupported?: Undefinable<(obj: any) => boolean>;
    /**
     * The reference to the inspector.
     * @hidden
     */
    _ref?: Undefinable<AbstractInspector<any, any>>;
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

    /**
     * Defines wether or not the inspector is locked. When locked, inspector will not be updated
     * according to newly selected objects but stays on the last selected one. Once unlocked, updates
     * the inspector the currently selected object in the graph.
     */
    isLocked: boolean;
}

export class Inspector extends React.Component<IInspectorProps, IInspectorState> {
    /**
     * The selected object reference.
     */
    public selectedObject: any = null;

    private _editor: Editor;
    private _firstTabId: TabId = "";
    private _activeTabId: Nullable<TabId> = null;

    private _forceUpdateId: number = 0;
    private _sceneInspectorKey: string = Tools.RandomId();

    private _refHandler = {
        getInspector: (ref: AbstractInspector<any, any>) => ref && (Inspector._ObjectInspectorsConfigurations.find((a) => a._id === ref.props.toolId)!._ref = ref),
    };

    private static _ObjectInspectorsConfigurations: IObjectInspector[] = [];

    /**
     * Registers the given object inspector.
     * @param objectInspectorConfiguration the object inspector configuration.
     */
    public static RegisterObjectInspector(objectInspectorConfiguration: IObjectInspector): void {
        const exists = this._ObjectInspectorsConfigurations.find((o) => o.ctor === objectInspectorConfiguration.ctor);
        if (exists) { return; }

        objectInspectorConfiguration._id = Tools.RandomId();
        this._ObjectInspectorsConfigurations.push(objectInspectorConfiguration);
    }

    /**
     * Removes the given object inspector configuration from the available object inspectors.
     * @param objectInspectorConfiguration defines the object inspector configuration to remove.
     */
    public static UnregisterObjectInspector(objectInspectorConfiguration: IObjectInspector): void {
        const index = this._ObjectInspectorsConfigurations.indexOf(objectInspectorConfiguration);
        if (index !== -1) {
            this._ObjectInspectorsConfigurations.splice(index, 1);
        }
    }

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IInspectorProps) {
        super(props);

        this._editor = props.editor;
        this._editor.inspector = this;

        this.state = {
            isLocked: false,

            refreshCount: 0,
            selectedObject: null,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.selectedObject) {
            return (
                <NonIdealState
                    icon="info-sign"
                    title="No Object Selected"
                />
            );
        }

        const tabs: JSX.Element[] = [];
        const ctor = Tools.GetConstructorName(this.state.selectedObject);

        this._firstTabId = "";

        Inspector._ObjectInspectorsConfigurations.forEach((i) => {
            if (i.isSupported) {
                if (!i.isSupported(this.state.selectedObject)) { return; }
            } else {
                if (i.ctorNames.indexOf(ctor) === -1) { return; }
            }

            const tabId = i._id!;
            if (this._firstTabId === "") {
                this._firstTabId = tabId;
            }

            let key = this.state.selectedObject.id ?? this.state.selectedObject._id ?? this.state.selectedObject.uniqueId ?? this.state.selectedObject.name ?? "";
            if (this.state.selectedObject instanceof Scene) {
                key = this._sceneInspectorKey;
            } else if (this.state.selectedObject instanceof SubMesh) {
                key = `${this.state.selectedObject.getMesh().id}_${this.state.selectedObject._id}`;
            } else if (this.state.selectedObject instanceof Sound) {
                key = this.state.selectedObject.metadata?.id;
            }

            const objectInspector = <i.ctor key={`${key.toString()}_${this._forceUpdateId}_${Tools.RandomId()}`} editor={this._editor} _objectRef={this.state.selectedObject} toolId={tabId} ref={this._refHandler.getInspector} />;
            const tab = <Tab id={tabId} title={i.title} key={tabId} panel={objectInspector} />;

            tabs.push(tab);
        });

        if (!tabs.find((t) => t.key === this._activeTabId)) {
            this._activeTabId = null;
        }

        if (!tabs.length) {
            return null;
        }

        return (
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
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

                <div style={{ position: "absolute", right: "8px", top: "8px" }}>
                    <Button icon={<BPIcon color="white" icon={this.state.isLocked ? "lock" : "unlock"} />} onClick={() => this._handleLockButtonClicked()} />
                </div>
            </div>
        );
    }

    /**
     * Forces the update of the component.
     * @param callback defines the callback called on the update is done.
     */
    public forceUpdate(callback?: (() => void) | undefined): void {
        this._forceUpdateId++;

        super.forceUpdate(callback);
    }


    /**
     * Catches exceptions generated in descendant components. 
     * Unhandled exceptions will cause the entire component tree to unmount.
     */
    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this._editor.console.logError(`inspector failed to load due to error ${error.message} ${errorInfo.componentStack}`);
        throw error;
    }

    /**
     * Sets the selected object in the scene or graph to be edited.
     * @param object the selected object reference used by the inspector to be modified.
     */
    public setSelectedObject<T>(object: T): void {
        this.selectedObject = object;

        if (!this.state.isLocked) {
            this.setState({ selectedObject: object, refreshCount: this.state.refreshCount + 1 });
        }
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
     * Resizes the inspector.
     */
    public resize(): void {
        Inspector._ObjectInspectorsConfigurations.forEach((i) => i._ref?.resize?.());
    }

    /**
     * Called on the user changes the active tab.
     */
    private _handleActiveTabChanged(tabId: TabId): void {
        this._activeTabId = tabId;
        super.forceUpdate();
    }

    /**
     * Called on the user clicks the lock button.
     */
    private _handleLockButtonClicked(): void {
        const isLocked = !this.state.isLocked;

        this.setState({ isLocked }, () => {
            this.setSelectedObject(this.selectedObject);
        });
    }
}
