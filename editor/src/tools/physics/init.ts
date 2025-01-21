import { join } from "path/posix";

import HavokPhysics from "@babylonjs/havok";

let isInitialized = false;

/**
 * Initializes the Havok physics engine for being used in the Editor with Babylon.JS.
 * @param appPath defines the absolute path to the Editor application.
 */
export async function initializeHavok(appPath: string) {
    if (isInitialized) {
        return;
    }

    isInitialized = true;

    const havok = await HavokPhysics({
        environment: "NODE",
        locateFile: (url) => {
            const nodeModules = process.env.DEBUG
                ? "../node_modules"
                : "node_modules";

            return join(appPath, nodeModules, "@babylonjs/havok/lib/umd", url);
        },
    });

    globalThis.HK = havok;
}
