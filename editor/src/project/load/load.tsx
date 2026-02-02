import { dirname, join } from "path/posix";
import { pathExists, readJSON } from "fs-extra";

import { toast } from "sonner";

import { Editor } from "../../editor/main";

import packageJson from "../../../package.json";

import { requirePlugin } from "../../tools/plugins/require";

import { EditorProjectPackageManager, IEditorProject } from "../typings";
import { projectConfiguration } from "../configuration";

import { loadScene } from "./scene";
import { LoadScenePrepareComponent } from "./prepare";
import { installBabylonJSEditorCLI, installBabylonJSEditorTools, installDependencies } from "./install";

/**
 * Loads an editor project located at the given path. Typically called at startup when opening
 * a project from the dashboard.
 * @param editor defines the reference to the editor.
 * @param path defines the absolute path to the project file.
 */
export async function loadProject(editor: Editor, path: string) {
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
	checkDependencies(editor, {
		path,
		project,
		directory,
		packageManager,
	});

	// Load scene?
	if (project.lastOpenedScene) {
		const absolutePath = join(directory, project.lastOpenedScene);

		if (!(await pathExists(absolutePath))) {
			toast(`Scene "${project.lastOpenedScene}" does not exist.`);

			return editor.layout.console.error(`Scene "${project.lastOpenedScene}" does not exist.`);
		}

		await loadScene(editor, directory, absolutePath);

		editor.layout.preview.scene.onBeforeRenderObservable.addOnce(() => {
			editor.layout.graph.refresh();
		});

		editor.layout.inspector.setEditedObject(editor.layout.preview.scene);
	}
}

export async function checkDependencies(
	editor: Editor,
	{
		directory,
		path,
		project,
		packageManager,
	}: {
		directory: string;
		path: string;
		project: IEditorProject;
		packageManager: EditorProjectPackageManager;
	}
) {
	const toastId = toast(<LoadScenePrepareComponent />, {
		duration: Infinity,
		dismissible: false,
	});

	const installCode = await installDependencies(packageManager as any, directory);
	if (installCode !== 0) {
		toast.warning(`Package manager "${packageManager}" is not available on your system. Dependencies will not be updated.`);
	}

	const cliPackageJsonPath = join(directory, "node_modules/babylonjs-editor-cli/package.json");
	const toolsPackageJsonPath = join(directory, "node_modules/babylonjs-editor-tools/package.json");

	let matchesToolsVersion = false;
	try {
		const toolsPackageJson = await readJSON(toolsPackageJsonPath, "utf-8");
		if (toolsPackageJson.version === packageJson.version) {
			matchesToolsVersion = true;
		}
	} catch (e) {
		// Catch silently
	}

	let matchesCliVersion = false;
	try {
		const cliPackageJson = await readJSON(cliPackageJsonPath, "utf-8");
		if (cliPackageJson.version === packageJson.version) {
			matchesCliVersion = true;
		}
	} catch (e) {
		// Catch silently
	}

	let toolsCode = 0;
	if (!matchesToolsVersion) {
		toolsCode = await installBabylonJSEditorTools(packageManager, directory, packageJson.version);
		if (toolsCode !== 0) {
			toast.warning(`Package manager "${packageManager}" is not available on your system. Can't install "babylonjs-editor-tools" package dependency.`);
		}
	}

	if (!matchesCliVersion) {
		installBabylonJSEditorCLI(packageManager, directory, packageJson.version).then((code) => {
			if (code !== 0) {
				toast.warning(`Package manager "${packageManager}" is not available on your system. Can't install "babylonjs-editor-cli" package dependency.`);
			}
		});
	}

	toast.dismiss(toastId);

	if (installCode === 0 && toolsCode === 0) {
		editor.layout.preview.setState({
			playEnabled: true,
		});

		toast.success("Dependencies successfully updated");
	}

	loadProjectPlugins(editor, path, project);
}

export async function loadProjectPlugins(editor: Editor, path: string, project: IEditorProject) {
	for (const plugin of project.plugins) {
		try {
			await requirePlugin(editor, {
				projectPath: path,
				pluginNameOrPath: plugin.nameOrPath,
			});
		} catch (e) {
			console.error(e);
			editor.layout.console.error(`Failed to load plugin from project "${plugin.nameOrPath}"`);
		}
	}
}
