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
  theme?: "default" | "retro";
};

const COLORS = ["#171717", "#dc2626", "#2563eb", "#16a34a", "#facc15", "#ffffff"];
const SIZES = [3, 6, 12];

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas(
    {
      onStrokeComplete,
      externalStrokes,
      mode = "draw",
      hideToolbar,
      onClear,
      theme = "default",
    },
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
    const isRetro = theme === "retro";

    const frameCls = isRetro
      ? "relative w-full overflow-hidden rounded-2xl border-4 border-violet-950 bg-white shadow-[6px_6px_0_0_#0b0420]"
      : "relative w-full overflow-hidden rounded-xl border border-neutral-300 bg-white";

    const toolbarCls = isRetro
      ? "flex flex-wrap items-center gap-2 rounded-xl border-4 border-stone-700/50 bg-[#fdf5e0] p-2 shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]"
      : "flex flex-wrap items-center gap-2";

    const labelCls = isRetro
      ? "text-xs font-black uppercase tracking-wide text-stone-800"
      : "text-xs font-semibold text-neutral-600";

    const colorBtnCls = (selected: boolean) =>
      isRetro
        ? `h-9 w-9 rounded-lg border-4 ${
            selected
              ? "border-violet-950 shadow-[2px_2px_0_0_#0b0420]"
              : "border-stone-700/40"
          }`
        : `h-8 w-8 rounded-full border ${
            selected
              ? "ring-2 ring-neutral-900 ring-offset-2"
              : "border-neutral-300"
          }`;

    const sizeBtnCls = (selected: boolean) =>
      isRetro
        ? `flex h-9 w-9 items-center justify-center rounded-lg border-4 bg-white ${
            selected
              ? "border-violet-950 shadow-[2px_2px_0_0_#0b0420]"
              : "border-stone-700/40"
          }`
        : `flex h-8 w-8 items-center justify-center rounded-full border ${
            selected
              ? "ring-2 ring-neutral-900 ring-offset-2"
              : "border-neutral-300"
          }`;

    const actionBtnCls = isRetro
      ? "rounded-lg border-4 border-violet-950 bg-violet-800 px-3 py-1 text-sm font-black uppercase tracking-wide text-violet-50 shadow-[3px_3px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#0b0420]"
      : "rounded-lg border border-neutral-300 px-3 py-1.5 text-sm";

    return (
      <div ref={wrapRef} className="flex flex-col gap-3">
        <div
          className={frameCls}
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
          <div className={toolbarCls}>
            <span className={labelCls}>Farge</span>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Farge ${c}`}
                className={colorBtnCls(color === c)}
                style={{ backgroundColor: c }}
              />
            ))}
            <span className={`${labelCls} ml-3`}>Tykkelse</span>
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={sizeBtnCls(size === s)}
              >
                <span
                  className="rounded-full bg-neutral-900"
                  style={{ width: s * 2, height: s * 2 }}
                />
              </button>
            ))}
            <button type="button" onClick={undo} className={`${actionBtnCls} ml-auto`}>
              Angre
            </button>
            <button type="button" onClick={clearAll} className={actionBtnCls}>
              Tøm
            </button>
          </div>
        )}
      </div>
    );
  }
);
