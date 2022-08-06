import { dirname, isAbsolute, join } from "path";

import { Nullable } from "../../../../shared/types";

import { Image } from "babylonjs-gui";
import { pathExistsSync } from "fs-extra";

export const overridesConfiguration = {
    absolutePath: "",
};

/**
 * Overrides the source property of Image in order to re-route images.
 */
const source = Object.getOwnPropertyDescriptor(Image.prototype, "source");

Object.defineProperty(Image.prototype, "source", {
    get: function () {
        return source?.get?.call(this);
    },
    set: function (value: Nullable<string>) {
        if (value) {
            const finalValue = join(dirname(overridesConfiguration.absolutePath), value);
    
            if (!isAbsolute(value) && pathExistsSync(finalValue)) {
                value = finalValue;
            }
        }

        source?.set?.call(this, value);
    },
});
