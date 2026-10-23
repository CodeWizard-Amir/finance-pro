import { Vazirmatn } from "next/font/google";
import "./globals.css";
import SwRegister from "./sw-register";

const vazir = Vazirmatn({ subsets: ["arabic", "latin"], display: "swap" });

export const metadata = {
  title: "مدیریت مالی من",
  description: "داشبورد مدیریت درآمد و هزینه",
  applicationName: "مالی من",
  appleWebApp: { capable: true, title: "مالی من", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport = { themeColor: "#0b1020", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={vazir.className}>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
