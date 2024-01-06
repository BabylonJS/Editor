import "babylonjs-materials";

window["CANNON"] = require("cannon");

window.addEventListener("DOMContentLoaded", () => {
    const { createEditor } = require("./editor/main");
    createEditor();
});
