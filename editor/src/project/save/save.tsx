import { dirname } from "path/posix";
import { writeJSON } from "fs-extra";
import { ipcRenderer } from "electron";

import { toast } from "sonner";

import packageJson from "../../../package.json";

import { Editor } from "../../editor/main";

import { IEditorProject } from "../typings";

import { exportProject } from "../export/export";

import { projectsKey } from "../../tools/project";
import { onProjectSavedObservable } from "../../tools/observables";
import { getBase64SceneScreenshot } from "../../tools/scene/screenshot";
import { tryGetProjectsFromLocalStorage } from "../../tools/local-storage";

import { saveScene } from "./scene";
import { EditorSaveProjectProgressComponent } from "./progress";

let saving = false;

export async function saveProject(editor: Editor): Promise<void> {
	if (saving) {
		return;
	}

	saving = true;

	try {
		await _saveProject(editor);
	} catch (e) {
		if (e instanceof Error) {
			editor.layout.console.error(`Error saving project:\n ${e.message}`);
			toast.error("Error saving project");
		}
	} finally {
		saving = false;
	}
}

async function _saveProject(editor: Editor): Promise<void> {
	if (!editor.state.projectPath) {
		return;
	}

	const toastId = toast(<EditorSaveProjectProgressComponent />, {
		duration: Infinity,
		dismissible: false,
	});

	const directory = dirname(editor.state.projectPath);

	const project: Partial<IEditorProject> = {
		plugins: editor.state.plugins.map((plugin) => ({
			nameOrPath: plugin,
		})),
		version: packageJson.version,
		packageManager: editor.state.packageManager,
		projectTemplate: editor.state.projectTemplate,
		lastOpenedScene: editor.state.lastOpenedScenePath?.replace(
			dirname(editor.state.projectPath),
			""
		),

		compressedTexturesEnabled: editor.state.compressedTexturesEnabled,
		compressedTexturesEnabledInPreview:
      editor.state.compressedTexturesEnabledInPreview,
	};

	if (!editor.props.editedScenePath) {
		await writeJSON(editor.state.projectPath, project, {
			spaces: 4,
		});
	}

	if (editor.state.lastOpenedScenePath) {
		editor.layout.console.log(`Saving project "${project.lastOpenedScene}"`);
		await saveScene(editor, directory, editor.state.lastOpenedScenePath);
		editor.layout.console.log(`Project "${project.lastOpenedScene}" saved.`);
	}

	toast.dismiss(toastId);
	toast.success("Project saved");

	if (!editor.props.editedScenePath) {
		try {
			const base64 = await getBase64SceneScreenshot(
				editor.layout.preview.scene
			);

			const projects = tryGetProjectsFromLocalStorage();
			const project = projects.find(
				(project) => project.absolutePath === editor.state.projectPath
			);
			if (project) {
				project.preview = base64;
				project.updatedAt = new Date();

				localStorage.setItem(projectsKey, JSON.stringify(projects));
				ipcRenderer.send("dashboard:update-projects");
			}
		} catch (e) {
			// Catch silently.
		}
	}

	try {
		onProjectSavedObservable.notifyObservers();
	} catch (e) {
		// Catch silently.
	}

	await exportProject(editor, { optimize: false, noProgress: true });
}
