import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { siteDescription, siteName, siteUrl } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: "Babylon.js Editor: Open-Source 3D Web Game & Scene Editor",
		template: `%s | ${siteName}`,
	},
	description: siteDescription,
	alternates: {
		// Relative to the route being rendered: each page gets its own canonical URL.
		canonical: "./",
	},
	openGraph: {
		type: "website",
		siteName,
		locale: "en_US",
		url: "./",
	},
	twitter: {
		card: "summary_large_image",
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={`${inter.className} w-screen h-screen overflow-x-hidden antialiased bg-black`}>{children}</body>
		</html>
	);
}
