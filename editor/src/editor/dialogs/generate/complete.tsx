import { MdCancel } from "react-icons/md";
import { FaCheckCircle } from "react-icons/fa";

import { CancellationToken } from "babylonjs-editor-cli";

export interface IEditorGenerateCompleteComponentProps {
	cancellationToken: CancellationToken | null;
}

export function EditorGenerateCompleteComponent(props: IEditorGenerateCompleteComponentProps) {
	return (
		<div className="flex flex-col gap-[20px] justify-center items-center">
			{props.cancellationToken?.isCanceled && <MdCancel className="w-20 h-20" />}
			{!props.cancellationToken?.isCanceled && <FaCheckCircle className="w-20 h-20 fill-green-900" />}

			<div className="flex flex-col justify-center items-center">
				<div className="text-3xl font-semibold">{props.cancellationToken?.isCanceled ? "Canceled" : "Completed"}</div>
				<div>{props.cancellationToken?.isCanceled ? "The project generation was canceled." : "The project has been successfully generated."}</div>
			</div>
		</div>
	);
}
