import { createRoot } from "react-dom/client";

import "babylonjs-materials";

window["CANNON"] = require("cannon");

window.addEventListener("DOMContentLoaded", () => {
    const { ipcRenderer, webFrame } = require("electron");

    webFrame.setZoomFactor(0.8);

    const theme = localStorage.getItem("editor-theme") ?? "dark";
    if (theme === "dark") {
        document.body.classList.add("dark");
    }

    const div = document.getElementById("babylonjs-editor-main-div")!;

    ipcRenderer.once("editor:window-launch-data", (_, indexPath, options) => {
        const result = require(indexPath) as any;
        new result.default(options);

        const root = createRoot(div);
        root.render(
            <div className="w-screen h-screen">
                <result.default {...options} />
            </div>
        );
    });

    ipcRenderer.send("editor:window-ready");
});
