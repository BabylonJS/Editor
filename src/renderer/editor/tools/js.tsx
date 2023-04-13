import { join } from "path";

import * as React from "react";
import { Pre } from "@blueprintjs/core";

import { Editor } from "../editor";

import { WorkSpace } from "../project/workspace";

export class JSTools {
    /**
     * Executes the script located at the given path in the context of the editor.
     * @param editor defines the reference to the editor.
     * @param path defines the absolute path to the JavaScript file to execute in the context of the editor.
     */
    public static async ExecuteInEditorContext(editor: Editor, path: string): Promise<void> {
        editor.revealPanel("console");

        const relativePath = path.replace(join(WorkSpace.DirPath!, "/"), "");

        // Try executing the script
        try {
            const a = require(path);
            await a.main(editor);
            editor.console.logInfo(`Successfuly executed script "${relativePath}"`);
        } catch (e) {
            editor.console.logError(`An error happened executing the script at "${relativePath}"`);
            editor.console.logCustom(
                <Pre style={{ outlineColor: "red", outlineWidth: "1px", outlineStyle: "double" }}>
                    {e?.toString()}
                    {e?.stack}
                </Pre>
            );
        }

        // Clear cache
        for (const c in require.cache) {
            const cachePath = c.replace(/\\/g, "/");
            if (cachePath.indexOf(join(WorkSpace.DirPath!, "assets")) !== -1) {
                delete require.cache[c];
            }
        }
    }
}
