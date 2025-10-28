import { webFrame } from "electron";

import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { Grid } from "react-loader-spinner";
import { Fade } from "react-awesome-reveal";

import i18n from "../i18n";
import { isDarwin } from "../tools/os";

export function createSplash(): void {
	const theme = localStorage.getItem("editor-theme") ?? "dark";
	if (theme === "dark") {
		document.body.classList.add("dark");
	}

	const div = document.getElementById("babylonjs-editor-main-div")!;
	if (!isDarwin()) {
		div.classList.add("electron-rounded-corners");
	}

	const root = createRoot(div);
	root.render(
		<div className="w-screen h-screen">
			<Splash />
		</div>
	);
}

export class Splash extends Component {
	public constructor(props: {}) {
		super(props);

		webFrame.setZoomFactor(0.8);
	}

	public render(): ReactNode {
		return (
			<div className="flex flex-col justify-between gap-[10px] w-full h-full p-5 electron-draggable">
				<div />

				<Fade>
					<img alt="" src="assets/babylonjs_icon.png" className="w-[200px] object-contain mx-auto" />
				</Fade>

				<Fade delay={500}>
					<div className="text-center w-full text-3xl">{i18n.t("menu.babylonJsEditor")}</div>
				</Fade>

				<div className="flex items-center gap-[10px]">
					<Grid width={24} height={24} color="gray" />
					<div className="animate-pulse">{i18n.t("editor.loading")}</div>
				</div>
			</div>
		);
	}
}
