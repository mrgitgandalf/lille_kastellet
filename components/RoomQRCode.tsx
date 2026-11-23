"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/lib/i18n";

export default function RoomQRCode({ url, size = 220 }: { url: string; size?: number }) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 1,
      color: { dark: "#171717", light: "#ffffff" },
    }).catch(() => {});
  }, [url, size]);

  return <canvas ref={canvasRef} aria-label={t("qr.aria", { url })} />;
}
