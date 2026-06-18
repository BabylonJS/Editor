import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "../../../ui/shadcn/ui/menubar";

import { NavMeshEditor } from "./editor";

export interface INavMeshEditorToolbarProps {
	navMeshEditor: NavMeshEditor;
}

export function NavMeshEditorToolbar(props: INavMeshEditorToolbarProps) {
	return (
		<div className="relative flex justify-between items-center w-full h-10 bg-primary-foreground">
			<Menubar className="border-none rounded-none pl-3 my-auto bg-primary-foreground h-10">
				{/* File */}
				<MenubarMenu>
					<MenubarTrigger>File</MenubarTrigger>

					<MenubarContent className="border-black/50">
						<MenubarItem onClick={() => props.navMeshEditor.save()}>Save</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				{/* Edit */}
				<MenubarMenu>
					<MenubarTrigger>Edit</MenubarTrigger>

					<MenubarContent className="border-black/50">
						<MenubarItem onClick={() => props.navMeshEditor.updateNavMesh()}>Update NavMesh</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
		</div>
	);
}
