"use client";

import { Fade } from "react-awesome-reveal";
import { IoIosWarning } from "react-icons/io";

import { CodeBlock } from "../../code";

import {
	onPointerEventBasicExample,
	onPointerEventArrayBasicExample,
	onPointerEventMeshOnlyExample,
	onPointerEventDescendantsExample,
	onKeyboardEventBasicExample,
	onKeyboardEventArrayBasicExample,
} from "./code";

import { NextChapterComponent } from "../../components/next-chapter";

export default function DocumentationRunningProjectPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Listening events</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							The editor provides some helpers for listening events in the scene. Those helpers are provided as decorators and can be used in any attached script in
							the scene.
						</div>

						<div>
							Each decorator can be used to decorate a method in the class. Method that will be called each time an event of the provided type(s) is raised in the
							scene.
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="64px" color="orange" />

							<div>
								Those decorators are available in the <b>babylonjs-editor-tools</b> package that is provided as a depdendency in the <b>package.json</b> file. In
								case a decorator that is documented here is not available in the code, make sure to install the up-to-date package in your project.
							</div>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@onPointerEvent</div>

						<div>
							When a method is decorated with <b>@onPointerEvent</b>, this method will be called each time the provided pointer event type(s) is raised in the scene:
						</div>

						<CodeBlock code={onPointerEventBasicExample} />

						<div>
							Multiple event types can be listened at the same time by providing an array of event types to the decorator.
							<br />
							The decorated method always receives a parameter of type <b>PointerInfo</b> that contains more information about the event that has been raised.
						</div>

						<CodeBlock code={onPointerEventArrayBasicExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3 text-muted-foreground">Filtering per mesh</div>

						<div>
							By default, the @onPointerEvent decorator listens for global events. In other words, anywhere the pointer event is raised in the scene, the decorated
							method will be called.
						</div>

						<div>
							Scripts that are attached to meshes (extending <b>AbstractMesh</b> class) can listen for events that are raised only on the attached mesh by changing
							the listening mode.
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="64px" color="orange" />

							<div>
								The following mode is only available for scripts attached to meshes. If the attached object is not a Mesh then an error will be thrown at runtime
								when loading the scene.
							</div>
						</div>

						<CodeBlock code={onPointerEventMeshOnlyExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3 text-muted-foreground">Including descendants</div>

						<div>
							When importing meshes, from a <b>GLB</b> files for example, it can be useful to listen for events on the entire hierarchy of imported meshes. Especially
							when the imported hierarchy is complex and contains multiple meshes.
						</div>

						<div>
							To do so, the listening mode can be set to <b>includeDescendants</b> and the decorated method will be called when the event is raised on the attached
							mesh or any of its descendants.
						</div>

						<div>
							That way, this mode is available on any node (TransformNode, Light, etc.) the script is attached to and is not limited to meshes only like the mode{" "}
							<b>attachedMeshOnly</b>.
						</div>

						<CodeBlock code={onPointerEventDescendantsExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@onKeyboardEvent</div>

						<div>
							As well as <b>@onPointerEvent</b> decorator, the editor provides a <b>@onKeyboardEvent</b> decorator that can be used to listen for keyboard events in
							the scene.
						</div>

						<div>
							When a method is decorated with <b>@onKeyboardEvent</b>, this method will be called each time the provided keyboard event type(s) is raised in the
							scene:
						</div>

						<CodeBlock code={onKeyboardEventBasicExample} />

						<div>As well as for pointer events, multiple event types can be listened at the same time by providing an array of event types to the decorator:</div>

						<CodeBlock code={onKeyboardEventArrayBasicExample} />

						<NextChapterComponent href="/documentation/scripting/linking-assets" title="Linking assets" />
					</div>
				</Fade>
			</div>
		</main>
	);
}
