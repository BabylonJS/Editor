import { readJSON } from "fs-extra";
import { ipcRenderer, shell } from "electron";
import { basename, dirname } from "path/posix";

import { useEffect, useState } from "react";
import { Grid } from "react-loader-spinner";

import { FaQuestion } from "react-icons/fa";
import { AiOutlineClose } from "react-icons/ai";
import { IoPlay, IoStop } from "react-icons/io5";

import { toast } from "sonner";

import { Button } from "../ui/shadcn/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../ui/shadcn/ui/context-menu";

import { isDarwin } from "../tools/os";
import { ProjectType } from "../tools/project";
import { execNodePty, NodePtyInstance } from "../tools/node-pty";

import { IEditorProject } from "../project/typings";

import { DashboardProgressComponent } from "./progress";

export interface IDashboardProjectItemProps {
    isOpened: boolean;
    project: ProjectType;

    onRemove: () => void;
}

export function DashboardProjectItem(props: IDashboardProjectItemProps) {
	const [contextMenuOpen, setContextMenuOpen] = useState(false);

	const [launching, setLaunching] = useState(false);

	const [playingAddress, setPlayingAddress] = useState("");
	const [nodePtyInstance, setNodePtyInstance] = useState<NodePtyInstance | null>(null);

	useEffect(() => {
		return () => {
			nodePtyInstance?.kill();
		};
	}, [nodePtyInstance]);

	useEffect(() => {
		if (playingAddress) {
			shell.openExternal(playingAddress);
		}
	}, [playingAddress]);

	async function handleLaunchProject() {
		setLaunching(true);

		const projectName = basename(dirname(props.project.absolutePath));

		let progressRef: DashboardProgressComponent = null!;
		const toastId = toast(<DashboardProgressComponent ref={(r) => progressRef = r!} name={projectName} />, {
			duration: Infinity,
			dismissible: false,
		});

		let installCommand = "";
		let devCommand = "";

		const project = await readJSON(props.project.absolutePath) as IEditorProject;
		switch (project.packageManager) {
		case "npm":
			installCommand = "npm i";
			devCommand = "npm run dev";
			break;
		case "pnpm":
			installCommand = "pnpm i";
			devCommand = "pnpm dev";
			break;
		case "bun":
			installCommand = "bun i";
			devCommand = "bun run dev";
			break;
		default:
			installCommand = "yarn";
			devCommand = "yarn dev";
			break;
		}

		// Install dependencies
		const installProcess = await execNodePty(installCommand, {
			cwd: dirname(props.project.absolutePath),
		});

		progressRef?.setProcess(installProcess);
		progressRef?.setState({ message: `Installing dependencies...` });

		await installProcess.wait();

		// Run process
		const runProcess = await execNodePty(devCommand, {
			cwd: dirname(props.project.absolutePath),
		});

		progressRef?.setProcess(runProcess);
		progressRef?.setState({ message: `Running project...` });

		const observable = runProcess.onGetDataObservable.add((data) => {
			const localhostRegex = /http:\/\/localhost:(\d+)/;
			const match = data.match(localhostRegex);
			if (match) {
				runProcess.onGetDataObservable.remove(observable);

				toast.dismiss(toastId);

				setLaunching(false);
				setPlayingAddress(`http://localhost:${match[1]}`);
			}
		});

		setNodePtyInstance(runProcess);
	}

	async function handleStopProject() {
		nodePtyInstance?.kill();
		setNodePtyInstance(null);

		setLaunching(false);
		setPlayingAddress("");
	}

	function handleOpenInVisualStudioCode() {
		execNodePty(`code "${dirname(props.project.absolutePath)}"`);
	}

	return (
		<ContextMenu onOpenChange={(o) => setContextMenuOpen(o)}>
			<ContextMenuTrigger>
				<div
					onDoubleClick={() => ipcRenderer.send("dashboard:open-project", props.project.absolutePath)}
					className={`
                        group
                        flex flex-col w-full rounded-lg cursor-pointer select-none
                        ${contextMenuOpen ? "ring-primary ring-2" : "ring-muted-foreground"}
                        hover:ring-2
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
						<div className="flex justify-between items-center gap-2">
							<div className="text-lg flex-1 font-semibold text-ellipsis overflow-hidden whitespace-nowrap">
								{basename(dirname(props.project.absolutePath))}
							</div>

							<Button
								variant="ghost"
								onClick={() => playingAddress ? handleStopProject() : handleLaunchProject()}
								className={`
                                    w-10 h-10 aspect-square p-0
                                    ${launching || playingAddress ? "" : "opacity-0 group-hover:opacity-100"}
                                    ${launching ? "bg-muted/50" : playingAddress ? "!bg-red-500/35" : "hover:!bg-green-500/35"}
                                    transition-all duration-300 ease-in-out
                                `}
							>
								{launching
									? <Grid width={24} height={24} color="#ffffff" />
									: playingAddress
										? <IoStop className="w-6 h-6" strokeWidth={1} color="red" />
										: <IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
								}
							</Button>
						</div>
						<div className="text-muted-foreground text-xs">
                            Created {new Date(props.project.createdAt).toLocaleString("en-US", { day: "2-digit", month: "long", year: "numeric" })}
						</div>
						<div className="text-muted-foreground text-xs">
                            Updated {new Date(props.project.updatedAt).toLocaleString("en-US", { day: "2-digit", month: "long", year: "numeric" })}
						</div>
					</div>
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onClick={() => ipcRenderer.send("dashboard:open-project", props.project.absolutePath)}>
                    Open
				</ContextMenuItem>
				<ContextMenuItem className="flex items-center gap-2" onClick={() => ipcRenderer.send("editor:show-item", props.project.absolutePath)}>
					{`Show in ${isDarwin() ? "Finder" : "Explorer"}`}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem className="flex items-center gap-2" onClick={() => handleOpenInVisualStudioCode()}>
                    Open in Visual Studio Code
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => props.onRemove()}>
					<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>

	);
}
