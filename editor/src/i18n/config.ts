import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";
import zh from "./locales/zh.json";

export const resources = {
	en: { translation: en },
	fr: { translation: fr },
	ja: { translation: ja },
	zh: { translation: zh },
} as const;

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: "en",
		lng: localStorage.getItem("editor-language") || "en",
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ["localStorage", "navigator"],
			caches: ["localStorage"],
			lookupLocalStorage: "editor-language",
		},
	});

// Save language preference on change
i18n.on("languageChanged", (lng) => {
	localStorage.setItem("editor-language", lng);
});

export default i18n;
