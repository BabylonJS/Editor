import { pathExists } from "fs-extra";
import { ipcRenderer, shell, webFrame } from "electron";

import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";

import { Fade } from "react-awesome-reveal";

import "../i18n";

import { Button } from "../ui/shadcn/ui/button";
import { Toaster } from "../ui/shadcn/ui/sonner";
import { Separator } from "../ui/shadcn/ui/separator";
import { showConfirm, showAlert } from "../ui/dialog";

import { wait } from "../tools/tools";
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

class DashboardClass extends Component<IDashboardProps & { t: (key: string, options?: any) => string }, IDashboardState> {
	public t: (key: string, options?: any) => string;

	public constructor(props: IDashboardProps & { t: (key: string, options?: any) => string }) {
		super(props);

		this.t = props.t;

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
							<div className="text-5xl font-semibold">{this.t("dashboard.title")}</div>

							<div className="flex flex-col items-end gap-2">
								<img alt="" src="assets/babylonjs_icon.png" className="w-[48px] object-contain" />
								<div className="text-xs">{this.t("dashboard.version", { version: packageJson.version })}</div>
							</div>
						</div>
					</Fade>

					<Fade delay={250}>
						<Separator />
					</Fade>

					<Fade delay={500}>
						<div className="flex justify-between items-center">
							<div className="text-3xl font-semibold">{this.t("dashboard.projects")}</div>

							<div className="flex gap-2">
								<Button variant="secondary" className="font-semibold" onClick={() => this._handleImportProject()}>
									{this.t("dashboard.importProject")}
								</Button>
								<Button className="font-semibold" onClick={() => this.setState({ createProject: true })}>
									{this.t("dashboard.createProject")}
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
		ipcRenderer.on("dashboard:import-project", () => this._handleImportProject());
		ipcRenderer.on("dashboard:new-project", () => this.setState({ createProject: true }));

		ipcRenderer.on("dashboard:opened-projects", (_, openedProjects) => this.setState({ openedProjects }));
		ipcRenderer.on("dashboard:update-projects", () => this.setState({ projects: tryGetProjectsFromLocalStorage() }));

		try {
			this._checkSystemAvailabilities();

			// Update list of projects to remove those that were deleted from the hard drive
			const projects = this.state.projects.slice();

			projects.forEach(async (project) => {
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
			});
		} catch (e) {
			console.error(e);
		}

		await wait(150);

		ipcRenderer.send("dashboard:ready");
	}

	private async _checkSystemAvailabilities(): Promise<void> {
		await checkNodeJSAvailable();

		if (!nodeJSAvailable) {
			await showAlert(
				this.t("dashboard.nodeJsNotFound"),
				<div className="flex flex-col">
					<div>{this.t("dashboard.nodeJsNotFoundMessage")}</div>
					<div>
						<a className="underline transition-all duration-300 ease-in-out" onClick={() => shell.openExternal("https://nodejs.org/en/download")}>
							this link
						</a>
					</div>
				</div>
			).wait();
		}
	}

	private _handleImportProject(): unknown {
		const file = openSingleFileDialog({
			title: this.t("dashboard.openProject"),
			filters: [{ name: this.t("fileFilters.babylonJsEditorProject"), extensions: ["bjseditor"] }],
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
		const confirm = await showConfirm(this.t("project.confirmRemove"), this.t("project.confirmRemoveMessage"));
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

export function Dashboard() {
	const { t } = useTranslation();
	return <DashboardClass t={t} />;
}
