import { ipcRenderer } from "electron";
import { basename, dirname } from "path/posix";

import { FaQuestion } from "react-icons/fa";

import { ProjectType } from "../tools/project";

export interface IProjectTileProps {
    isOpened: boolean;
    project: ProjectType;
}

export function ProjectTile(props: IProjectTileProps) {
    return (
        <div
            onDoubleClick={() => ipcRenderer.send("dashboard:open-project", props.project.absolutePath)}
            className={`
                flex flex-col w-full rounded-lg cursor-pointer select-none
                ring-muted-foreground hover:ring-2 hover:p-1
                transition-all duration-300 ease-in-out
                ${props.isOpened ? "opacity-15 pointer-events-none" : ""}
            `}
        >
            <div className="flex justify-center items-center w-full aspect-square bg-muted rounded-t-lg">
                {!props.project.preview &&
                    <FaQuestion className="w-10 h-10" />
                }
                {props.project.preview &&
                    <img alt="" src={props.project.preview} className="w-full aspect-square object-cover rounded-t-lg" />
                }
            </div>

            <div className="flex flex-col gap-1 p-2 bg-secondary rounded-b-lg select-none">
                <div className="text-lg font-semibold text-ellipsis overflow-hidden whitespace-nowrap">
                    {basename(dirname(props.project.absolutePath))}
                </div>
                <div className="text-muted-foreground text-xs">
                    Created {new Date(props.project.createdAt).toLocaleString("en-US", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
                <div className="text-muted-foreground text-xs">
                    Updated {new Date(props.project.updatedAt).toLocaleString("en-US", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
            </div>
        </div>
    );
}
