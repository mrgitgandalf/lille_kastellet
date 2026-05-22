import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Smartsommer – Lille Kastellet",
  description: "Telephone Pictionary for teamet på sommeravslutningen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function SmartsommerLayout({
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
