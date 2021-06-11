import * as React from "react";
import { IconName, MaybeElement } from "@blueprintjs/core";

export interface IPluginToolbar {
    /**
     * Defines the label of the button to draw in the toolbar.
     */
    buttonLabel: React.ReactNode;
    /**
     * Defines the name of the icon for the plugin.
     */
    buttonIcon: IconName | MaybeElement;
    /**
     * Defines the content of the menu in the toolbar.
     * @example
     *  import { Menu, MenuItem, MenuDivider } from "@blueprintjs/core";
     *  <Menu>
            <MenuItem text="Add..." icon="add" onClick={() => ...} />
            <MenuDivider />
            <MenuItem text="Remove..." icon="remove" onClick={() => ...} />
        </Menu>
     */
    content: JSX.Element;
}
