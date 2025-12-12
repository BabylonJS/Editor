import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger, Button, AiIcons } from "babylonjs-editor";

import { FabRoot } from "./root";

export interface IFabToolbarProps {
	root: FabRoot;
}

export function FabToolbar(props: IFabToolbarProps) {
	return (
		<div className="relative flex justify-between items-center w-full h-10 bg-primary-foreground">
			<Menubar className="border-none rounded-none pl-3 my-auto bg-primary-foreground h-10">
				{props.root.state.browsedAsset && (
					<Button
						variant="ghost"
						className="flex items-center gap-2 w-fit"
						onClick={() =>
							props.root.setState({
								browsedAsset: null,
							})
						}
					>
						<AiIcons.AiOutlineArrowLeft className="w-6 h-6 dark:text-white" />
						Back
					</Button>
				)}

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
