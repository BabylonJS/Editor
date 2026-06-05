import { useEffect, useState } from "react";

import { Label } from "../../../ui/shadcn/ui/label";
import { Checkbox } from "../../../ui/shadcn/ui/checkbox";
import { Field, FieldGroup } from "../../../ui/shadcn/ui/field";

import { IEditorGenerateOptions } from "./generate-project";

export interface IEditorGenerateProjectOptionsComponentProps {
	options: IEditorGenerateOptions;
}

export function EditorGenerateOptionsComponent(props: IEditorGenerateProjectOptionsComponentProps) {
	const [optimize, setOptimize] = useState(props.options.optimize);

	const [mergeDecals, setMergeDecals] = useState(props.options.mergeDecals);
	const [mergeGeometries, setMergeGeometries] = useState(props.options.mergeGeometries);

	const [uploadToS3, setUploadToS3] = useState(props.options.uploadToS3);

	useEffect(() => {
		props.options.optimize = optimize;
	}, [optimize]);

	useEffect(() => {
		props.options.mergeDecals = mergeDecals;
	}, [mergeDecals]);

	useEffect(() => {
		props.options.mergeGeometries = mergeGeometries;
	}, [mergeGeometries]);

	useEffect(() => {
		props.options.uploadToS3 = uploadToS3;
	}, [uploadToS3]);

	return (
		<div className="flex flex-col">
			<FieldGroup className="max-w-sm">
				<Field orientation="horizontal">
					<Checkbox id="optimize-checkbox" name="optimize-checkbox" checked={optimize} onCheckedChange={(v) => setOptimize(Boolean(v))} />
					<Label htmlFor="optimize-checkbox">Optimize assets</Label>
				</Field>

				<Field orientation="horizontal" className="items-start">
					<Checkbox id="merge-geometries" name="merge-geometries-checkbox" checked={mergeGeometries} onCheckedChange={(v) => setMergeGeometries(Boolean(v))} />
					<div className="flex flex-col gap-1">
						<Label htmlFor="merge-geometries-checkbox">Merge geometries</Label>
						{mergeGeometries && (
							<div className="text-xs text-muted-foreground">
								Optimize the loading process by merging all geometries into a unique geometry file. Don't use this option if you need incremental loading.
							</div>
						)}
					</div>
				</Field>

				<Field orientation="horizontal" className="items-start">
					<Checkbox id="merge-decals" name="merge-decals-checkbox" checked={mergeDecals} onCheckedChange={(v) => setMergeDecals(Boolean(v))} />
					<div className="flex flex-col gap-1">
						<Label htmlFor="merge-decals-checkbox">Merge decals</Label>
						{mergeDecals && (
							<div className="text-xs text-muted-foreground">Merge all decals that share the same material into a unique geometry to decrease draw calls count.</div>
						)}
					</div>
				</Field>

				<Field orientation="horizontal" className="items-start">
					<Checkbox id="upload-s3-checkbox" name="upload-s3-checkbox" checked={uploadToS3} onCheckedChange={(v) => setUploadToS3(Boolean(v))} />
					<div className="flex flex-col gap-1">
						<Label htmlFor="upload-s3-checkbox">Upload to S3</Label>
						{uploadToS3 && (
							<div className="text-xs text-muted-foreground">
								Make sure to have a .env file configured at root of your project with the necessary AWS / S3-compatible credentials: SPACE_REGION, SPACE_KEY,
								SPACE_SECRET, SPACE_END_POINT and SPACE_ROOT_KEY.
							</div>
						)}
					</div>
				</Field>
			</FieldGroup>
		</div>
	);
}
