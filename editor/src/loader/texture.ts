import { join } from "path/posix";
import { writeFile } from "fs-extra";

import { Tools } from "babylonjs";

import { AssimpJSRuntime, IAssimpJSTextureData } from "./types";

export function writeTexture(runtime: AssimpJSRuntime, data: IAssimpJSTextureData): void {
    if (!data.formathint) {
        return;
    }

    if (typeof (data.data) === "string") {
        const byteString = atob(data.data);
        const ab = new ArrayBuffer(byteString.length);

        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        writeFile(join(runtime.rootUrl, `${Tools.RandomId()}.${data.formathint}`), Buffer.from(ia));
    }
}
