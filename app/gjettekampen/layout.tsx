import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Gjettekampen – Lille Kastellet",
  description: "Alle-mot-alle pictionary. Tegn ordet ditt, gjett før noen andre.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function GjettekampenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
