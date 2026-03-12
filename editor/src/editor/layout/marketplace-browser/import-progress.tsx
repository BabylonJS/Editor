import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Grid } from "react-loader-spinner";
import { FaXmark } from "react-icons/fa6";

import { Editor } from "../../main";
import { IMarketplaceAsset } from "../../../tools/marketplaces/types";
import { MarketplaceProvider } from "../../../tools/marketplaces/provider";
import { Button } from "../../../ui/shadcn/ui/button";
import { Progress } from "../../../ui/shadcn/ui/progress";

export interface IImportProgressProps {
	asset: IMarketplaceAsset;
	editor: Editor;
	provider: MarketplaceProvider;
	quality: string;
	type: string;
	onComplete: () => void;
}

export const ImportProgress = (props: IImportProgressProps) => {
	const [progress, setProgress] = useState(0);
	const [speed, setSpeed] = useState(0);
	const [loaded, setLoaded] = useState(0);
	const [total, setTotal] = useState(0);
	const [extracting, setExtracting] = useState(false);

	const formatBytes = (bytes: number) => {
		if (bytes === 0) {
			return "0 B";
		}
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	useEffect(() => {
		const controller = new AbortController();

		const run = async () => {
			try {
				await props.provider.downloadAndImport(
					props.asset,
					props.editor,
					props.quality,
					props.type,
					(data) => {
						setProgress(data.progress);
						setSpeed(data.speed);
						setLoaded(data.loaded);
						setTotal(data.total);
						if (data.extracting) {
							setExtracting(true);
						}
					},
					controller.signal
				);
				props.editor.layout.console.log(`Imported ${props.asset.name} from ${props.provider.title}`);
				toast.success(`Successfully imported ${props.asset.name}`, { id: props.asset.id, duration: 3000 });
			} catch (e) {
				if (e.message === "Download aborted by user.") {
					toast.error(`Import of ${props.asset.name} was cancelled and cleaned up.`, { id: props.asset.id, duration: 3000 });
				} else {
					props.editor.layout.console.error(`Import failed: ${e.message}`);
					toast.error(`Failed to import ${props.asset.name}: ${e.message}`, { id: props.asset.id, duration: 5000 });
				}
			} finally {
				props.onComplete();
			}
		};

		run();

		return () => {
			controller.abort();
		};
	}, []);

	return (
		<div className="flex flex-col gap-3 w-full p-2 py-1">
			<div className="flex justify-between items-start gap-4">
				<div className="flex items-center gap-2 overflow-hidden">
					<div className="shrink-0 opacity-50">
						<Grid height="16" width="16" color="gray" ariaLabel="grid-loading" visible={true} />
					</div>
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="text-sm font-bold truncate leading-tight tracking-tight text-foreground/90">{props.asset.name}</span>
						<span className="text-[9px] uppercase font-black tracking-widest truncate text-muted-foreground">
							{extracting ? "Extracting Asset..." : "Importing Asset"}
						</span>
					</div>
				</div>
				{!extracting && (
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 shrink-0 opacity-20 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all -mr-1 -mt-0.5"
						onClick={() => toast.dismiss(props.asset.id)}
					>
						<FaXmark className="h-5 w-5" />
					</Button>
				)}
			</div>

			{!extracting && (
				<div className="flex flex-col gap-1.5 mt-0.5">
					<div className="flex justify-between items-end gap-4 overflow-hidden">
						<span className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap truncate">
							{formatBytes(loaded)} <span className="opacity-40">/</span> {formatBytes(total)}
						</span>
						<span className="text-[10px] font-mono font-bold text-muted-foreground/70 whitespace-nowrap">
							{formatBytes(speed)}
							<span className="text-[8px] opacity-60 ml-0.5">/s</span>
						</span>
					</div>
					<Progress value={progress} className="h-1 w-full bg-primary/5 overflow-hidden" />
				</div>
			)}
		</div>
	);
};
