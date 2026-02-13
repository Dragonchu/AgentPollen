import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Battle Royale",
  description: "100 AI agents. One world. You decide who survives.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
