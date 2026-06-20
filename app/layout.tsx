import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import PwaIconSync from "../components/PwaIconSync";
import PwaInstallListener from "../components/PwaInstallListener";
import PwaInstallOverlay from "../components/PwaInstallOverlay";
import QuestCreatorConfirmSheet from "../components/QuestCreatorConfirmSheet";
import PwaSessionBootstrap from "../components/PwaSessionBootstrap";
import SessionGate from "../components/SessionGate";
import { FamilyProvider } from "../components/FamilyProvider";
import { productionDomainFreshStartScript } from "../lib/productionDomainFreshStart";
import {
  THEME_FALLBACK_BG_DARK,
  THEME_FALLBACK_BG_LIGHT,
  THEME_STORAGE_KEY,
} from "../lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LifeXP Family",
  description: "Quests, XP und Belohnungen für die ganze Familie.",
  applicationName: "LifeXP Family",
  appleWebApp: {
    capable: true,
    title: "LifeXP Family",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7b8fa3" },
    { media: "(prefers-color-scheme: dark)", color: "#273449" },
  ],
  interactiveWidget: "resizes-content",
};

const themeInitScript = `
(function () {
  try {
    var k = ${JSON.stringify(THEME_STORAGE_KEY)};
    var t = localStorage.getItem(k);
    if (t !== "dark" && t !== "light") {
      var p = "lifexp_t=";
      var c = document.cookie.split(";");
      for (var i = 0; i < c.length; i++) {
        var part = c[i].trim();
        if (part.indexOf(p) === 0) {
          t = decodeURIComponent(part.slice(p.length));
          if (t === "dark" || t === "light") localStorage.setItem(k, t);
          break;
        }
      }
    }
    var dark = false;
    if (t === "dark") dark = true;
    else if (t === "light") dark = false;
    else dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.backgroundColor = dark
      ? ${JSON.stringify(THEME_FALLBACK_BG_DARK)}
      : ${JSON.stringify(THEME_FALLBACK_BG_LIGHT)};
  } catch (e) {}
})();
`;

const productionFreshStartScript = productionDomainFreshStartScript();

const appIconInitScript = `
(function () {
  try {
    var icon180 = "/icon-180.png";
    var icon192 = "/icon-192.png";
    var icon512 = "/icon-512.png";
    var manifest = "/manifest-male.webmanifest";
    function setLink(rel, href, sizes) {
      var sel = rel === "manifest" ? 'link[rel="manifest"]' : 'link[rel="' + rel + '"]';
      var link = document.querySelector(sel);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
      if (sizes) link.setAttribute("sizes", sizes);
    }
    setLink("manifest", manifest);
    setLink("icon", icon192, "192x192");
    setLink("apple-touch-icon", icon180, "180x180");
    setLink("icon", icon512, "512x512");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      style={{ backgroundColor: THEME_FALLBACK_BG_LIGHT }}
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-dvh antialiased`}
    >
      <body className="min-h-dvh text-slate-900 dark:text-slate-100">
        <script dangerouslySetInnerHTML={{ __html: productionFreshStartScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: appIconInitScript }} />
        <PwaSessionBootstrap />
        <PwaInstallListener />
        <PwaIconSync />
        <FamilyProvider>
          <SessionGate>
            {children}
            <QuestCreatorConfirmSheet />
            <PwaInstallOverlay />
          </SessionGate>
        </FamilyProvider>
      </body>
    </html>
  );
}
