"use client";

import { CodeBlock, DocPage, DocHeading, DocVideo } from "../../components";

import {
	visibleAsBooleanDecoratorsExample,
	visibleAsColor3DecoratorsExample,
	visibleAsColor4DecoratorsExample,
	visibleAsEntityDecoratorsExample,
	visibleAsNumberDecoratorsExample,
	visibleAsStringDecoratorsExample,
	visibleAsVector2DecoratorsExample,
	visibleAsVector3DecoratorsExample,
} from "./visible-as";

export default function DocumentationCustomizingScriptsPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				A same script can be attached to multiple objects in the scene. Each object may have its own configuration for the script so they can behave differently. To do so,
				properties like booleans, numbers, vectors, colors etc. can be decorated so they become customizable in the editor per script and per object.
			</p>

			<p>
				Each decorator is composed of at least a label and an optional description. This label is used to be displayed in the editor (if not provided, the name of the
				property is used as a label), where the description is used as a tooltip to help the user to understand what's the purpose of the property.
			</p>

			<DocHeading level={2}>@visibleAsBoolean</DocHeading>

			<p>
				When a property is decorated with <b>@visibleAsBoolean</b>, it will be displayed as a checkbox in the editor's inspector. This field can be customized with a label
				that is the first parameter of the decorator and a description.
			</p>

			<CodeBlock code={visibleAsBooleanDecoratorsExample} />

			<DocHeading level={2}>@visibleAsNumber</DocHeading>

			<div className="flex flex-col gap-2">
				<p>
					When a property is decorated with <b>@visibleAsNumber</b>, it will be displayed as a number field in the editor's inspector. This field can be customized with:
				</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>
						<b>min</b>: defines the minimum value the user can set (optional).
					</li>
					<li>
						<b>max</b>: defines the maximum value the user can set (optional).
					</li>
					<li>
						<b>step</b>: defines the increment/decrement step value (when the user slides on the input, optional).
					</li>
				</ul>
			</div>

			<CodeBlock code={visibleAsNumberDecoratorsExample} />

			<DocHeading level={2}>@visibleAsString</DocHeading>

			<p>
				When a property is decorated with <b>@visibleAsString</b>, it will be displayed as a text input in the editor's inspector. This field can be customized with a label
				that is the first parameter of the decorator and a description.
			</p>

			<CodeBlock code={visibleAsStringDecoratorsExample} />

			<DocHeading level={2}>@visibleAsVector2</DocHeading>

			<div className="flex flex-col gap-2">
				<p>
					When a property is decorated with <b>@visibleAsVector2</b>, it will be displayed as a 2D vector field (X and Y) in the editor's inspector. This field can be
					customized with:
				</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>
						<b>min</b>: defines the minimum value the user can set for each axis (optional).
					</li>
					<li>
						<b>max</b>: defines the maximum value the user can set for each axis (optional).
					</li>
					<li>
						<b>step</b>: defines the increment/decrement step value (when the user slides on the input, optional).
					</li>
					<li>
						<b>asDegrees</b>: defines if the field should convert radians to degrees internally for a better understanding (optional).
					</li>
				</ul>
			</div>

			<CodeBlock code={visibleAsVector2DecoratorsExample} />

			<DocHeading level={2}>@visibleAsVector3</DocHeading>

			<p>
				When a property is decorated with <b>@visibleAsVector3</b>, it will be displayed as a 3D vector field (X, Y and Z) in the editor's inspector. Properties to
				customize the field are the same as for <b>@visibleAsVector2</b>.
			</p>

			<CodeBlock code={visibleAsVector3DecoratorsExample} />

			<DocHeading level={2}>@visibleAsColor3</DocHeading>

			<p>
				When a property is decorated with <b>@visibleAsColor3</b>, it will be displayed as a color field (R, G and B) in the editor's inspector. The color field has a color
				picker added automatically by default.
			</p>

			<div className="flex flex-col gap-2">
				<p>This field can be customized with:</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>
						<b>noClamp</b>: defines if the color values (R, G and B) should be clamped between 0 and 1 (optional).
					</li>
					<li>
						<b>noColorPicker</b>: defines if the color picker should be disabled (optional).
					</li>
				</ul>
			</div>

			<CodeBlock code={visibleAsColor3DecoratorsExample} />

			<DocHeading level={2}>@visibleAsColor4</DocHeading>

			<p>
				When a property is decorated with <b>@visibleAsColor4</b>, it will be displayed as a color field (R, G, B and A for the alpha) in the editor's inspector. Properties
				to customize the field are the same as for <b>@visibleAsColor3</b>.
			</p>

			<CodeBlock code={visibleAsColor4DecoratorsExample} />

			<DocHeading level={2}>@visibleAsEntity</DocHeading>

			<p>
				When a property is decorated with <b>@visibleAsEntity</b>, it will be displayed as a field that can receive entities from the scene in the editor's inspector. This
				creates a link to the chosen entity and allows to retrieve it in the script.
			</p>

			<p>To set an entity, simply select it in the graph of the editor and drag it to the field.</p>

			<div className="flex flex-col gap-2">
				<p>The type of entities that can be dropped on the field are, according to the configuration of the decorator:</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>
						<b>node</b>: any node from Babylon.js like meshes, cameras, lights, transform nodes, etc. that is available in the scene.
					</li>
					<li>
						<b>sound</b>: any sound that has been instantiated and available in the scene.
					</li>
					<li>
						<b>particleSystem</b>: any particle system that is available in the scene.
					</li>
					<li>
						<b>animationGroup</b>: any animation group that is available in the scene.
					</li>
				</ul>
			</div>

			<CodeBlock code={visibleAsEntityDecoratorsExample} />

			<p>
				Let's have a scene with 2 boxes: one has a script attached to it and the second one is just a mesh. The first box has a script that rotates the entity that is
				attached to it using the <b>@visibleAsEntity</b> decorator.
			</p>

			<p>
				In this example, the second box is attached to the first box's script so the rotation of the second box will be updated by the script when running the scene. The
				entity is attached just by drag'n'dropping it in the inspector's field.
			</p>

			<DocVideo src="/documentation/customizing-scripts/attach-entity.mp4" />
		</DocPage>
	);
}
