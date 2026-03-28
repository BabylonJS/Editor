import { FaCheck } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";

import { Label } from "../../../ui/shadcn/ui/label";
import { Button } from "../../../ui/shadcn/ui/button";

import { ISketchfabSettings } from "../sketchfab";

interface ISketchfabProviderSettingsProps {
	settings: ISketchfabSettings;
	handleOAuthLogin: () => void;
	onSettingChanged: (key: string, value: string) => void;
}

export function SketchfabProviderSettings(props: ISketchfabProviderSettingsProps) {
	return (
		<div className="flex flex-col gap-2">
			<Label>Authentication</Label>

			{!props.settings.token && (
				<div className="flex items-center justify-between p-2 bg-muted rounded-lg">
					<span className="flex items-center gap-2">
						<IoClose className="w-6 h-6 fill-red-500" /> Not logged in
					</span>
					<Button variant="outline" onClick={() => props.handleOAuthLogin()}>
						Login with Sketchfab
					</Button>
				</div>
			)}

			{props.settings.token && (
				<div className="flex items-center justify-between p-2 bg-muted rounded-lg">
					<span className="flex items-center gap-2">
						<FaCheck className="w-6 h-6 fill-green-500" /> Logged in
					</span>
					<Button variant="outline" onClick={() => props.onSettingChanged("token", "")}>
						Logout
					</Button>
				</div>
			)}
		</div>
	);
}
