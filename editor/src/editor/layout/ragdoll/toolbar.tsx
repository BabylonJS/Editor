import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "../../../ui/shadcn/ui/menubar";

import { RagdollEditor } from "./editor";

export interface INavMeshEditorToolbarProps {
	ragdollEditor: RagdollEditor;
}

export function RagdollEditorToolbar(props: INavMeshEditorToolbarProps) {
	return (
		<div className="relative flex justify-between items-center w-full h-10 bg-primary-foreground">
			<Menubar className="border-none rounded-none pl-3 my-auto bg-primary-foreground h-10">
				{/* File */}
				<MenubarMenu>
					<MenubarTrigger>File</MenubarTrigger>

					<MenubarContent className="border-black/50">
						<MenubarItem onClick={() => props.ragdollEditor.save()}>Save</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
		</div>
	);
}
