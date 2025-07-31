"use client";

import { Fade } from "react-awesome-reveal";
import { IoIosWarning } from "react-icons/io";

import { CodeBlock } from "../code";

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

import { NextChapterComponent } from "../components/next-chapter";

export default function DocumentationRunningProjectPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Customizing scripts</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>
							A same script can be attached to multiple objects in the scene. Each object may have its own configuration for the script so they can behave
							differently. To do so, properties like booleans, numbers, vectors, colors etc. can be decorated so they become customizable in the editor per script and
							per object.
						</div>

						<div>
							Each decorator is composed of at least a label and an optional description. This label is used to be displayed in the editor (if not provided, the name
							of the property is used as a label), where the description is used as a tooltip to help the user to understand what's the purpose of the property.
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="64px" color="orange" />

							<div>
								Those decorators are available in the <b>babylonjs-editor-tools</b> package that is provided as a depdendency in the <b>package.json</b> file. In
								case a decorator that is documented here is not available in the code, make sure to install the up-to-date package in your project.
							</div>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@visibleAsBoolean</div>

						<div>
							When a property is decorated with <b>@visibleAsBoolean</b>, it will be displayed as a checkbox in the editor's inspector. This field can be customized
							with a label that is the first parameter of the decorator and a description.
						</div>

						<CodeBlock code={visibleAsBooleanDecoratorsExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@visibleAsNumber</div>

						<div>
							When a property is decorated with <b>@visibleAsNumber</b>, it will be displayed as a number field in the editor's inspector. This field can be
							customized with:
							<ul className="list-disc">
								<li>
									<b>min</b>: Defines the minimum value the user can set (optional).
								</li>
								<li>
									<b>max</b>: Defines the maximum value the user can set (optional).
								</li>
								<li>
									<b>step</b>: Defines the increment/decrement step value (when the user slides on the input, optional).
								</li>
							</ul>
						</div>

						<CodeBlock code={visibleAsNumberDecoratorsExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@visibleAsString</div>

						<div>
							When a property is decorated with <b>@visibleAsString</b>, it will be displayed as a text input in the editor's inspector. This field can be customized
							with a label that is the first parameter of the decorator and a description.
						</div>

						<CodeBlock code={visibleAsStringDecoratorsExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@visibleAsVector2</div>

						<div>
							When a property is decorated with <b>@visibleAsVector2</b>, it will be displayed as a 2D vector field (X and Y) in the editor's inspector. This field
							can be customized with:
							<ul className="list-disc">
								<li>
									<b>min</b>: Defines the minimum value the user can set for each axis (optional).
								</li>
								<li>
									<b>max</b>: Defines the maximum value the user can set for each axis (optional).
								</li>
								<li>
									<b>step</b>: Defines the increment/decrement step value (when the user slides on the input, optional).
								</li>
								<li>
									<b>asDegrees</b>: Defines if the field should convert radians to degrees internally for a better understanding (optional).
								</li>
							</ul>
						</div>

						<CodeBlock code={visibleAsVector2DecoratorsExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@visibleAsVector3</div>

						<div>
							When a property is decorated with <b>@visibleAsVector3</b>, it will be displayed as a 3D vector field (X, Y and Z) in the editor's inspector. Properties
							to customize the field are the same as for <b>@visibleAsVector2</b>.
						</div>

						<CodeBlock code={visibleAsVector3DecoratorsExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@visibleAsColor3</div>

						<div>
							When a property is decorated with <b>@visibleAsColor3</b>, it will be displayed as a color field (R, G and B) in the editor's inspector. The color field
							has a color picker added automatically by default.
						</div>

						<div>
							This field can be customized with:
							<ul className="list-disc">
								<li>
									<b>noClamp</b>: Defines if the color values (R, G and B) should be clamped between 0 and 1 (optional).
								</li>
								<li>
									<b>noColorPicker</b>: Defines if the color picker should be disabled (optional).
								</li>
							</ul>
						</div>

						<CodeBlock code={visibleAsColor3DecoratorsExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@visibleAsColor4</div>

						<div>
							When a property is decorated with <b>@visibleAsColor4</b>, it will be displayed as a color field (R, G, B and A for the alpha) in the editor's
							inspector. Properties to customize the field are the same as for <b>@visibleAsColor3</b>.
						</div>

						<CodeBlock code={visibleAsColor4DecoratorsExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">@visibleAsEntity</div>

						<div>
							When a property is decorated with <b>@visibleAsEntity</b>, it will be displayed as a field that can receive entities from the scene in the editor's
							inspector. This creates a link to the chosen entity and allows to retrieve it in the script.
						</div>

						<div>To set an entity, simply select it in the graph of the editor and drag it to the field.</div>

						<div>
							The type of entities that can be dropped on the field are, according to the configuration of the decorator:
							<ul className="list-disc">
								<li>
									<b>node</b>: Any node from Babylon.js like meshes, cameras, lights, transform nodes, etc. that is available in the scene.
								</li>
								<li>
									<b>sound</b>: Any sound that has been instantiated and available in the scene.
								</li>
								<li>
									<b>particleSystem</b>: Any particle system that is available in the scene.
								</li>
								<li>
									<b>animationGroup</b>: Any animation group that is available in the scene.
								</li>
							</ul>
						</div>

						<CodeBlock code={visibleAsEntityDecoratorsExample} />

						<div>
							Let's have a scene with 2 boxes: one has a script attached to it and the second one is just a mesh. The first box has a script that rotates the entity
							that is attached to it using the <b>@visibleAsEntity</b> decorator.
						</div>

						<div>
							In this example, the second box is attached to the first box's script so the rotation of the second box will be updated by the script when running the
							scene. The entity is attached just by drag'n'dropping it in the inspector's field.
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/customizing-scripts/attach-entity.mp4" />
							</video>
						</div>

						<NextChapterComponent href="/documentation/advanced/compressing-textures" title="Compressing textures" />
					</div>
				</Fade>
			</div>
		</main>
	);
}
