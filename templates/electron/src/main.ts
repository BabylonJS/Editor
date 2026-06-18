import { App } from "./App";

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	const app = new App();
	app.init();
});
