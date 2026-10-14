"use client";

import { useEffect, useRef, useState } from "react";
import { OUT_HEIGHT, OUT_WIDTH, WIN_HEIGHT, WIN_WIDTH, baseScale, room, sourceRect } from "./cover-crop";

/**
 * Chooses the part of a picture that becomes an article's cover.
 *
 * Every cover is written out at the same size, so the news list and the home
 * page can lay them out as one shape instead of accommodating whatever was
 * uploaded. Before this, one article led with a tall stat graphic and the next
 * with a square crest, and no single frame could hold both: filling it cut the
 * words off the graphic, and fitting it inside left the crest swimming in bars.
 *
 * The writer drags to choose what is in frame and drags the slider to zoom,
 * the way a profile picture is set anywhere else, so cropping is a decision
 * somebody makes rather than one the stylesheet makes badly.
 */

export function CoverCropper({
  src,
  busy,
  onCancel,
  onDone,
}: {
  /** The picture being cropped, already uploaded and served from this site. */
  src: string;
  busy: boolean;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const image = useRef<HTMLImageElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Loaded here rather than with an <img> in the markup because the crop needs
  // the natural size to do its arithmetic, and the same element is what gets
  // drawn to the canvas at the end.
  useEffect(() => {
    const element = new Image();
    element.onload = () => {
      image.current = element;
      setSize({ width: element.naturalWidth, height: element.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    element.src = src;
  }, [src]);

  // The scale at which the picture just covers the window. Everything else is
  // a multiple of it, so zoom 1 always means "no empty corners".
  const base = size ? baseScale(size) : 1;
  const scale = base * zoom;
  const shown = size ? { width: size.width * scale, height: size.height * scale } : null;

  /**
   * Keeps the picture covering the window, so a drag cannot pull a gap in.
   *
   * Takes the zoom rather than reading it, because zooming out has to re-clamp
   * an offset chosen at a closer view before that offset shows an edge, and at
   * that moment the new zoom is not in state yet.
   */
  function clamp(next: { x: number; y: number }, atZoom = zoom) {
    if (!size) return { x: 0, y: 0 };
    const limit = room(size, base * atZoom);
    return {
      x: Math.min(limit.x, Math.max(-limit.x, next.x)),
      y: Math.min(limit.y, Math.max(-limit.y, next.y)),
    };
  }

  function down(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setOffset(clamp({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y }));
  }

  function up(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  }

  function cut() {
    const element = image.current;
    if (!element || !size) return;
    const frame = sourceRect(size, scale, offset);

    const canvas = document.createElement("canvas");
    canvas.width = OUT_WIDTH;
    canvas.height = OUT_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingQuality = "high";
    context.drawImage(element, frame.sx, frame.sy, frame.width, frame.height, 0, 0, OUT_WIDTH, OUT_HEIGHT);
    onDone(canvas.toDataURL("image/webp", 0.82));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
        <p className="ui-field-label mb-1">Choose the cover</p>
        <p className="mb-3 text-xs text-slate-500">
          Drag the picture to choose what is in frame. Every cover is saved at the same size.
        </p>

        <div
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          style={{ width: WIN_WIDTH, height: WIN_HEIGHT, maxWidth: "100%" }}
          className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-lg border border-slate-700 bg-slate-950 active:cursor-grabbing"
        >
          {shown && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: shown.width,
                height: shown.height,
                maxWidth: "none",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}
        </div>

        <label className="ui-field-label mt-3 block">
          Zoom
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(event) => {
              const next = Number(event.target.value);
              setZoom(next);
              setOffset((current) => clamp(current, next));
            }}
            className="mt-1 w-full"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="ui-button">
            Cancel
          </button>
          <button type="button" onClick={cut} disabled={busy || !size} className="ui-button-primary">
            {busy ? "Saving…" : "Use as cover"}
          </button>
        </div>
      </div>
    </div>
  );
}
