import "babylonjs-materials";

window.addEventListener("DOMContentLoaded", () => {
	require("./overrides");

	const { createEditor } = require("./main");
	createEditor();
});
