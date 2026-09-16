"use client";

import { IoPlay, IoRefresh, IoStop } from "react-icons/io5";

import { DocPage, DocHeading, DocVideo } from "../../components";

export default function DocumentationRunningProjectPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				Projects can be played directly from the editor. A project can be composed of multiple scenes and some scripts may be attached to objects in the scene(s). There are
				2 options:
			</p>

			<ul className="list-disc pl-6 space-y-1">
				<li>
					<b>play the current scene</b>: all the scripts are compiled on the fly and executed in the current scene that is displayed in the editor, sharing the same
					resources (textures, etc.). This is the default behavior of the editor.
				</li>
				<li>
					<b>play the project as-is</b>: consists on running the <b>dev</b> command using the project's selected package manager (npm, yarn, bun or pnpm).
				</li>
			</ul>

			<DocHeading level={2}>Playing the current scene</DocHeading>

			<p>
				To start the current scene, just click the start button <IoPlay className="w-6 h-6" strokeWidth={1} color="green" /> located in the toolbar of the editor's preview
				panel.
			</p>

			<p>
				Each time the current scene is played, the editor will update the assets located in the <b>public</b> folder of the project. If new assets were added to the project
				(especially images), this can take a few seconds to generate all new necessary files before the project can be played.
			</p>

			<p>Note that when playing, all the scripts are watched for changes and will be reloaded automatically when modified until the "play" mode is stopped.</p>

			<DocHeading level={2}>Stopping the current scene</DocHeading>

			<p>
				To stop the current scene being played and get back to the edit mode, just click the stop button <IoStop className="w-6 h-6" strokeWidth={1} color="red" /> located
				in the toolbar of the editor's preview panel.
			</p>

			<DocHeading level={2}>Refreshing the current scene</DocHeading>

			<p>
				Sometimes, it's useful to refresh the scene that is being played instead of stopping it and starting it again. This allows to bypass the export process or the
				editor. Just click the refresh button <IoRefresh className="w-6 h-6" strokeWidth={1} /> located in the toolbar of the editor's preview panel.
			</p>

			<DocVideo src="/documentation/basics/running-project/running-project.mp4" />
		</DocPage>
	);
}
