import "babylonjs-materials";

window["CANNON"] = require("cannon");

window.addEventListener("DOMContentLoaded", () => {
	const { createEditor } = require("./main");

	require("./overrides");

	createEditor();
});
