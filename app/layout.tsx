import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIまとめムービー作成ツール",
  description: "写真・動画からイベント用のまとめムービーを作成します。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
