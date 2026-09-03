"use client";

import { CodeBlock, CustomLink, DocPage, DocHeading, DocVideo } from "../../components";

import { ciExample, installing, pack, packageJson } from "./scripts";

export default function UsingBabylonJSEditorCLIPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				The Babylon.js Editor provides a package named <b>babylonjs-editor-cli</b> that can be installed as a dependency of a project. This package provides a command line
				interface (CLI) to generate all necessary assets and files in the <b>public/scene</b> folder without having to open the editor application.
				<br />
				In other words, it allows you to generate all necessary assets in your own <b>CI/CD pipeline</b>.
			</p>

			<p>
				The package is available on NPM <CustomLink href="https://www.npmjs.com/package/babylonjs-editor-cli">here</CustomLink>.
			</p>

			<div className="flex flex-col gap-2">
				<p>The goal of this CLI is to:</p>

				<ul className="list-disc pl-6 space-y-1">
					<li>
						generate all <b>.babylon</b> scenes.
					</li>
					<li>generate all necessary assets including down-scaled and compressed textures.</li>
					<li>collect all scripts attached to entities in order to bundle them properly.</li>
				</ul>
			</div>

			<DocHeading level={2}>Installing babylonjs-editor-cli</DocHeading>

			<p>
				Starting from Babylon.js Editor <b>v5.3.0</b>, the babylonjs-editor-cli package is included as a dependency of newly generated projects. Therefore, if you have
				created your project with a previous version of the editor, you will need to install it manually:
			</p>

			<CodeBlock language="bash" code={installing} />

			<p>
				Then, in your <b>package.json</b>, you can add a script to easily run the CLI:
			</p>

			<CodeBlock language="bash" code={packageJson} />

			<DocHeading level={2}>Packing project</DocHeading>

			<p>
				The babylonjs-editor-cli package provides a command named <b>pack</b> that will generate all necessary assets and files in the <b>public/scene</b> folder of your
				project.
				<br />
				To run the command, simply use:
			</p>

			<CodeBlock language="bash" code={pack} />

			<p>A cache is automatically saved locally in order to speed up the packing process on subsequent runs.</p>

			<DocVideo src="/documentation/deploying/babylonjs-editor-cli/running.mp4" />

			<p>
				The pack command will also collect all scripts attached to entities in order to bundle them properly.
				<br />
				It is <b>IMPORTANT</b> to pack the project before building it so that all scripts (<i>located at src/scripts.ts</i>) are properly bundled.
			</p>

			<p>Here is a simple example on how the CI/CD pipeline could look like:</p>

			<CodeBlock language="bash" code={ciExample} />
		</DocPage>
	);
}
