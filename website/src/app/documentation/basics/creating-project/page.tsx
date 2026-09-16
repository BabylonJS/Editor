"use client";

import { DocPage, DocHeading, DocImage, Callout } from "../../components";

export default function DocumentationCreatingProjectPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Dashboard</DocHeading>

			<p>
				When opening the Babylon.js Editor application, the first window that appears is the dashboard. The dashboard is where you create, open, and manage your projects.
				By default, the dashboard is empty until your first project is registered.
			</p>

			<DocImage src="/documentation/basics/creating-project/dashboard.png" alt="Babylon.js Editor Dashboard" />

			<div className="flex flex-col gap-2">
				<p>From the dashboard, you have two options:</p>
				<ul className="list-disc pl-6 space-y-1">
					<li>
						Click the <b>Create project</b> button to generate a new workspace.
					</li>
					<li>
						Click <b>Import project</b> to register an already existing project on your machine.
					</li>
				</ul>
			</div>

			<DocHeading level={2}>Create project</DocHeading>

			<DocHeading level={3}>Selecting destination</DocHeading>

			<p>
				When creating a new project, the dashboard asks for a target folder. Click <b>Browse...</b> and select an <b>empty</b> folder on your disk.
			</p>

			<DocHeading level={3}>Choosing package manager</DocHeading>

			<p>The editor automatically installs dependencies for the newly created project using your preferred package manager. You can select:</p>

			<ul className="list-disc pl-6 space-y-1">
				<li>
					<b>npm</b>: Comes pre-installed with Node.js. Stable, reliable, and widely supported.
				</li>
				<li>
					<b>yarn</b>: A popular alternative to npm known for speed and reliability.
				</li>
				<li>
					<b>pnpm</b>: Uses a content-addressable store to save disk space and speed up installations. Strict and deterministic.
				</li>
				<li>
					<b>bun</b>: Uses the fast Bun runtime and package manager.
				</li>
			</ul>

			<DocHeading level={3}>Choosing template</DocHeading>

			<p>The editor provides several preconfigured templates to get started quickly:</p>

			<ul className="list-disc pl-6 space-y-1">
				<li>
					<b>Next.js</b>: Minimal template preconfigured to use Next.js with React.
				</li>
				<li>
					<b>SolidJS</b>: Minimal template preconfigured with SolidJS.
				</li>
				<li>
					<b>Vanilla</b>: Basic template suitable for custom web setups.
				</li>
				<li>
					<b>Electron</b>: Minimal template preconfigured for desktop apps using Electron.
				</li>
			</ul>

			<DocImage src="/documentation/basics/creating-project/creating-project.png" alt="Creating a new project dialog" />

			<p>
				Once configured, click <b>Create</b> and your new project will appear in the dashboard.
			</p>

			<DocImage src="/documentation/basics/creating-project/project-created.png" alt="New project in dashboard" />

			<DocHeading level={2}>Opening and Editing</DocHeading>

			<p>To open and edit your project, double-click on its card in the dashboard.</p>

			<DocImage src="/documentation/basics/creating-project/project-opened.png" alt="Project opened in Babylon.js Editor" />

			<Callout type="info" title="Automatic Dependency Updates">
				Each time a project is opened, the editor checks and updates dependencies using your selected package manager. This ensures all editor runtime tools and per-project
				plugins are up-to-date and compatible.
			</Callout>

			<DocHeading level={2}>Import project</DocHeading>

			<p>
				If you already have a Babylon.js Editor project created previously or on another machine, click <b>Import project</b>. Locate your project folder, select the{" "}
				<b>.bjseditor</b> file, and click <b>Open</b>.
			</p>

			<DocImage src="/documentation/basics/creating-project/import-project-browse.png" alt="Importing an existing project" />
		</DocPage>
	);
}
