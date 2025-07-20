export interface IStatRowProps {
	label: string;
	value?: number;
}

export function StatRow(props: IStatRowProps) {
	return (
		<div className="flex justify-between items-center w-full">
			<div className="font-normal">{props.label}</div>
			<div>{props.value?.toFixed(0)}</div>
		</div>
	);
}
