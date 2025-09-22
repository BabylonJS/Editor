import { pathExists } from "fs-extra";
import { ipcRenderer, shell, webFrame } from "electron";

import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { Fade } from "react-awesome-reveal";

import { Button } from "../ui/shadcn/ui/button";
import { Toaster } from "../ui/shadcn/ui/sonner";
import { Separator } from "../ui/shadcn/ui/separator";
import { showConfirm, showAlert } from "../ui/dialog";

import { openSingleFileDialog } from "../tools/dialog";
import { ProjectType, projectsKey } from "../tools/project";
import { checkNodeJSAvailable, nodeJSAvailable } from "../tools/process";
import { tryAddProjectToLocalStorage, tryGetProjectsFromLocalStorage } from "../tools/local-storage";

import { DashboardProjectItem } from "./item";
import { DashboardCreateProjectDialog } from "./create";
import { DashboardWindowControls } from "./window-controls";

import packageJson from "../../package.json";

export function createDashboard(): void {
	const theme = localStorage.getItem("editor-theme") ?? "dark";
	if (theme === "dark") {
		document.body.classList.add("dark");
	}

	const div = document.getElementById("babylonjs-editor-main-div")!;

	const root = createRoot(div);
	root.render(
		<div className="w-screen h-screen">
			<Dashboard />
		</div>
	);
}

export interface IDashboardProps {
	// ...
}

export interface IDashboardState {
	projects: ProjectType[];
	openedProjects: string[];

	createProject: boolean;
}

export class Dashboard extends Component<IDashboardProps, IDashboardState> {
	public constructor(props: IDashboardProps) {
		super(props);

		this.state = {
			openedProjects: [],
			projects: tryGetProjectsFromLocalStorage(),

			createProject: false,
		};

		webFrame.setZoomFactor(0.8);
	}

	public render(): ReactNode {
		return (
			<>
				<div className="flex flex-col gap-4 w-screen h-screen p-5 select-none overflow-x-hidden pt-10">
					<DashboardWindowControls />

					<Fade delay={0}>
						<div className="flex justify-between items-end w-full mt-1">
							<div className="text-5xl font-semibold">Dashboard</div>

							<div className="flex flex-col items-end gap-2">
								<img alt="" src="assets/babylonjs_icon.png" className="w-[48px] object-contain" />
								<div className="text-xs">Babylon.js Editor v{packageJson.version}</div>
							</div>
						</div>
					</Fade>

					<Fade delay={250}>
						<Separator />
					</Fade>

					<Fade delay={500}>
						<div className="flex justify-between items-center">
							<div className="text-3xl font-semibold">Projects</div>

							<div className="flex gap-2">
								<Button variant="secondary" className="font-semibold" onClick={() => this._handleImportProject()}>
									Import project
								</Button>
								<Button className="font-semibold" onClick={() => this.setState({ createProject: true })}>
									Create project
								</Button>
							</div>
						</div>
					</Fade>

					<Fade delay={750}>
						{!this.state.projects.length && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">No project found.</div>}

						{this.state.projects.length && (
							<div className="grid sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
								{this.state.projects.map((project) => (
									<DashboardProjectItem
										project={project}
										key={project.absolutePath}
										isOpened={this.state.openedProjects.includes(project.absolutePath)}
										onRemove={() => this._tryRemoveProjectFromLocalStorage(project)}
									/>
								))}
							</div>
						)}
					</Fade>
				</div>

				<DashboardCreateProjectDialog
					isOpened={this.state.createProject}
					onClose={() => {
						this.setState({
							createProject: false,
							projects: tryGetProjectsFromLocalStorage(),
						});
					}}
				/>

				<Toaster />
			</>
		);
	}

	public async componentDidMount(): Promise<void> {
		ipcRenderer.send("dashboard:ready");

		ipcRenderer.on("dashboard:import-project", () => this._handleImportProject());
		ipcRenderer.on("dashboard:new-project", () => this.setState({ createProject: true }));

		ipcRenderer.on("dashboard:opened-projects", (_, openedProjects) => this.setState({ openedProjects }));
		ipcRenderer.on("dashboard:update-projects", () => this.setState({ projects: tryGetProjectsFromLocalStorage() }));

		this._checkSystemAvailabilities();

		// Update list of projects to remove those that were deleted from the hard drive
		const projects = this.state.projects.slice();

		await Promise.all(
			projects.map(async (project) => {
				const exists = await pathExists(project.absolutePath);
				if (exists) {
					return;
				}

				const index = projects.indexOf(project);
				if (index !== -1) {
					projects.splice(index, 1);
					localStorage.setItem(projectsKey, JSON.stringify(projects));

					this.setState({
						projects,
					});
				}
			})
		);
	}

	private async _checkSystemAvailabilities(): Promise<void> {
		await checkNodeJSAvailable();

		if (!nodeJSAvailable) {
			await showAlert(
				"Node.js not found",
				<div className="flex flex-col">
					<div>Node.js was not found on your system.</div>
					<div>
						Node.js is required to build and run projects. You can install Node.js following{" "}
						<a className="underline transition-all duration-300 ease-in-out" onClick={() => shell.openExternal("https://nodejs.org/en/download")}>
							this link
						</a>
						.
					</div>
				</div>
			).wait();
		}
	}

	private _handleImportProject(): unknown {
		const file = openSingleFileDialog({
			title: "Open Project",
			filters: [{ name: "Babylon.js Editor Project File", extensions: ["bjseditor"] }],
		});

		if (!file) {
			return;
		}

		const exists = this.state.projects.find((p) => p.absolutePath === file);
		if (exists) {
			return showAlert("Project already exists", "The project you are trying to import already exists in the dashboard.");
		}

		tryAddProjectToLocalStorage(file);
		this.setState({
			projects: tryGetProjectsFromLocalStorage(),
		});
	}

	private async _tryRemoveProjectFromLocalStorage(project: ProjectType): Promise<void> {
		const confirm = await showConfirm("Remove project", "Are you sure you want to remove this project?");
		if (!confirm) {
			return;
		}

		const index = this.state.projects.indexOf(project);
		if (index !== -1) {
			this.state.projects.splice(index, 1);

			localStorage.setItem(projectsKey, JSON.stringify(this.state.projects));

			this.setState({
				projects: tryGetProjectsFromLocalStorage(),
			});
		}
	}
}
