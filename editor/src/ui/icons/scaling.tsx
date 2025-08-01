import { IIconProps } from "./props";

export function ScalingIcon(props: IIconProps) {
	return (
		<svg width={props.size ?? props.width} height={props.size ?? props.height} viewBox="0 0 256 512" className="fill-foreground" xmlns="http://www.w3.org/2000/svg">
			<path
				fill={props.color}
				d="M214.059 377.941H168V134.059h46.059c21.382 0 32.09-25.851 16.971-40.971L144.971 7.029c-9.373-9.373-24.568-9.373-33.941 0L24.971 93.088c-15.119 15.119-4.411 40.971 16.971 40.971H88v243.882H41.941c-21.382 0-32.09 25.851-16.971 40.971l86.059 86.059c9.373 9.373 24.568 9.373 33.941 0l86.059-86.059c15.12-15.119 4.412-40.971-16.97-40.971z"
			/>
		</svg>
	);
}
