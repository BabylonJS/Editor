"use client";

import { Fade } from "react-awesome-reveal";

import { IoIosWarning } from "react-icons/io";

import { NextChapterComponent } from "../../next-chapter";

import { CodeBlock } from "../../code";

import { tsClassDecoratorsExample } from "./from-scene";
import { tsClassBasedExample, tsFunctionBasedExample } from "./examples";

export default function DocumentationAddingScriptsPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Adding scripts</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							The editor allows to add scripts to your project in order to add interactivity to your scenes. The scripts are written in TypeScript and consist on 2
							main methods:
						</div>

						<ul className="list-disc">
							<li>
								<b>onStart</b>: Called when the script is loaded and the scene is ready.
							</li>
							<li>
								<b>onUpdate</b>: Called each time a frame is rendered on the screen.
							</li>
						</ul>

						<div>
							Scripts are made to be attached to objects and multiple scripts can be attached to the same object. Linked with the <b>babylonjs-editor-tools</b>{" "}
							package installed with the project, some useful decorators are available to help retrieving objects and customizing the scripts.
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="32px" color="orange" />

							<div>
								This feature is still <b>Work in progress</b> and some features like decorators are not yet available for function-based scripts.
							</div>
						</div>

						<div>
							Scripts can be written using both methods <b>class-based</b>:
						</div>

						<CodeBlock code={tsClassBasedExample} />

						<div>
							and <b>function-based</b>:
						</div>

						<CodeBlock code={tsFunctionBasedExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Adding script</div>

						<div>
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
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/basics/adding-scripts/adding-script.mp4" />
							</video>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Attaching script</div>

						<div>
							Once a script is available in the sources folder, just select an object in the scene (a mesh for example) so the inspector shows the properties of the
							mesh and then drag'n'drop the script file from the <b>Assets Browser</b> panel to the <b>Scripts</b> section in the inspector.
						</div>

						<div>Once done, the script is attached to be object and will be executed automatically when running the application.</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/basics/adding-scripts/attaching-script.mp4" />
							</video>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Using decorators to retrieve objects</div>

						<div>
							The <b>babylonjs-editor-tools</b> package provides some useful decorators to help retrieving objects and customizing the scripts.
						</div>

						<div>Available decorators are:</div>

						<ul className="list-disc">
							<li>
								<b>@nodeFromScene</b>: Retrieve the reference of the first node that has the given name by traversing the entire scene graph.
							</li>
							<li>
								<b>@nodeFromDescendants</b>: Retrieve the reference of the first node that has the given name but only if the node is a descendant of the object the
								script is attached to.
							</li>
							<li>
								<b>@particleSystemFromScene</b>: Retrieve the reference of the first particle system that has the given name by traversing the entire scene graph.
							</li>
							<li>
								<b>@soundFromScene</b>: Retrieve the reference of the first sound that has the given name.
							</li>
						</ul>

						<div>
							Those decorators are equivalent to calling the associated methods like <b>scene.getMeshById("...")</b>, <b>scene.getTransformNodeById("...")</b> etc..
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="32px" color="orange" />

							<div>
								Those decorators can be used only by scripts using Classes and are processed when the script is loaded. So the decorated properties are not
								available in the <b>constructor</b> method.
							</div>
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="48px" color="orange" />

							<div>
								Those decorators are available in the <b>babylonjs-editor-tools</b> package that is provided as a depdendency in the <b>package.json</b> file. In
								case a decorator that is documented here is not available in the code, make sure to install the up-to-date package in your project.
							</div>
						</div>

						<div>Example:</div>

						<CodeBlock code={tsClassDecoratorsExample} />

						<NextChapterComponent href="/documentation/running-project" title="Running project" />
					</div>
				</Fade>
			</div>
		</main>
	);
}
