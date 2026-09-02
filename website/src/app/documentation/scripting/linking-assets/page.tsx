"use client";

import { Callout, CodeBlock, DocPage, DocHeading, DocVideo } from "../../components";

import { linkingGuiExample, linkingJsonExample, linkingMaterialExample, linkingRestrictedMaterialExample } from "./code";

export default function DocumentationLinkingAssetsPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>The editor provides a way to use assets directly in scripts. Those assets are preloaded and are part of the loading process of the scene.</p>

			<p>
				To use those assets in scripts, properties need to be decorated with the <b>@visibleAsAsset</b> decorator from the <b>babylonjs-editor-tools</b> package and will
				then be available in the editor's inspector.
				<br />
				To set those properties, simply select an asset from the <b>Assets Browser</b> panel and drag & drop it to the desired property in the inspector.
			</p>

			<p>If the dropped asset is not compatible with the property type, an error popup will be displayed.</p>

			<div className="flex flex-col gap-2">
				<p>The supported asset types are:</p>

				<ul className="list-disc pl-6 space-y-1">
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

			<DocVideo src="/documentation/scripting/linking-assets-json-file.mp4" />

			<Callout type="warning" title="Package dependency">
				Those decorators are available in the <b>babylonjs-editor-tools</b> package that is provided as a dependency in the <b>package.json</b> file. In case a decorator
				that is documented here is not available in the code, make sure to install the up-to-date package in your project.
			</Callout>

			<DocHeading level={2}>JSON files</DocHeading>

			<p>
				When a property is decorated with <b>@visibleAsAsset</b>, this property will be linked to the provided asset with extension <b>.json</b> in the editor's inspector.
				The JSON file is automatically parsed and properties can be accessed directly.
			</p>

			<CodeBlock code={linkingJsonExample} />

			<DocHeading level={2}>Material files</DocHeading>

			<p>
				As well as JSON files, when a property is decorated with <b>@visibleAsAsset</b>, this property will be linked to the provided asset with extension <b>.material</b>{" "}
				in the editor's inspector. The material is automatically parsed and properties can be accessed directly.
			</p>

			<CodeBlock code={linkingMaterialExample} />

			<p>
				In order to restrict the type of supported material, a configuration object can be passed to the decorator. By default, all materials are allowed. Example to
				restrict to PBR material:
			</p>

			<CodeBlock code={linkingRestrictedMaterialExample} />

			<DocHeading level={2}>GUI files</DocHeading>

			<p>
				As well as JSON files, when a property is decorated with <b>@visibleAsAsset</b>, this property will be linked to the provided asset with extension <b>.gui</b> in
				the editor's inspector. The GUI file is automatically parsed and properties can be accessed directly.
			</p>

			<CodeBlock code={linkingGuiExample} />
		</DocPage>
	);
}
