"use client";

import { Fade } from "react-awesome-reveal";
import { IoIosWarning } from "react-icons/io";

import { CodeBlock } from "../../code";

import { linkingGuiExample, linkingJsonExample, linkingMaterialExample, linkingRestrictedMaterialExample } from "./code";

export default function DocumentationLinkingAssetsPage() {
	return (
		<main className="w-full min-h-screen p-5 bg-black text-neutral-50">
			<div className="flex flex-col gap-10 lg:max-w-3xl 2xl:max-w-6xl mx-auto pt-32">
				<Fade cascade damping={0.1} triggerOnce className="w-full">
					<Fade>
						<div className="text-3xl md:text-5xl lg:text-6xl font-semibold font-sans tracking-tighter text-center">Linking assets</div>
					</Fade>
				</Fade>

				<Fade triggerOnce>
					<div className="flex flex-col gap-4">
						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Introduction</div>

						<div>The editor provides a way to use assets directly in scripts. Those assets are preloaded and are part the loading process of the scene.</div>

						<div>
							To use those assets in scripts, properties need to be decorated with the <b>@visibleAsAsset</b> decorator from the <b>babylonjs-editor-tools</b> package
							and will then be available in the editor's inspector.
							<br />
							To set those properties, simply select an asset from the <b>Assets Browser</b> panel and drag & drop it to the desired property in the inspector.
						</div>

						<div>If the dropped asset is not compatible with the property type, an error popin will be displayed.</div>

						<div>
							The supported asset types are:
							<ul className="list-disc">
								<li>
									<b>json</b>: any JSON file that can be parsed.
								</li>
								<li>
									<b>material</b>: any material created in the editor and available as asset.
								</li>
								<li>
									<b>gui</b>: any GUI created in the editor and available as asset.
								</li>
							</ul>
						</div>

						<div className="mx-auto p-10 w-full object-contain">
							<video muted autoPlay loop controls className="rounded-lg">
								<source src="/documentation/scripting/linking-assets-json-file.mp4" />
							</video>
						</div>

						<div className="flex gap-2 items-center">
							<IoIosWarning size="64px" color="orange" />

							<div>
								Those decorators are available in the <b>babylonjs-editor-tools</b> package that is provided as a depdendency in the <b>package.json</b> file. In
								case a decorator that is documented here is not available in the code, make sure to install the up-to-date package in your project.
							</div>
						</div>

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">JSON files</div>

						<div>
							When a property is decorated with <b>@visibleAsAsset</b>, this property will be linked to the provided asset with extension <b>.json</b> in the editor's
							inspector. The JSON file is automatically parsed and properties can be accessed directly.
						</div>

						<CodeBlock code={linkingJsonExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">Material files</div>

						<div>
							As well as JSON files, when a property is decorated with <b>@visibleAsAsset</b>, this property will be linked to the provided asset with extension{" "}
							<b>.material</b> in the editor's inspector. The material is automatically parsed and properties can be accessed directly.
						</div>

						<CodeBlock code={linkingMaterialExample} />

						<div>
							In order to restrict the type of supported material, a configuration object can be passed to the decorator. By default, all materials are allowed.
							Example to restrict to PBR material:
						</div>

						<CodeBlock code={linkingRestrictedMaterialExample} />

						<div className="text-3xl md:text-2xl lg:text-3xl my-3">GUI files</div>

						<div>
							As well as JSON files, when a property is decorated with <b>@visibleAsAsset</b>, this property will be linked to the provided asset with extension{" "}
							<b>.gui</b> in the editor's inspector. The GUI file is automatically parsed and properties can be accessed directly.
						</div>

						<CodeBlock code={linkingGuiExample} />
					</div>
				</Fade>
			</div>
		</main>
	);
}
