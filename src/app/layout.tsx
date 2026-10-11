import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "User Management Chatbot",
  description:
    "An intelligent chatbot for adding, updating and removing user records.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}