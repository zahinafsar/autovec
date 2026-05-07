"use client";
import { useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export function CropModal({
  src,
  onClose,
  onCropped,
}: {
  src: string;
  onClose: () => void;
  onCropped: (url: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const init: Crop = {
      unit: "%",
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    };
    setCrop(init);
    setCompleted({
      unit: "px",
      x: width * 0.1,
      y: height * 0.1,
      width: width * 0.8,
      height: height * 0.8,
    });
  }

  async function save() {
    if (!completed || !imgRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await cropFromDom(imgRef.current, completed);
      const fd = new FormData();
      fd.append("file", blob, "crop.png");
      fd.append("bucket", "crop");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Upload failed");
      onCropped(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass modal-card"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-1">Crop reference</h2>
        <p className="text-xs text-muted mb-4">
          Drag the corners to resize freely. Drag the box to reposition.
        </p>

        <div className="rounded-xl overflow-hidden bg-black mb-4 max-h-[60vh] grid place-items-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompleted(c)}
            keepSelection
          >
            { /* eslint-disable-next-line @next/next/no-img-element */ }
            <img
              ref={imgRef}
              src={src}
              alt="crop source"
              onLoad={onLoad}
              crossOrigin="anonymous"
              style={{ maxHeight: "60vh", display: "block" }}
            />
          </ReactCrop>
        </div>

        {error && (
          <div className="alert-soft text-xs mt-3" style={{ borderColor: "rgba(220, 38, 38, 0.4)" }}>
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-ghost text-sm">
            Cancel
          </button>
          <button onClick={save} className="btn-3d" disabled={busy || !completed}>
            {busy ? "Saving…" : "Save crop"}
          </button>
        </div>
      </div>
    </div>
  );
}

async function cropFromDom(img: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  const w = Math.max(1, Math.round(crop.width * scaleX));
  const h = Math.max(1, Math.round(crop.height * scaleY));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(
    img,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    w,
    h,
  );
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}
