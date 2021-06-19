import * as React from "react";
import { Tabs, Tab, InputGroup, Classes, TabId } from "@blueprintjs/core";

import { Nullable, Undefinable } from "../../../shared/types";

import { Editor } from "../editor";
import { AbstractAssets, IAbstractAssets, IAssetComponentItem } from "../assets/abstract-assets";

import { Tools } from "../tools/tools";
import { Confirm } from "../gui/confirm";

export interface IAssetComponent {
    /**
     * The title of the assets component.
     */
    title: string;
    /**
     * Defines the identifier of the component.
     */
    identifier: string;
    /**
     * Constructor reference of the component.
     */
    ctor: (new (props: IAssetsProps) => AbstractAssets);
    /**
     * @hidden
     */
    _id?: string;
    /**
     * @hidden
     */
    _ref?: AbstractAssets;
}

export interface IAssetsProps {
    /**
     * The editor reference to be used in the assets component.
     */
    editor: Editor;
}

export interface IAssetsState {
    /**
     * Defines the Id of the active tab.
     */
    activeTabId?: TabId;
}

export class Assets extends React.Component<IAssetsProps, IAssetsState> {
    private static _assetComponents: IAssetComponent[] = [];

    private _isRefreshing: boolean = false;
    private _needsRefresh: boolean = false;

    private _tabs: Nullable<Tabs> = null;
    private _refHandler = {
        getTabs: (ref: Tabs) => this._tabs = ref,
        getAssetComponent: (ref: AbstractAssets) => ref && (Assets._assetComponents.find((a) => a._id === ref.props.id)!._ref = ref),
    };

    /**
     * Adds the given component to the assets stack.
     * @param component the component to add in the assets stack.
     */
    public static addAssetComponent(component: IAssetComponent): void {
        component._id = Tools.RandomId();
        this._assetComponents.push(component);
    }

    private _editor: Editor;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IAssetsProps) {
        super(props);
        this._editor = props.editor;
        this._editor.assets = this;
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const tabs = Assets._assetComponents.map((ac) => {
            const component = <ac.ctor editor={this._editor} id={ac._id!} ref={this._refHandler.getAssetComponent} />;
            return <Tab id={ac._id} title={ac.title} key={ac._id} panel={component} />;
        });

        tabs.push(<Tabs.Expander />);

        return (
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <InputGroup className={Classes.FILL} leftIcon={"search"} type="search" placeholder="Search..." onChange={(e) => this._handleSearchChanged(e)} />
                <div id="EDITOR-ASSETS" style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                    <Tabs
                        ref={this._refHandler.getTabs}
                        animate={true}
                        id="assets"
                        key="assets"
                        renderActiveTabPanelOnly={false}
                        vertical={true}
                        large={false}
                        children={tabs}
                    ></Tabs>
                </div>
            </div>
        );
    }

    /**
     * Selects (activates) the tab of the given assets component.
     * @param component defines the component to show.
     */
    public selectTab(component?: (new (props: IAssetsProps) => AbstractAssets)): void {
        const id = Assets._assetComponents.find((ac) => ac.ctor === component)?._id ?? null;

        if (id !== null && this._tabs && this._tabs.state.selectedTabId !== id) {
            this._tabs.setState({ selectedTabId: id });
        }
    }

    /**
     * Refreshes all the assets.
     * @param component defines the component to refresh.
     * @param object defines the object to refresh.
     */
    public refresh<T>(component?: (new (props: IAssetsProps) => AbstractAssets), object?: Undefinable<T>): Promise<void> {
        return this._refreshAllAssets(component, object);
    }

    /**
     * Forces refreshing all assets.
     * @param component the component to force refresh.
     */
    public forceRefresh(component?: (new (props: IAssetsProps) => AbstractAssets)): Promise<void> {
        return this._refreshAllAssets(component, undefined, true);
    }

    /**
     * Clears all the unused assets by removing their files.
     */
    public async clearUnusedAssets(): Promise<void> {
        if (!await Confirm.Show("Are You Sure?", "This operation will remove all files that are not used (meshes, textures, sounds, etc.). This operation is irreversible until you manually re-add the files yourself. Continue?", "warning-sign")) {
            return;
        }

        const components = Assets._assetComponents.filter((ac) => ac._ref?.clean);

        let currentStep = 0;
        
        const task = this._editor.addTaskFeedback(0, "Cleaning Assets...");
        const step = 100 / components.length;

        for (const ac of components) {
            try {
                this._editor.updateTaskFeedback(task, currentStep, `Cleaning Assets "${ac.title}"`);
                await ac._ref!.clean();

                this._editor.updateTaskFeedback(task, currentStep += step);
            } catch (e) {
                //Catch siently.
            }
        }

        this._editor.closeTaskFeedback(task, 500);
    }

    /**
     * Resizes the assets components.
     */
    public resize(): void {
        Assets._assetComponents.forEach((ac) => ac._ref?.resize());
    }

    /**
     * Returns all the assets of the given assets component.
     * @param componentCtor the component to get its assets already computed.
     */
    public getAssetsOf(componentCtor: (new (props: IAssetsProps) => AbstractAssets)): Undefinable<IAssetComponentItem[]> {
        const assetComponent = Assets._assetComponents.find((a) => a.ctor === componentCtor);
        if (assetComponent) { return assetComponent._ref?.items; }

        return undefined;
    }

    /**
     * Returns all the assets of the component identified by the given Id.
     * @param id defines the id of the assets component to get its assets.
     */
    public getAssetsOfComponentId(id: string): IAssetComponentItem[] {
        const component = Assets._assetComponents.find((a) => a.identifier === id);
        if (!component) { return []; }

        return this.getAssetsOf(component.ctor)!.map((c) => ({ id: c.id, base64: c.base64, key: c.key }));
    }

    /**
     * Returns the reference of the given assets component.
     * @param componentCtor the component to get its reference.
     */
    public getComponent<T extends AbstractAssets>(componentCtor: (new (props: IAssetsProps) => T)): Nullable<T> {
        const assetComponent = Assets._assetComponents.find((a) => a.ctor === componentCtor);
        return assetComponent?._ref as T ?? null;
    }

    /**
     * Returns the list of all assets components.
     */
    public getAssetsComponents(): IAssetComponent[] {
        return Assets._assetComponents;
    }

    /**
     * Refreshes all assets components.
     */
    private async _refreshAllAssets<T>(componentCtor?: (new (props: IAssetsProps) => AbstractAssets), object?: Undefinable<T>, force?: Undefinable<boolean>): Promise<void> {
        if (this._isRefreshing) {
            this._needsRefresh = true;
            return;
        }

        const task = !object ? this._editor.addTaskFeedback(0, "Updating assets", 0) : null;
        this._isRefreshing = true;

        const step = 100 / Assets._assetComponents.length;
        let progress = 0;

        for (const component of Assets._assetComponents) {
            if (componentCtor && componentCtor !== component.ctor) { continue; }
            if (!component._ref) { continue; }

            const assetStep = step / component._ref.items.length;
            if (force) { component._ref.items = []; }

            const observer = component._ref.updateAssetObservable.add(() => {
                if (!object && assetStep !== Infinity) { this._editor.updateTaskFeedback(task!, progress += assetStep, `Updating assets "${component.title}"`); }
            });
            await (component._ref as IAbstractAssets).refresh(object);
            component._ref.updateAssetObservable.remove(observer);

            if (!object && assetStep === Infinity) { this._editor.updateTaskFeedback(task!, progress += step); }
        }

        if (!object) { this._editor.closeTaskFeedback(task!, 0); }
        this._isRefreshing = false;


        if (this._needsRefresh) {
            this._needsRefresh = false;
            return this._refreshAllAssets();
        }
    }

    /**
     * Called on the user filters the assets.
     */
    private _handleSearchChanged(e: React.SyntheticEvent): void {
        const target = e.target as HTMLInputElement;
        Assets._assetComponents.forEach((ac) => ac._ref?.setFilter(target.value));
    }
}
