import "@repo/tailwind-config/globals.css";

import type { Metadata } from "next";
import { ThemeScript } from "next-app-theme/theme-script";
import { Inter } from "next/font/google";
import localFont from 'next/font/local'


const inter = Inter({ subsets: ["latin"] });

const serverMono = localFont({
  src: '../public/fonts/ServerMono-Regular.woff2',
  variable: '--font-server-mono',
})

export const metadata: Metadata = {
	title: "Is It Chill Tonight?",
	description: "What NYC clubs are chill tonight? ",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	return (
		<html lang="en">
			<head>
				{/* Cloudflare analytics */}
			<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "b70669a47b1a489f9378f72b8173cbd5"}'></script>
				<ThemeScript />
			</head>
			<body className={`${serverMono.variable} font-sans`}>{children}</body>
		</html>
	);
}
