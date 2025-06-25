import { defineConfig } from "eslint/config";
import typeScriptParser from "@typescript-eslint/parser";

export default defineConfig([
    {
        files: [
            "**/src/**/*.{ts,tsx}",
        ],
        ignores: [
            "./editor/src/ui/shadcn/**/*.{ts,tsx}",
        ],
        languageOptions: {
            ecmaVersion: "latest",
            parser: typeScriptParser,
        },
        rules: {
            "semi": ["error", "always"],
            "indent": ["error", "tab"],
        },
    }
]);
