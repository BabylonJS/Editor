import { FaCheckCircle } from "react-icons/fa";

export function EditorGenerateCompleteComponent() {
	return (
		<div className="flex flex-col gap-[20px] justify-center items-center">
			<FaCheckCircle className="w-20 h-20 fill-green-900" />

			<div className="flex flex-col justify-center items-center">
				<div className="text-3xl font-semibold">Completed</div>
				<div>The project has been successfully generated.</div>
			</div>
		</div>
	);
}
