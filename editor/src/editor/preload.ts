import "babylonjs-materials";

window["CANNON"] = require("cannon");

window.addEventListener("DOMContentLoaded", () => {
    const { createEditor } = process.env.DEBUG
        ? require("./main")
        : require("../../editor");

    require("./module");

    createEditor();
});
