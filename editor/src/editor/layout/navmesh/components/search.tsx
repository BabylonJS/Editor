import { FaMagnifyingGlass } from "react-icons/fa6";

import { Input } from "../../../../ui/shadcn/ui/input";

export interface INavMeshEditorSearchComponentProps {
	search: string;
	setSearch: (value: string) => void;
}

export function NavMeshEditorSearchComponent(props: INavMeshEditorSearchComponentProps) {
	return (
		<div className="relative">
			<Input
				placeholder="Search"
				value={props.search}
				onChange={(e) => props.setSearch(e.currentTarget.value)}
				className={`
                    max-w-44 w-full h-8 pl-7
                    border-border/35 focus:border-border
                    transition-all duration-300 ease-in-out    
                `}
			/>

			<FaMagnifyingGlass className="absolute top-1/2 -translate-y-1/2 left-2 w-4 h-4" />
		</div>
	);
}
