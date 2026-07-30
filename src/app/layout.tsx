import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homie English",
  description: "Collect, understand, remember, and use English vocabulary.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
