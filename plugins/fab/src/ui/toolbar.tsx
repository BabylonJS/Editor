import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "babylonjs-editor";

import { FabRoot } from "./root";

export interface IFabToolbarProps {
	root: FabRoot;
}

export function FabToolbar(props: IFabToolbarProps) {
	return (
		<div className="relative flex justify-between items-center w-full h-10 bg-primary-foreground">
			<Menubar className="border-none rounded-none pl-3 my-auto bg-primary-foreground h-10">
				{/* File */}
				<MenubarMenu>
					<MenubarTrigger>File</MenubarTrigger>

					<MenubarContent className="border-black/50">
						<MenubarItem onClick={() => props.root.refresh()}>Refresh</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				{/* Edit */}
				<MenubarMenu>
					<MenubarTrigger>Edit</MenubarTrigger>

					<MenubarContent className="border-black/50">
						<MenubarItem onClick={() => {}}>Update NavMesh</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
		</div>
	);
}
