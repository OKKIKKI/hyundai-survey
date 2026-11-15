import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OKIKI · 같은 차, 다른 이야기",
  description: "차량 이용 경험과 새로운 차량용 앱에 관한 이야기",
  icons: {
    icon: "/favicon.svg?v=3",
    shortcut: "/favicon.svg?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
