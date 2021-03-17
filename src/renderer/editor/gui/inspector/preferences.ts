import { IStringDictionary, Nullable } from "../../../../shared/types";

import { Tools } from "../../tools/tools";

import { AbstractInspector } from "../../inspectors/abstract-inspector";

export interface IInspectorSectionPreferences {
    /**
     * Defines the title of the section.
     */
    title: string;
    /**
     * Defines wether or not the section is collapsed.
     */
    collapsed: boolean;
}

export interface IInspectorPreferences {
    /**
     * Defines the list of sections preferences for the inspector.
     */
    sections: IInspectorSectionPreferences[];
}

export interface IInspectorComponentSearch {
    /**
     * Defines the title of the component.
     */
    title: string;
    /**
     * Defines the callback called on the user wants to filter components.
     * @param visible defines wether or not the component should be visible.
     */
    callback: (visible: boolean) => void;
}

export class InspectorUtils {
    private static _CurrentInspector: Nullable<AbstractInspector<any, any>> = null;
    private static _CurrentInspectorName: Nullable<string> = null;

    private static _InspectorConfigurations: IStringDictionary<IInspectorPreferences> = InspectorUtils.GetPreferencesFromLocalStorage();
    private static _InspectorFilters: IStringDictionary<IInspectorComponentSearch[]> = { };

    /**
     * Sets the current inspector being mounted.
     * @param inspector defines the reference to the current inspector being mounted.
     */
    public static SetCurrentInspector(inspector: AbstractInspector<any, any>): string {
        this._CurrentInspector = inspector;
        this._CurrentInspectorName = Tools.GetConstructorName(inspector);

        return this._CurrentInspectorName;
    }

    /**
     * Gets the name of the current inspector being mounted.
     */
    public static get CurrentInspectorName(): Nullable<string> {
        return this._CurrentInspectorName;
    }

    /**
     * Gets the reference to the current inspector being mounted.
     */
    public static get CurrentInspector(): Nullable<AbstractInspector<any, any>> {
        return this._CurrentInspector;
    }

    /**
     * Sets registerd components visible or unvisible if their title match the given filter.
     * @param filter defines the current filter provided in the search input.
     * @param inspectorName defines the name of the inspector that performs a search. 
     */
    public static FilterComponents(filter: string, inspectorName: string): void {
        const sections = this._InspectorFilters[inspectorName];
        if (!sections) { return; }

        sections.forEach((s) => {
            const matches = s.title.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
            s.callback(matches);
        });
    }

    /**
     * Registers the given component to be part of the filterable components.
     * @param title defines the title of the section.
     * @param inspectorName defines the name of the inspector that contains the section to register.
     * @param callback defines the callback called on the filter changed (calling .FilterSections)
     */
    public static RegisterFilterableComponent(title: string, inspectorName: string, callback: (visible: boolean) => void): void {
        this._InspectorFilters[inspectorName] ??= [];

        const sections = this._InspectorFilters[inspectorName];
        const existingIndex = sections.findIndex((s) => s.title === title);

        if (existingIndex !== -1) {
            sections.splice(existingIndex, 1);
        }

        sections.push({ title, callback });
    }

    /**
     * Returns the current preferences of the inspector identified by the given name.
     * @param inspectorName defines the name of the inspector to retrieve its preferences.
     */
    public static GetInspectorPreferences(inspectorName?: Nullable<string>): Nullable<IInspectorPreferences> {
        inspectorName ??= this._CurrentInspectorName;
        if (!inspectorName) {
            return null;
        }

        this._InspectorConfigurations[inspectorName] ??= {
            sections: [],
        };

        return this._InspectorConfigurations[inspectorName];
    }

    /**
     * Returns wether or not the given section is collapsed. 
     * @param title defines the title of the section to check in the inspector.
     * @param inspectorName defines the name of the inspector to retrieve.
     */
    public static IsSectionCollapsed(title: string, inspectorName?: Nullable<string>): boolean {
        const configuration = this.GetInspectorPreferences(inspectorName);
        const section = configuration?.sections.find((s) => s.title === title);

        return section?.collapsed ?? false;
    }

    /**
     * Sets wether or not the given inspector section is collapsed.
     * @param title defines the title of the section to set collapsed or not.
     * @param collapsed defines wether or not the given section is collapsed.
     * @param inspectorName defines the name of the inspector to retrieve.
     */
    public static SetSectionCollapsed(title: string, collapsed: boolean, inspectorName?: Nullable<string>): void {
        const configuration = this.GetInspectorPreferences(inspectorName);
        const section = configuration?.sections.find((s) => s.title === title);

        if (section) {
            section.collapsed = collapsed;
        } else {
            configuration?.sections.push({ title, collapsed });
        }

        this.SavePreferencesToLocalStorage();
    }

    /**
     * Saves the current preferences.
     */
    public static SavePreferencesToLocalStorage(): void {
        try {
            localStorage.setItem("babylonjs-editor-inspector-preferences", JSON.stringify(this._InspectorConfigurations));
        } catch (e) {
            // Catch silently.
        }
    }

    /**
     * Returns the current inspector preferences previously saved in the local storage.
     * In case of no preferences, an empty object is returned.
     */
    public static GetPreferencesFromLocalStorage(): IStringDictionary<IInspectorPreferences> {
        try {
            const item = localStorage.getItem("babylonjs-editor-inspector-preferences");
            if (!item) {
                return { };
            }

            return JSON.parse(item);
        } catch (e) {
            // Catch silently.
            return { };
        }
    }
}
