import { ReactNode } from "react";

export interface ITerrainFieldsRowProps {
	/** Label shared by the fields of the row. */
	label: ReactNode;
	/** The two fields of the row, created without label. */
	children: ReactNode;
}

/**
 * Two fields on one line under a single label, like the components of EditorInspectorVectorField: sizes, X / Z pairs and min / max ranges.
 * The label and the fields take the columns of a labelled field (1/3, 2/3), so the row stays aligned with the fields around it (the fields
 * lose their own horizontal padding for that).
 */
export function TerrainFieldsRow(props: ITerrainFieldsRowProps): JSX.Element {
	return (
		<div className="flex gap-2 items-center px-2">
			<div className="w-1/3 text-ellipsis overflow-hidden whitespace-nowrap">{props.label}</div>
			<div className="grid grid-cols-2 gap-2 w-2/3 [&>div]:px-0">{props.children}</div>
		</div>
	);
}
