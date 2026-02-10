import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Battle Royale",
  description: "100 AI agents. One world. You decide who survives.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: "'Space Grotesk', sans-serif",
        background: "#08080e",
        color: "#e0e0e0",
        minHeight: "100vh",
      }}>
        {children}
      </body>
    </html>
  );
}
