import { Editor } from "../../editor/main";
import { showConfirm } from "../../ui/dialog";
import { Textarea } from "../../ui/shadcn/ui/textarea";
import { aiGenerateMesh } from "./generate";

export async function aiGenerateMeshFromPrompt(editor: Editor) {
	let prompt = "";

	const result = await showConfirm(
		"Generate 3D Model from Prompt",
		<div>
			<Textarea onChange={(e) => (prompt = e.currentTarget.value)} placeholder="Enter your prompt here..." />
		</div>,
		{
			asChild: true,
			confirmText: "Generate",
		}
	);

	if (!result) {
		return;
	}

	aiGenerateMesh(editor, undefined, {
		prompt,
	});
}
