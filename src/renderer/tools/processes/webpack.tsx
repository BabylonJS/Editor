import { Terminal } from "xterm";

import { WorkSpace } from "../../editor/project/workspace";

import { AbstractProcessPlugin } from "./base";

export const title = "Webpack Logs";

export default class WebpackProcessPlugin extends AbstractProcessPlugin {
    /**
     * Defines the reference to the terminal.
     */
    protected terminal: Terminal = WorkSpace.WebpackTerminal;
}
