import { writeJSON } from "fs-extra";

import { toast } from "sonner";

import { IAnimatable } from "babylonjs";

import { saveSingleFileDialog } from "../../../../tools/dialog";

import { showAlert } from "../../../../ui/dialog";

export async function exportAnimationsAs(animatable: IAnimatable | null) {
	const data = animatable?.animations?.map((animation) => {
		return animation.serialize();
	});

	if (!data?.length) {
		return showAlert(
			"No animations to export.",
			"The object has no animation to export. Please add at least one track",
		);
	}

	const destination = saveSingleFileDialog({
		title: "Export Animations",
		filters: [{ name: "Animations", extensions: ["animations"] }],
	});

	if (!destination) {
		return;
	}

	await writeJSON(destination, data, {
		spaces: "\t",
		encoding: "utf8",
	});

	toast("Animations exported successfully.");
}
