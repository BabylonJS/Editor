import { Oval, OvalProps } from "react-loader-spinner";

export function SpinnerUIComponent(props: OvalProps) {
	return <Oval color="#ffffff" secondaryColor="#444444" {...props} />;
}
