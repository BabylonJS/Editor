import { ipcRenderer } from "electron";

import { PropsWithChildren } from "react";
import { IoCloseOutline } from "react-icons/io5";
import { VscChromeMinimize, VscMultipleWindows } from "react-icons/vsc";

import { isDarwin } from "../tools/os";

import { Button } from "./shadcn/ui/button";

export interface IToolbarComponentProps extends PropsWithChildren {}

export function ToolbarComponent(props: IToolbarComponentProps) {
	return (
		<div className="relative flex justify-between w-screen h-12 bg-background text-foreground z-[9999] pointer-events-auto">
			{props.children}

			<div className="w-full h-10 electron-draggable" />

			{(!isDarwin() || process.env.DEBUG) && (
				<div className="flex z-50 pr-3 my-auto">
					<Button variant="ghost" className="w-12 aspect-square !p-0 hover:bg-muted" onClick={() => ipcRenderer.send("window:minimize")}>
						<VscChromeMinimize className="w-5 h-5" />
					</Button>

					<Button variant="ghost" className="w-12 aspect-square !p-4 hover:bg-muted" onClick={() => ipcRenderer.send("window:maximize")}>
						<VscMultipleWindows className="w-5 h-5" />
					</Button>

					<Button variant="ghost" className="w-12 aspect-square !p-0 hover:bg-muted" onClick={() => ipcRenderer.send("window:close")}>
						<IoCloseOutline className="w-5 h-5" />
					</Button>
				</div>
			)}
		</div>
	);
}
