import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["600"], variable: "--font-serif4", display: "swap" });

export const metadata: Metadata = {
  title: { default: "NariAutos · Concesionaria y taller", template: "%s · NariAutos" },
  description: "Unidades 0 km y usadas, turnos de taller y post-venta en toda la red NariAutos.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1f3a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${serif.variable}`}>
      <body className="min-h-dvh">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Ir al contenido</a>
        {children}
      </body>
    </html>
  );
}
