import { platform } from "os";
import { ipcRenderer } from "electron";

import { IoCloseOutline } from "react-icons/io5";
import { VscChromeMinimize } from "react-icons/vsc";
import { FaRegWindowMaximize } from "react-icons/fa";

import { Button } from "../ui/shadcn/ui/button";

const isWin32 = platform() === "win32";

export function WindowControls() {
    return (
        <div className={`absolute top-0 left-0 w-full ${isWin32 ? "h-28" : "h-24"}`}>
            <div className="flex w-full h-full">
                <div className="w-full electron-draggable h-full" />

                {isWin32 &&
                    <div className="flex z-50">
                        <Button variant="ghost" className="w-10 aspect-square p-0 hover:bg-muted" onClick={() => ipcRenderer.send("window:minimize")}>
                            <VscChromeMinimize className="w-4 h-4" />
                        </Button>

                        <Button variant="ghost" className="w-10 aspect-square hover:bg-muted" onClick={() => ipcRenderer.send("window:maximize")}>
                            <FaRegWindowMaximize className="w-4 h-4" />
                        </Button>

                        <Button variant="ghost" className="w-10 aspect-square p-0 hover:bg-muted" onClick={() => ipcRenderer.send("window:close")}>
                            <IoCloseOutline className="w-4 h-4" />
                        </Button>
                    </div>
                }
            </div>
        </div>
    );
}
