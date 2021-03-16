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

export class InspectorPreferences {
    private static _CurrentInspector: Nullable<AbstractInspector<any, any>> = null;
    private static _CurrentInspectorName: Nullable<string> = null;

    /**
     * Defines the configuration of the inspectors.
     * @hidden
     */
    public static _InspectorConfigurations: IStringDictionary<IInspectorPreferences> = InspectorPreferences.GetPreferencesFromLocalStorage();

    /**
     * Sets the current inspector being mounted.
     * @param inspector defines the reference to the current inspector being mounted.
     */
    public static SetCurrentInspector(inspector: AbstractInspector<any, any>): void {
        this._CurrentInspector = inspector;
        this._CurrentInspectorName = Tools.GetConstructorName(inspector);
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
