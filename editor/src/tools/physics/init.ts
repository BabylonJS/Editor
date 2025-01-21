import { join } from "path/posix";

import HavokPhysics from "@babylonjs/havok";

let isInitialized = false;

export async function initializeHavok(appPath: string) {
    if (isInitialized) {
        return;
    }

    isInitialized = true;

    return HavokPhysics({
        environment: "NODE",
        locateFile: (url) => {
            const nodeModules = process.env.DEBUG
                ? "../node_modules"
                : "node_modules";

            return join(appPath, nodeModules, "@babylonjs/havok/lib/umd", url);
        },
    });
}
