import { dirname, join } from "path/posix";
import { pathExists, readJSON } from "fs-extra";

import { toast } from "sonner";

import { t } from "../../i18n";

import { Editor } from "../../editor/main";

import { execNodePty } from "../../tools/node-pty";

import { IEditorProject } from "../typings";
import { projectConfiguration } from "../configuration";

import { loadScene } from "./scene";
import { LoadScenePrepareComponent } from "./prepare";

export async function loadProject(editor: Editor, path: string): Promise<void> {
	const directory = dirname(path);
	const project = (await readJSON(path, "utf-8")) as IEditorProject;
	const packageManager = project.packageManager ?? "yarn";

	editor.setState({
		packageManager,
		projectPath: path,
		plugins: project.plugins.map((plugin) => plugin.nameOrPath),
		lastOpenedScenePath: project.lastOpenedScene ? join(directory, project.lastOpenedScene) : null,

		compressedTexturesEnabled: project.compressedTexturesEnabled ?? false,
		compressedTexturesEnabledInPreview: project.compressedTexturesEnabledInPreview ?? false,
	});

	editor.layout.forceUpdate();

	projectConfiguration.compressedTexturesEnabled = project.compressedTexturesEnabled ?? false;

	// Update dependencies
	const toastId = toast(<LoadScenePrepareComponent />, {
		duration: Infinity,
		dismissible: false,
	});

	let command = "";
	switch (packageManager) {
		case "npm":
			command = "npm i";
			break;
		case "pnpm":
			command = "pnpm i";
			break;
		case "bun":
			command = "bun i";
			break;
		default:
			command = "yarn";
			break;
	}

	const p = await execNodePty(command, { cwd: directory });
	p.wait().then(async (code) => {
		toast.dismiss(toastId);

		if (code !== 0) {
			toast.warning(t("project.load.packageManagerNotAvailable", { packageManager }));
		} else {
			editor.layout.preview.setState({
				playEnabled: true,
			});
			toast.success(t("project.load.dependenciesUpdated"));
		}

		loadProjectPlugins(editor, path, project);
	});

	// Load scene?
	if (project.lastOpenedScene) {
		const absolutePath = join(directory, project.lastOpenedScene);

		if (!(await pathExists(absolutePath))) {
			toast(t("project.load.sceneNotFound", { sceneName: project.lastOpenedScene }));

			return editor.layout.console.error(`Scene "${project.lastOpenedScene}" does not exist.`);
		}

		await loadScene(editor, directory, absolutePath);

		editor.layout.graph.refresh();
		editor.layout.inspector.setEditedObject(editor.layout.preview.scene);
	}
}

export async function loadProjectPlugins(editor: Editor, path: string, project: IEditorProject) {
	for (const plugin of project.plugins) {
		try {
			const isLocalPlugin = await pathExists(plugin.nameOrPath);

			let requireId = plugin.nameOrPath;
			if (!isLocalPlugin) {
				const projectDir = dirname(path);
				requireId = join(projectDir, "node_modules", plugin.nameOrPath);
			}

			const result = require(requireId);
			result.main(editor);

			if (isLocalPlugin) {
				editor.layout.console.log(`Loaded plugin from local drive "${result.title ?? plugin.nameOrPath}"`);
			} else {
				editor.layout.console.log(`Loaded plugin "${result.title ?? plugin.nameOrPath}"`);
			}
		} catch (e) {
			console.error(e);
			editor.layout.console.error(`Failed to load plugin from project "${plugin.nameOrPath}"`);
		}
	}
}
