"use client";

import { Kbd } from "@/components/ui/kbd";

import { DocPage, DocHeading } from "../../components";

export default function DocumentationShortcutsPage() {
	return (
		<DocPage>
			<DocHeading level={2}>In Editor</DocHeading>

			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<div>
						<Kbd>⌘Q</Kbd> or <Kbd>CTRL+Q</Kbd>: Quit application.
					</div>
					<div>
						<Kbd>⌘,</Kbd> (macOS only): Open editor's preferences.
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<div>
						<Kbd>⌘C</Kbd> or <Kbd>CTRL+C</Kbd>: Copy selected text / selected object.
					</div>
					<div>
						<Kbd>⌘V</Kbd> or <Kbd>CTRL+V</Kbd>: Paste text / copied object.
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<div>
						<Kbd>⌘S</Kbd> or <Kbd>CTRL+S</Kbd>: Save project.
					</div>
					<div>
						<Kbd>⌘G</Kbd> or <Kbd>CTRL+G</Kbd>: Generate project output (downsized & compressed textures, scripts map, output scene, assets copy, etc.).
					</div>
					<div>
						<Kbd>⌘P</Kbd> or <Kbd>CTRL+P</Kbd>: Open commands dialog.
					</div>
					<div>
						<Kbd>⌘F</Kbd> or <Kbd>CTRL+F</Kbd>: Focus selected object in preview panel.
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<div>
						<Kbd>⌘T</Kbd> or <Kbd>CTRL+T</Kbd>: Select translation gizmo.
					</div>
					<div>
						<Kbd>⌘R</Kbd> or <Kbd>CTRL+R</Kbd>: Select rotation gizmo.
					</div>
					<div>
						<Kbd>⌘D</Kbd> or <Kbd>CTRL+D</Kbd>: Select scaling gizmo.
					</div>
				</div>

				<div>
					<Kbd>⌘B</Kbd> or <Kbd>CTRL+B</Kbd>: Play / Stop scene in preview panel.
				</div>

				<div className="flex flex-col gap-1">
					<div>
						<Kbd>⌘M</Kbd> or <Kbd>CTRL+M</Kbd>: Minimize focused window.
					</div>
					<div>
						<Kbd>⌘W</Kbd> or <Kbd>CTRL+W</Kbd>: Close focused windows.
					</div>
				</div>
			</div>
		</DocPage>
	);
}
