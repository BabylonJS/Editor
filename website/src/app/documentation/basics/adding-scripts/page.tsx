"use client";

import { Callout, CodeBlock, DocPage, DocHeading, DocVideo } from "../../components";

import { tsClassDecoratorsExample } from "./from-scene";
import { tsClassBasedExample, tsFunctionBasedExample } from "./examples";

export default function DocumentationAddingScriptsPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<div className="flex flex-col gap-2">
				<p>
					The editor allows to add scripts to your project in order to add interactivity to your scenes. The scripts are written in TypeScript and consist on 2 main
					methods:
				</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>
						<b>onStart</b>: called when the script is loaded and the scene is ready.
					</li>
					<li>
						<b>onUpdate</b>: called each time a frame is rendered on the screen.
					</li>
				</ul>
			</div>

			<p>
				Scripts are made to be attached to objects and multiple scripts can be attached to the same object. Linked with the <b>babylonjs-editor-tools</b> package installed
				with the project, some useful decorators are available to help retrieving objects and customizing the scripts.
			</p>

			<Callout type="warning" title="Work in progress">
				This feature is still a <b>work in progress</b> and some features like decorators are not yet available for function-based scripts.
			</Callout>

			<p>
				Scripts can be written using both methods, <b>class-based</b>:
			</p>

			<CodeBlock code={tsClassBasedExample} />

			<p>
				and <b>function-based</b>:
			</p>

			<CodeBlock code={tsFunctionBasedExample} />

			<DocHeading level={2}>Adding script</DocHeading>

			<p>
				The first steps consists on creating a new script before it can be applied on an object.
				<br />
				To do so, right-click somewhere in the <b>src</b> folder of the project using the <b>Assets Browser</b> panel in the editor and select{" "}
				<b>
					Add {"->"} Script {"->"} Class based
				</b>{" "}
				or{" "}
				<b>
					Add {"->"} Script {"->"} Function based
				</b>
				.
			</p>

			<DocVideo src="/documentation/basics/adding-scripts/adding-script.mp4" />

			<DocHeading level={2}>Attaching script</DocHeading>

			<p>
				Once a script is available in the sources folder, just select an object in the scene (a mesh for example) so the inspector shows the properties of the mesh and then
				drag'n'drop the script file from the <b>Assets Browser</b> panel to the <b>Scripts</b> section in the inspector.
			</p>

			<p>Once done, the script is attached to the object and will be executed automatically when running the application.</p>

			<DocVideo src="/documentation/basics/adding-scripts/attaching-script.mp4" />

			<DocHeading level={2}>Using decorators to retrieve objects</DocHeading>

			<p>
				The <b>babylonjs-editor-tools</b> package provides some useful decorators to help retrieving objects and customizing the scripts.
			</p>

			<div className="flex flex-col gap-2">
				<p>Available decorators are:</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>
						<b>@nodeFromScene</b>: retrieve the reference of the first node that has the given name by traversing the entire scene graph.
					</li>
					<li>
						<b>@nodeFromDescendants</b>: retrieve the reference of the first node that has the given name but only if the node is a descendant of the object the script
						is attached to.
					</li>
					<li>
						<b>@particleSystemFromScene</b>: retrieve the reference of the first particle system that has the given name by traversing the entire scene graph.
					</li>
					<li>
						<b>@soundFromScene</b>: retrieve the reference of the first sound that has the given name.
					</li>
				</ul>
			</div>

			<p>
				Those decorators are equivalent to calling the associated methods like <b>scene.getMeshById("...")</b>, <b>scene.getTransformNodeById("...")</b> etc.
			</p>

			<Callout type="warning" title="Class-based scripts only">
				Those decorators can be used only by scripts using classes and are processed when the script is loaded. So the decorated properties are not available in the{" "}
				<b>constructor</b> method.
			</Callout>

			<Callout type="warning" title="Package dependency">
				Those decorators are available in the <b>babylonjs-editor-tools</b> package that is provided as a dependency in the <b>package.json</b> file. In case a decorator
				that is documented here is not available in the code, make sure to install the up-to-date package in your project.
			</Callout>

			<p>Example:</p>

			<CodeBlock code={tsClassDecoratorsExample} />
		</DocPage>
	);
}
