import { app } from "electron";

import { join } from "path";

export class PathTools {
    /**
     * Returns the current root path of the app.
     */
     public static GetAppPath(): string {
        if (process.env.DEBUG) { return app.getAppPath(); }
        if (process.env.DRIVEN_TESTS) { return process.env.DRIVEN_TESTS; }

        return join(app.getAppPath(), "..", "..");
    }
}
