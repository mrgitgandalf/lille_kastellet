import type { Metadata, Viewport } from "next";
import { I18nProvider, LanguageToggle } from "@/lib/i18n";
import { getServerDict, getServerLang } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const d = await getServerDict();
  return { title: d["meta.title"], description: d["meta.desc"] };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function GjettekampenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLang();
  return (
    <I18nProvider initialLang={lang}>
      <div className="min-h-screen bg-[#fdf5e0]">
        <LanguageToggle />
        <div className="mx-auto w-full max-w-3xl px-4 py-6 pt-14">{children}</div>
      </div>
    </I18nProvider>
  );
}
