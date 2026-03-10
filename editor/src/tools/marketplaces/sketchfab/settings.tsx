import {} from "react";
import { ISketchfabSettings } from "../sketchfab";
import { Button } from "../../../ui/shadcn/ui/button";

interface ISketchfabProviderSettingsProps {
	onSettingChanged: (key: string, value: string) => void;
	settings: ISketchfabSettings;
	handleOAuthLogin: () => void;
}

export const SketchfabProviderSettings = ({ onSettingChanged, handleOAuthLogin, settings }: ISketchfabProviderSettingsProps) => {
	const isConfigured = !!process.env.SKETCHFAB_CLIENT_ID;

	const handleSettingChange = (id: string, value: string) => {
		onSettingChanged(id, value);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<p className="text-sm font-medium">Authentication</p>
				{!settings.token ? (
					<div className="flex flex-col gap-2">
						<Button onClick={() => handleOAuthLogin()} disabled={!isConfigured}>
							Login with Sketchfab
						</Button>
						{!isConfigured && <p className="text-xs text-destructive">Missing `SKETCHFAB_CLIENT_ID` configuration.</p>}
					</div>
				) : (
					<div className="flex items-center justify-between p-2 bg-muted rounded-md">
						<span className="text-xs font-medium text-green-500">Logged In</span>
						<Button size="sm" variant="outline" onClick={() => handleSettingChange("token", "")}>
							Logout
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
