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
    <div className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6">
      {children}
    </div>
  );
}
