import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/landing-globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} landing-theme font-sans antialiased`}>
      {children}
    </div>
  );
}
