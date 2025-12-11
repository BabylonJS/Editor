import { Component, ReactNode } from "react";

import { toast } from "sonner";

import { FaCopy } from "react-icons/fa";
import { IoAddSharp, IoCloseOutline } from "react-icons/io5";

import { Skeleton } from "babylonjs";

import { showPrompt } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Separator } from "../../../../ui/shadcn/ui/separator";

import { isSkeleton } from "../../../../tools/guards/nodes";

import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

export class EditorSkeletonInspector extends Component<IEditorInspectorImplementationProps<Skeleton>> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: any): boolean {
		return isSkeleton(object);
	}

	public render(): ReactNode {
		return (
			<EditorInspectorSectionField title="Skeleton">
				<EditorInspectorSwitchField label="Need Initial Skin Matrix" object={this.props.object} property="needInitialSkinMatrix" />

				<Separator />

				<div className="px-[10px] text-lg text-center">Animation Ranges</div>

				{this.props.object
					.getAnimationRanges()
					.filter((range) => range)
					.map((range, index) => (
						<div key={index} className="flex items-center gap-[10px]">
							<Button
								variant="ghost"
								className="justify-start w-1/2"
								onDoubleClick={async () => {
									const name = await showPrompt("Rename Animation Range", "Enter the new name for the animation range", range!.name);
									if (name) {
										range!.name = name;
										this.forceUpdate();
									}
								}}
								onClick={() => {
									this.props.object.getScene().stopAnimation(this.props.object);
									this.props.object?.beginAnimation(range!.name, true, 1.0);
								}}
							>
								{range!.name}
							</Button>

							<div className="flex items-center w-1/2">
								<EditorInspectorNumberField
									object={range}
									property="from"
									onChange={() => {
										this.props.editor.layout.preview.scene.stopAnimation(this.props.object);
										this.props.editor.layout.preview.scene.beginAnimation(this.props.object, range!.from, range!.from, true, 1.0);
									}}
								/>
								<EditorInspectorNumberField
									object={range}
									property="to"
									onChange={() => {
										this.props.editor.layout.preview.scene.stopAnimation(this.props.object);
										this.props.editor.layout.preview.scene.beginAnimation(this.props.object, range!.to, range!.to, true, 1.0);
									}}
								/>

								<Button
									variant="ghost"
									className="p-2"
									onClick={() => {
										try {
											navigator.clipboard.writeText(range!.name);
											toast.success("Animation range name copied to clipboard");
										} catch (e) {
											toast.error("Failed to copy animation range name");
										}
									}}
								>
									<FaCopy />
								</Button>

								<Button
									variant="secondary"
									className="p-2"
									onClick={() => {
										this.props.object.deleteAnimationRange(range!.name, false);
										this.forceUpdate();
									}}
								>
									<IoCloseOutline className="w-4 h-4" />
								</Button>
							</div>
						</div>
					))}

				<Button
					variant="secondary"
					className="flex items-center gap-[5px] w-full"
					onClick={async () => {
						const name = await showPrompt("Add Animation Range", "Enter the name of the new animation range");
						if (name) {
							this.props.object.createAnimationRange(name, 0, 100);
							this.forceUpdate();
						}
					}}
				>
					<IoAddSharp className="w-6 h-6" /> Add
				</Button>
			</EditorInspectorSectionField>
		);
	}
}
