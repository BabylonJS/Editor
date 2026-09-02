"use client";

import { Callout, CustomLink, DocPage, DocHeading } from "./components";

export default function DocumentationPage() {
	return (
		<DocPage title="Babylon.js Editor documentation">
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				Babylon.js Editor is a visual editor for Babylon.js. It allows you to create and edit scenes, materials, attach scripts and more.
				<br />
				The Babylon.js Editor is available on <b>Windows</b>, <b>macOS</b>, and <b>Linux</b> platforms.
			</p>

			<p>
				The goal is to provide a simple and easy-to-use interface for creating and editing Babylon.js applications such as video games. It includes a large variety of
				optimization tools, such as compressed textures generation, LOD collisions and more.
			</p>

			<p>
				The Babylon.js Editor is free and open-source. You can find the source code on{" "}
				<b>
					<CustomLink href="https://github.com/BabylonJS/Editor">GitHub</CustomLink>
				</b>
				.
			</p>

			<DocHeading level={2}>Prerequisites</DocHeading>

			<p>
				<CustomLink href="https://nodejs.org">Node.js</CustomLink> must be installed on your computer. It is recommended to have an LTS version <b>{">="} 20</b>.
			</p>

			<Callout type="tip" title="Recommended knowledge">
				By default, projects are based on <b>Next.js</b>. It is highly recommended to have a basic understanding of <CustomLink href="https://react.dev/">React</CustomLink>{" "}
				and <CustomLink href="https://nextjs.org">Next.js</CustomLink> before starting.
				<br />
				Of course, also a basic understanding of the <CustomLink href="https://babylonjs.com/">Babylon.js</CustomLink> engine, the most powerful, beautiful, simple, and
				open web rendering engine in the world.
			</Callout>
		</DocPage>
	);
}
