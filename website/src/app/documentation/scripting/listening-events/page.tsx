"use client";

import { Callout, CodeBlock, DocPage, DocHeading } from "../../components";

import {
	onPointerEventBasicExample,
	onPointerEventArrayBasicExample,
	onPointerEventMeshOnlyExample,
	onPointerEventDescendantsExample,
	onKeyboardEventBasicExample,
	onKeyboardEventArrayBasicExample,
} from "./code";

export default function DocumentationListeningEventsPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>The editor provides some helpers for listening events in the scene. Those helpers are provided as decorators and can be used in any attached script in the scene.</p>

			<p>Each decorator can be used to decorate a method in the class. Method that will be called each time an event of the provided type(s) is raised in the scene.</p>

			<Callout type="warning" title="Package dependency">
				Those decorators are available in the <b>babylonjs-editor-tools</b> package that is provided as a dependency in the <b>package.json</b> file. In case a decorator
				that is documented here is not available in the code, make sure to install the up-to-date package in your project.
			</Callout>

			<DocHeading level={2}>@onPointerEvent</DocHeading>

			<p>
				When a method is decorated with <b>@onPointerEvent</b>, this method will be called each time the provided pointer event type(s) is raised in the scene:
			</p>

			<CodeBlock code={onPointerEventBasicExample} />

			<p>
				Multiple event types can be listened at the same time by providing an array of event types to the decorator.
				<br />
				The decorated method always receives a parameter of type <b>PointerInfo</b> that contains more information about the event that has been raised.
			</p>

			<CodeBlock code={onPointerEventArrayBasicExample} />

			<DocHeading level={3}>Filtering per mesh</DocHeading>

			<p>
				By default, the <b>@onPointerEvent</b> decorator listens for global events. In other words, anywhere the pointer event is raised in the scene, the decorated method
				will be called.
			</p>

			<p>
				Scripts that are attached to meshes (extending <b>AbstractMesh</b> class) can listen for events that are raised only on the attached mesh by changing the listening
				mode.
			</p>

			<Callout type="warning" title="Meshes only">
				The following mode is only available for scripts attached to meshes. If the attached object is not a Mesh then an error will be thrown at runtime when loading the
				scene.
			</Callout>

			<CodeBlock code={onPointerEventMeshOnlyExample} />

			<DocHeading level={3}>Including descendants</DocHeading>

			<p>
				When importing meshes, from a <b>GLB</b> file for example, it can be useful to listen for events on the entire hierarchy of imported meshes. Especially when the
				imported hierarchy is complex and contains multiple meshes.
			</p>

			<p>
				To do so, the listening mode can be set to <b>includeDescendants</b> and the decorated method will be called when the event is raised on the attached mesh or any of
				its descendants.
			</p>

			<p>
				That way, this mode is available on any node (TransformNode, Light, etc.) the script is attached to and is not limited to meshes only like the mode{" "}
				<b>attachedMeshOnly</b>.
			</p>

			<CodeBlock code={onPointerEventDescendantsExample} />

			<DocHeading level={2}>@onKeyboardEvent</DocHeading>

			<p>
				As well as the <b>@onPointerEvent</b> decorator, the editor provides a <b>@onKeyboardEvent</b> decorator that can be used to listen for keyboard events in the
				scene.
			</p>

			<p>
				When a method is decorated with <b>@onKeyboardEvent</b>, this method will be called each time the provided keyboard event type(s) is raised in the scene:
			</p>

			<CodeBlock code={onKeyboardEventBasicExample} />

			<p>As well as for pointer events, multiple event types can be listened at the same time by providing an array of event types to the decorator:</p>

			<CodeBlock code={onKeyboardEventArrayBasicExample} />
		</DocPage>
	);
}
