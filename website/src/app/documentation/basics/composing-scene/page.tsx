"use client";

import { DocPage, DocHeading, DocVideo, DocImage, Callout, CustomLink } from "../../components";

export default function DocumentationComposingScenePage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>The layout of the editor is divided into 4 main parts:</p>

			<ul className="list-disc pl-6 space-y-1">
				<li>
					<b>Graph</b>: by default on the left side, shows the structure of the scene that is being edited.
				</li>
				<li>
					<b>Preview</b>: by default in center, where you can see and interact with the scene.
				</li>
				<li>
					<b>Inspector</b>: by default on the right side, where you can see and edit the properties of the selected object.
				</li>
				<li>
					<b>Assets Browser</b>: by default on the bottom side, where you can see and manage the assets of the project (textures, materials, meshes, etc.).
				</li>
			</ul>

			<p>
				Each time a node is clicked in the graph or in the preview, the inspector is updated to show the properties of the selected object.
				<br />
				The layout of the inspector may change according to the nature of the edited object.
			</p>

			<DocVideo src="/documentation/basics/composing-scene/select-object.mp4" />

			<DocHeading level={2}>Using gizmos</DocHeading>

			<p>
				In order to move, rotate and scale selected objects, gizmos may be used.
				<br />
				For a complete understanding of gizmos, you can refer to the{" "}
				<b>
					<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/mesh/gizmo">Babylon.js documentation</CustomLink>
				</b>
				.
			</p>

			<p>In the editor, gizmos are available in the preview panel toolbar or via shortcut:</p>

			<ul className="list-disc pl-6 space-y-1">
				<li>
					<kbd className="px-2 py-0.5 rounded bg-neutral-800 text-xs font-mono">CTRL+T</kbd> or{" "}
					<kbd className="px-2 py-0.5 rounded bg-neutral-800 text-xs font-mono">⌘+T</kbd> for <b>Position</b> gizmos
				</li>
				<li>
					<kbd className="px-2 py-0.5 rounded bg-neutral-800 text-xs font-mono">CTRL+R</kbd> or{" "}
					<kbd className="px-2 py-0.5 rounded bg-neutral-800 text-xs font-mono">⌘+R</kbd> for <b>Rotation</b> gizmos
				</li>
				<li>
					<kbd className="px-2 py-0.5 rounded bg-neutral-800 text-xs font-mono">CTRL+D</kbd> or{" "}
					<kbd className="px-2 py-0.5 rounded bg-neutral-800 text-xs font-mono">⌘+D</kbd> for <b>Scaling</b> gizmos
				</li>
			</ul>

			<DocVideo src="/documentation/basics/composing-scene/gizmos-toolbar.mp4" />

			<DocHeading level={2}>Adding objects</DocHeading>

			<p>
				The editor supports adding primitive objects such as meshes, lights, and cameras.
				<br />
				By default, the template already contains a{" "}
				<b>
					<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction#universal-camera">Universal camera</CustomLink>
				</b>
				, a{" "}
				<b>
					<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/lights/lights_introduction#the-point-light">Point light</CustomLink>
				</b>
				, a{" "}
				<b>
					<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/set/box">Box</CustomLink>
				</b>
				, and a{" "}
				<b>
					<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/set/ground">Ground</CustomLink>
				</b>
				.
			</p>

			<p>
				You can add more objects by clicking on the <b>Add</b> button in the main toolbar of the editor. Each time a new object is added, it is placed at the center of the
				scene and the graph is updated to show the newly added node.
			</p>

			<DocImage src="/documentation/basics/composing-scene/adding-objects.png" alt="Adding objects in Babylon.js Editor" />

			<p>
				Each object can be customized. Those meshes (box, sphere, ground, etc.) are called "primitives" and their geometry is generated automatically by Babylon.js. Those
				geometries are created using default values and you can edit them in the inspector.
			</p>

			<DocHeading level={2}>Adding custom 3D models</DocHeading>

			<p>
				The editor supports multiple file formats for 3D models such as <b>.glb</b>, <b>.gltf</b>, <b>.obj</b>, <b>.fbx</b>, <b>.babylon</b>, <b>.stl</b>, and <b>.blend</b>
				.
			</p>

			<Callout type="note" title="FBX Conversion">
				Each time a <b>.fbx</b> file is imported, the editor will send the file to the conversion server to be converted automatically. The server is located at{" "}
				<CustomLink href="https://editor.babylonjs.com/">editor.babylonjs.com</CustomLink> and you can find the sources of the converter{" "}
				<CustomLink href="https://github.com/BabylonJS/Editor/tree/feature/5.0.0/website/src/app/api/converter">here on GitHub</CustomLink>.
			</Callout>

			<p>
				To add your first 3D model, click <b>Import</b> in the <b>Assets Browser</b>. When the file dialog appears, select all the files of the 3D model (3D file and
				textures) and click <b>Open</b>.
			</p>

			<DocVideo src="/documentation/basics/composing-scene/import-3d-models.mp4" />

			<p>
				In order to keep the assets organized, you can create folders in the assets browser by right-clicking on the panel and selecting the <b>New Folder</b> option. To
				rename a folder or a file, double-click on its name.
			</p>

			<DocVideo src="/documentation/basics/composing-scene/creating-folder.mp4" />

			<p>
				In this example, we imported a <b>.gltf</b> file with all its associated textures. To place the 3D model into the scene, drag and drop the <b>.gltf</b> file onto
				the preview. Once loaded, the editor places all the root nodes of the 3D model where the file was dropped.
			</p>

			<Callout type="info" title="Scaling Imported Models">
				Sometimes, models are exported with scales that differ from your project. To fix this, select the root nodes and re-scale them using the inspector. For GLTF files,
				the Babylon.js loader creates a <b>__root__</b> node that you can use to re-scale the entire 3D model.
			</Callout>

			<DocVideo src="/documentation/basics/composing-scene/importing-model.mp4" />

			<DocHeading level={2}>Managing hidden files</DocHeading>

			<p>
				When a loaded 3D model contains embedded textures (typically all <b>.glb</b> and some <b>.fbx</b> files), the editor will automatically extract them and place them
				in the assets browser in the same folder.
			</p>

			<p>
				To keep files organized, generated texture files are hidden by default in the assets browser. You can show them by clicking on the <b>Filters</b> button on the
				right side and checking <b>Show Generated Files</b>.
			</p>

			<DocImage src="/documentation/basics/composing-scene/show-hidden-files.png" alt="Show hidden files filter" />

			<p>
				To make a file visible permanently in the assets browser, rename the file to remove the prefix <b>editor-generated_</b>.
			</p>
		</DocPage>
	);
}
