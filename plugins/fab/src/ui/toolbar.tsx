import { FaMagnifyingGlass } from "react-icons/fa6";

import { Input, Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "babylonjs-editor";

import { FabRoot } from "./root";

export interface IFabToolbarProps {
	root: FabRoot;

	filter: string;
	onFilterChange: (value: string) => void;
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
				{/* <MenubarMenu>
					<MenubarTrigger>Edit</MenubarTrigger>

					<MenubarContent className="border-black/50">
						<MenubarItem onClick={() => {}}>Something to do</MenubarItem>
					</MenubarContent>
				</MenubarMenu> */}
			</Menubar>

			<div className="relative">
				<Input
					placeholder="Search"
					value={props.filter}
					onChange={(e) => props.onFilterChange(e.currentTarget.value)}
					className={`
						max-w-52 w-full h-8 !border-none pl-7
						hover:border-border focus:border-border
						transition-all duration-300 ease-in-out    
					`}
				/>

				<FaMagnifyingGlass className="absolute top-1/2 -translate-y-1/2 left-2 w-4 h-4" />
			</div>
		</div>
	);
}
