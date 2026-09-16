"use client";

import { Callout, CodeBlock, CustomLink, DocPage, DocHeading } from "../../components";

import { cliPack, enableKtx2 } from "./scripts";

export default function DocumentationCompressingTexturesPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				Compressed textures are used to reduce the size in video memory without sacrificing quality. Compressing textures can be done automatically when exporting the
				project but can require time to compute depending on the number of textures and their size.
			</p>

			<p>
				Compressed textures are not necessarily less heavy in terms of file size but are optimized for GPU usage. Therefore, they can significantly reduce the{" "}
				<b>memory usage</b> and also increase the performance of your game in terms of rendering speed by reducing the internal bandwidth transfers.
			</p>

			<div className="flex flex-col gap-2">
				<p>To compress textures using Babylon.js Editor, 2 methods are available:</p>

				<ul className="list-disc pl-6 space-y-2">
					<li>
						<b>PVRTexTool</b>: a command-line tool provided by{" "}
						<CustomLink href="https://developer.imaginationtech.com/solutions/pvrtextool/">Imagination Technologies</CustomLink> used to generate one <b>.ktx</b>{" "}
						texture file per format (ASCT, DXT, ETC1, ETC2 and PVRTC).
					</li>
					<li>
						<b>KTX-Software</b>: an open-source texture compression CLI provided by the <CustomLink href="https://www.khronos.org/ktx/">Khronos Group</CustomLink> that
						supports the <b>KTX 2.0</b> container. Compared to PVRTexTool which generates one KTX file per format, KTX-Software is capable of creating a unique KTX 2.0
						file per texture that is supported on all platforms which makes the compression process much faster and less storage consuming.
					</li>
				</ul>
			</div>

			<DocHeading level={2}>Installing KTX-Software</DocHeading>

			<p>
				KTX-Software can be downloaded from <CustomLink href="https://github.com/KhronosGroup/KTX-Software/releases">their release page on GitHub</CustomLink>. Only
				versions 4.x are supported. Download the appropriate package according to your current operating system (Windows, Linux or MacOS) and install it on your machine.
			</p>

			<Callout type="warning" title="Add to PATH">
				The KTX-Software installer may ask to install the command in <b>PATH</b>. This option must be enabled so the Babylon.js Editor can use the command.
			</Callout>

			<p>Once installed, a new command is available on your system. To verify and try it, open a terminal and type the following command:</p>

			<CodeBlock language="bash" code="ktx --help" />

			<DocHeading level={2}>Enabling KTX-Software in your project</DocHeading>

			<p>
				Compressing textures in the Babylon.js Editor can be enabled by opening the project's configuration. To access the project's settings, simply use the main toolbar{" "}
				<b>Edit {"->"} Project</b>. In the <b>Editor</b> tab of the project's settings and under the <b>Textures</b> section, 3 options are available for compressing
				textures:
			</p>

			<DocHeading level={3}>Enabled</DocHeading>

			<p>
				Sets whether or not compressing textures is enabled when exporting the project. By default, this option is not enabled. When using Babylon.js Editor CLI, this
				option will also be used to determine if textures should be compressed during the generation process.
			</p>

			<DocHeading level={3}>Enabled in preview</DocHeading>

			<p>
				Sets whether or not textures used in the editor are also compressed. By default, this option is disabled. Using KTX allows to load textures faster. Enabling this
				feature will make the used textures in each scene being compressed and stored in the temporary directory <b>.bjseditor</b> available in the root folder of the
				project and scenes will load way faster than using original .png, .jpg, etc. textures.
			</p>

			<p>
				Compressing temporary textures for the editor is done on the fly and will not affect the original texture files. To not overload the editor's process on your
				computer, textures are compressed <b>one by one</b> (not parallelized) and quality is set to <b>Very fast</b>.
			</p>

			<DocHeading level={3}>Quality</DocHeading>

			<p>
				The quality of the compression can be set to either <b>Very fast</b>, <b>Fast</b>, <b>Normal</b> or <b>High</b>. The higher the quality, the longer the compression
				process will take but the better the result will be. By default, the quality is set to <b>Very fast</b>.
			</p>

			<DocHeading level={2}>Using Babylon.js Editor CLI</DocHeading>

			<p>
				When packing the assets of your project using the Babylon.js Editor CLI, textures will be automatically compressed if the option is enabled in the project
				configuration. If not, only the original textures (.png, .jpg, etc.) will be packed without compression.
			</p>

			<CodeBlock language="bash" code={cliPack} />

			<DocHeading level={2}>Enabling KTX2 in your game</DocHeading>

			<p>
				In your project, scenes are being loaded using the <b>loadScene</b> method from the <b>babylonjs-editor-tools</b> package. It is important to notify the package
				that KTX2 compressed textures should be used when loading the scene. To do so, simply call the following method before loading the scene:
			</p>

			<CodeBlock language="typescript" code={enableKtx2} />
		</DocPage>
	);
}
