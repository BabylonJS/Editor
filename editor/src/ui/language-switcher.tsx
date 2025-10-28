import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./shadcn/ui/select";

const languages = [
	{ code: "en", name: "English" },
	{ code: "fr", name: "Français" },
	{ code: "ja", name: "日本語" },
	{ code: "zh", name: "中文" },
];

export interface ILanguageSwitcherProps {
	/**
	 * Optional className for styling
	 */
	className?: string;
}

/**
 * Language switcher component that allows users to change the application language.
 */
export function LanguageSwitcher(props: ILanguageSwitcherProps) {
	const { i18n } = useTranslation();
	const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

	const handleLanguageChange = (language: string) => {
		i18n.changeLanguage(language);
		setCurrentLanguage(language);
	};

	return (
		<Select value={currentLanguage} onValueChange={handleLanguageChange}>
			<SelectTrigger className={props.className}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{languages.map((lang) => (
					<SelectItem key={lang.code} value={lang.code}>
						{lang.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
