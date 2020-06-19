import * as React from "react";

export interface IPluginToolbar {
    /**
     * Defines the button to draw in the toolbar.
     */
    button: React.ReactNode;
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
    content: React.ReactNode;
}
