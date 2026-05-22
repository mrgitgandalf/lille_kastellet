"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function RoomQRCode({ url, size = 220 }: { url: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 1,
      color: { dark: "#171717", light: "#ffffff" },
    }).catch(() => {});
  }, [url, size]);

  return <canvas ref={canvasRef} aria-label={`QR-kode til ${url}`} />;
}
