import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Echo Self",
  description: "Your digital reflection — talk to yourself, remember yourself.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 ml-0 md:ml-56">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
