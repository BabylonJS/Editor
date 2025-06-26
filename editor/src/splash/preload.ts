window.addEventListener("DOMContentLoaded", () => {
	const { createSplash } = process.env.DEBUG
		? require("./main")
		: require("../../splash");
	createSplash();
});
