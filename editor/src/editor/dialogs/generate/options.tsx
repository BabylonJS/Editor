import { Label } from "../../../ui/shadcn/ui/label";
import { Checkbox } from "../../../ui/shadcn/ui/checkbox";
import { Field, FieldGroup } from "../../../ui/shadcn/ui/field";

import { IEditorGenerateOptions } from "./generate-project";

export interface IEditorGenerateProjectOptionsComponentProps {
	options: IEditorGenerateOptions;
}

export function EditorGenerateOptionsComponent(props: IEditorGenerateProjectOptionsComponentProps) {
	return (
		<div className="flex flex-col">
			<FieldGroup className="max-w-sm">
				<Field orientation="horizontal">
					<Checkbox
						id="optimize-checkbox"
						name="optimize-checkbox"
						defaultChecked={props.options.optimize}
						onCheckedChange={(v) => (props.options.optimize = Boolean(v))}
					/>
					<Label htmlFor="optimize-checkbox">Optimize assets</Label>
				</Field>

				<Field orientation="horizontal">
					<Checkbox
						id="upload-s3-checkbox"
						name="upload-s3-checkbox"
						defaultChecked={props.options.uploadToS3}
						onCheckedChange={(v) => (props.options.uploadToS3 = Boolean(v))}
					/>
					<Label htmlFor="upload-s3-checkbox">Upload to S3</Label>
				</Field>
			</FieldGroup>
		</div>
	);
}
