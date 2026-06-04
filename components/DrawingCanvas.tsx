"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";

export type DrawingCanvasHandle = {
  toPng: () => string;
  clear: () => void;
};

export type Stroke = {
  color: string;
  size: number;
  points: { x: number; y: number }[];
};

export type DrawingCanvasProps = {
  onStrokeComplete?: (stroke: Stroke) => void;
  externalStrokes?: Stroke[];
  mode?: "draw" | "spectate";
  hideToolbar?: boolean;
  onClear?: () => void;
};

const COLORS = ["#171717", "#dc2626", "#2563eb", "#16a34a", "#facc15", "#ffffff"];
const SIZES = [3, 6, 12];

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas(
    { onStrokeComplete, externalStrokes, mode = "draw", hideToolbar, onClear },
    ref
  ) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [current, setCurrent] = useState<Stroke | null>(null);
    const [color, setColor] = useState("#171717");
    const [size, setSize] = useState(6);

    const isSpectate = mode === "spectate";

    // Fast logisk oppløsning – tegningen lagres som 1200x900 PNG.
    const LOGICAL_W = 1200;
    const LOGICAL_H = 900;

    function getCtx() {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext("2d");
    }

    function render() {
      const ctx = getCtx();
      if (!ctx || !canvasRef.current) return;
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      const base = isSpectate ? externalStrokes ?? [] : strokes;
      const all = current ? [...base, current] : base;
      for (const s of all) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        s.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
      ctx.restore();
    }

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = LOGICAL_W;
      canvas.height = LOGICAL_H;
      render();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      render();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strokes, current, externalStrokes, isSpectate]);

    function localPoint(e: React.PointerEvent<HTMLCanvasElement>) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_W;
      const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_H;
      return { x, y };
    }

    function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
      if (isSpectate) return;
      (e.target as Element).setPointerCapture(e.pointerId);
      setCurrent({ color, size: size * (LOGICAL_W / 600), points: [localPoint(e)] });
    }

    function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
      if (isSpectate || !current) return;
      setCurrent({ ...current, points: [...current.points, localPoint(e)] });
    }

    function onUp() {
      if (isSpectate || !current) return;
      const finished = current;
      setStrokes((prev) => [...prev, finished]);
      setCurrent(null);
      onStrokeComplete?.(finished);
    }

    function undo() {
      setStrokes((prev) => prev.slice(0, -1));
    }

    function clearAll() {
      setStrokes([]);
      setCurrent(null);
      onClear?.();
    }

    useImperativeHandle(ref, () => ({
      toPng: () => {
        const canvas = canvasRef.current!;
        return canvas.toDataURL("image/png");
      },
      clear: clearAll,
    }));

    const showToolbar = !hideToolbar && !isSpectate;

    return (
      <div ref={wrapRef} className="flex flex-col gap-3">
        <div
          className="relative w-full overflow-hidden rounded-xl border border-neutral-300 bg-white"
          style={{ aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}` }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{
              touchAction: "none",
              width: "100%",
              height: "100%",
              display: "block",
              pointerEvents: isSpectate ? "none" : "auto",
            }}
          />
        </div>

        {showToolbar && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-neutral-600">Farge</span>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Farge ${c}`}
                className={`h-8 w-8 rounded-full border ${
                  color === c ? "ring-2 ring-neutral-900 ring-offset-2" : "border-neutral-300"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <span className="ml-3 text-xs font-semibold text-neutral-600">Tykkelse</span>
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  size === s ? "ring-2 ring-neutral-900 ring-offset-2" : "border-neutral-300"
                }`}
              >
                <span
                  className="rounded-full bg-neutral-900"
                  style={{ width: s * 2, height: s * 2 }}
                />
              </button>
            ))}
            <button
              type="button"
              onClick={undo}
              className="ml-auto rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
            >
              Angre
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
            >
              Tøm
            </button>
          </div>
        )}
      </div>
    );
  }
);
