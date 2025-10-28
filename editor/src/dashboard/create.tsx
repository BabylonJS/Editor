import { join } from "path/posix";
import { ipcRenderer } from "electron";
import { readJSON, remove, writeJSON } from "fs-extra";

import decompress from "decompress";
import decompressTargz from "decompress-targz";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { RxCross2 } from "react-icons/rx";
import { Grid } from "react-loader-spinner";

import { showAlert, showConfirm } from "../ui/dialog";

import { Input } from "../ui/shadcn/ui/input";
import { Button } from "../ui/shadcn/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/shadcn/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/shadcn/ui/dialog";

import { openSingleFolderDialog } from "../tools/dialog";
import { isPackageManagerAvailable } from "../tools/process";
import { tryAddProjectToLocalStorage } from "../tools/local-storage";

import { EditorProjectPackageManager, IEditorProject, EditorProjectTemplate } from "../project/typings";

export interface IDashboardCreateProjectDialogProps {
	isOpened: boolean;
	onClose: () => void;
}

type PackageManagerCheckState = "processing" | "available" | "not-available";

export function DashboardCreateProjectDialog(props: IDashboardCreateProjectDialogProps) {
	const { t } = useTranslation();
	const [destination, setDestination] = useState("");
	const [packageManager, setPackageManager] = useState<EditorProjectPackageManager>("npm");
	const [template, setTemplate] = useState<EditorProjectTemplate>("nextjs");
	const [creating, setCreating] = useState(false);

	const [npmAvailable, setNpmAvailable] = useState<PackageManagerCheckState>("processing");
	const [yarnAvailable, setYarnAvailable] = useState<PackageManagerCheckState>("processing");
	const [pnpmAvailable, setPnpmAvailable] = useState<PackageManagerCheckState>("processing");
	const [bunAvailable, setBunAvailable] = useState<PackageManagerCheckState>("processing");

	useEffect(() => {
		if (props.isOpened) {
			isPackageManagerAvailable("npm").then((available) => setNpmAvailable(available ? "available" : "not-available"));
			isPackageManagerAvailable("yarn").then((available) => setYarnAvailable(available ? "available" : "not-available"));
			isPackageManagerAvailable("pnpm").then((available) => setPnpmAvailable(available ? "available" : "not-available"));
			isPackageManagerAvailable("bun").then((available) => setBunAvailable(available ? "available" : "not-available"));
		}
	}, [props.isOpened]);

	async function handleBrowseFolderPath() {
		const folder = openSingleFolderDialog(t("dashboard.createProjectDialog.selectFolder"));

		if (folder) {
			setDestination(folder);
		}
	}

	async function setupTemplate(destination: string, template: EditorProjectTemplate) {
		const templatePath = process.env.DEBUG ? `templates/${template}.tgz` : `../../templates/${template}.tgz`;
		const templateBlob = await fetch(templatePath).then((r) => r.blob());
		const buffer = Buffer.from(await templateBlob.arrayBuffer());

		await decompress(buffer, destination, {
			plugins: [decompressTargz()],
			map: (file) => {
				file.path = file.path.replace("package/", "");
				return file;
			},
		});

		await remove(join(destination, "package"));

		const projectAbsolutePath = join(destination, "project.bjseditor");

		const projectContent = (await readJSON(projectAbsolutePath)) as IEditorProject;
		projectContent.packageManager = packageManager;
		await writeJSON(projectAbsolutePath, projectContent, {
			spaces: "\t",
			encoding: "utf-8",
		});
	}

	async function handleCreateProject() {
		setCreating(true);

		try {
			const projectAbsolutePath = join(destination, "project.bjseditor");

			await setupTemplate(destination, template);

			tryAddProjectToLocalStorage(projectAbsolutePath);

			props.onClose();

			const result = await showConfirm(t("dashboard.confirmOpenProject"), t("dashboard.confirmOpenProjectMessage"), {
				cancelText: t("editor.no"),
				confirmText: t("editor.yes"),
			});

			if (result) {
				ipcRenderer.send("dashboard:open-project", projectAbsolutePath);
			}
		} catch (e) {
			showAlert(t("dashboard.unexpectedError"), e.message);
		}

		setCreating(false);
		setDestination("");
	}

	function getPackageManagerSelectItem(packageManager: EditorProjectPackageManager, availability: PackageManagerCheckState) {
		return (
			<SelectItem value={packageManager} disabled={availability !== "available"}>
				<div className="flex items-center gap-2">
					{availability === "processing" && <Grid width={16} height={16} color="#ffffff" />}

					{availability === "not-available" && <RxCross2 className="w-4 h-4 text-red-500" />}

					<div>{packageManager}</div>
				</div>
			</SelectItem>
		);
	}

	function getTemplateSelectItem(template: EditorProjectTemplate) {
		return (
			<SelectItem value={template}>
				<div className="flex items-center gap-2">
					<div>{template}</div>
				</div>
			</SelectItem>
		);
	}

	return (
		<Dialog open={props.isOpened} onOpenChange={(o) => !o && props.onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("dashboard.createProjectDialog.title")}</DialogTitle>
					<DialogDescription className="flex flex-col gap-4 py-5">
						{!creating && (
							<>
								<div className="flex flex-col gap-2">
									<div>{t("dashboard.createProjectDialog.selectFolder")}</div>

									<div className="flex gap-[10px]">
										<Input value={destination} disabled placeholder={t("dashboard.createProjectDialog.folderPath")} />
										<Button variant="secondary" className="w-24" onClick={() => handleBrowseFolderPath()}>
											{t("dashboard.createProjectDialog.browse")}
										</Button>
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<div>{t("dashboard.createProjectDialog.packageManager")}</div>

									<Select value={packageManager} onValueChange={(v) => setPackageManager(v as EditorProjectPackageManager)}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder={t("dashboard.createProjectDialog.packageManager")} />
										</SelectTrigger>
										<SelectContent>
											{getPackageManagerSelectItem("npm", npmAvailable)}
											{getPackageManagerSelectItem("yarn", yarnAvailable)}
											{getPackageManagerSelectItem("pnpm", pnpmAvailable)}
											{getPackageManagerSelectItem("bun", bunAvailable)}
										</SelectContent>
									</Select>
								</div>

								<div className="flex flex-col gap-2">
									<div>{t("dashboard.createProjectDialog.template")}</div>

									<Select value={template} onValueChange={(v) => setTemplate(v as EditorProjectTemplate)}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder={t("dashboard.createProjectDialog.template")} />
										</SelectTrigger>
										<SelectContent>
											{getTemplateSelectItem("nextjs")}
											{getTemplateSelectItem("solidjs")}
											{getTemplateSelectItem("vanillajs")}
										</SelectContent>
									</Select>
								</div>
							</>
						)}

						{creating && (
							<div className="flex flex-col gap-[10px] justify-center items-center pt-5">
								<Grid width={24} height={24} color="#ffffff" />

								<div>{t("dashboard.createProjectDialog.creatingProject")}</div>
							</div>
						)}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="default" className="w-24" onClick={() => handleCreateProject()} disabled={destination === "" || creating}>
						{t("dashboard.createProjectDialog.create")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
