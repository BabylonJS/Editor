import { useEffect } from "react";

export function FabRootComponent() {
	useEffect(() => {
		return () => {};
	}, []);

	return (
		<div className="flex flex-col w-full h-full">
			<div>Hello 1</div>
			<div>Hello 2</div>
		</div>
	);
}
