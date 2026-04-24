import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpeakPal - 英会話練習アプリ",
  description: "AIパートナーと英会話を練習しよう",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
