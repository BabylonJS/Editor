import { ipcRenderer } from "electron";

import { IoCloseOutline } from "react-icons/io5";
import { VscChromeMinimize, VscMultipleWindows } from "react-icons/vsc";

import { Button } from "../ui/shadcn/ui/button";

import { isDarwin } from "../tools/os";

export function DashboardWindowControls() {
    return (
        <div className={`absolute top-0 left-0 w-full ${!isDarwin() ? "h-28" : "h-24"}`}>
            <div className="flex w-full h-full">
                <div className="w-full electron-draggable h-full" />

                {(!isDarwin() || process.env.DEBUG) &&
                    <div className="flex z-50">
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
                }
            </div>
        </div>
    );
}
