import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Tegnekjeden – Lille Kastellet",
  description: "Telephone Pictionary for teamet på sommeravslutningen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function TegnekjedenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fdf5e0]">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
