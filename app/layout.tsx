import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import {
  APP_ICON_PATHS,
  APP_ICON_VERSION,
  APP_MANIFEST_PATH,
} from "../lib/appIcon";
import PwaIconSync from "../components/PwaIconSync";
import PwaInstallListener from "../components/PwaInstallListener";
import QuestCreatorConfirmSheet from "../components/QuestCreatorConfirmSheet";
import PwaSessionBootstrap from "../components/PwaSessionBootstrap";
import SessionGate from "../components/SessionGate";
import { FamilyProvider } from "../components/FamilyProvider";
import ErrorNotbremse from "../components/ErrorNotbremse";
import AppStuckWatchdog from "../components/AppStuckWatchdog";
import { CLIENT_STORAGE_SCOPE_INLINE } from "../lib/clientStorageScope";
import { productionDomainFreshStartScript } from "../lib/productionDomainFreshStart";
import { clientStorageBootstrapScript } from "../lib/clientStorageBootstrap";
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
      { url: APP_ICON_PATHS[192], sizes: "192x192", type: "image/png" },
      { url: APP_ICON_PATHS[512], sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: APP_ICON_PATHS[180], sizes: "180x180", type: "image/png" },
      { url: `/apple-touch-icon.png?v=${APP_ICON_VERSION}`, sizes: "180x180", type: "image/png" },
    ],
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
    ${CLIENT_STORAGE_SCOPE_INLINE}
    var k = lifexpScopedKey(${JSON.stringify(THEME_STORAGE_KEY)});
    var t = localStorage.getItem(k);
    if (t !== "dark" && t !== "light") {
      var p = lifexpScopedKey("lifexp_t") + "=";
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
const storageBootstrapScript = clientStorageBootstrapScript();

const appIconInitScript = `
(function () {
  try {
    var v = ${JSON.stringify(APP_ICON_VERSION)};
    var icon180 = "/icon-180.png?v=" + v;
    var icon192 = "/icon-192.png?v=" + v;
    var icon512 = "/icon-512.png?v=" + v;
    var manifest = ${JSON.stringify(APP_MANIFEST_PATH)};
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
    setLink("apple-touch-icon-precomposed", icon180, "180x180");
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
        <script dangerouslySetInnerHTML={{ __html: storageBootstrapScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: appIconInitScript }} />
        <PwaSessionBootstrap />
        <PwaInstallListener />
        <PwaIconSync />
        <FamilyProvider>
          <ErrorNotbremse />
          <AppStuckWatchdog />
          <SessionGate>
            {children}
            <QuestCreatorConfirmSheet />
          </SessionGate>
        </FamilyProvider>
      </body>
    </html>
  );
}
