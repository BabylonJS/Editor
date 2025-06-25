import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Babylon.JS Editor",
	description: "Focus more on creating and less on coding.",
};

export default function RootLayout({
	children,
}: {
    children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={`${inter.className} w-screen h-screen overflow-x-hidden antialiased bg-black`}>
				{children}
			</body>
		</html>
	);
}
