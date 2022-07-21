import { dirname, isAbsolute, join } from "path";

import { Nullable } from "../../../shared/types";

import { Image } from "babylonjs-gui";

export const overridesConfiguration = {
    absolutePath: "",
};

/**
 * Overrides the source property of Image in order to re-route images.
 */
const source = Object.getOwnPropertyDescriptor(Image.prototype, "source");
console.log(source);

Object.defineProperty(Image.prototype, "source", {
    get: function () {
        return source?.get?.call(this);
    },
    set: function (value: Nullable<string>) {
        if (value && !isAbsolute(value)) {
            value = join(dirname(overridesConfiguration.absolutePath), value);
        }

        source?.set?.call(this, value);
    },
});