import { useTranslation } from "react-i18next";

/**
 * Custom hook to get the translation function.
 * This is a wrapper around react-i18next's useTranslation hook.
 */
export function useEditorTranslation() {
	const { t, i18n } = useTranslation();

	return {
		t,
		i18n,
		changeLanguage: (lng: string) => i18n.changeLanguage(lng),
		currentLanguage: i18n.language,
	};
}
