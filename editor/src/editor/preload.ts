import "babylonjs-materials";

window["CANNON"] = require("cannon");

window.addEventListener("DOMContentLoaded", () => {
	require("./overrides");

	const { createEditor } = require("./main");
	createEditor();
});
