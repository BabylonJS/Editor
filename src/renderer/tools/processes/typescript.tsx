import { Terminal } from "xterm";

import { WorkSpace } from "../../editor/project/workspace";

import { AbstractProcessPlugin } from "./base";

export const title = "TypeScript Logs";

export default class TypeScriptProcessPlugin extends AbstractProcessPlugin {
    /**
     * Defines the reference to the terminal.
     */
    protected terminal: Terminal = WorkSpace.TypeScriptTerminal;
}
