"use client";
import { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Download,
  Link as LinkIcon,
  Image as ImageIcon,
  ChevronRight,
} from "lucide-react";

export function VariantMenu({
  url,
  filenameBase,
}: {
  url: string;
  filenameBase: string;
}) {
  const [open, setOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setDownloadOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setDownloadOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setDownloadOpen(false);
  }

  async function loadBlob(): Promise<Blob> {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    return r.blob();
  }

  function triggerDownload(blob: Blob, ext: string) {
    const a = document.createElement("a");
    const objUrl = URL.createObjectURL(blob);
    a.href = objUrl;
    a.download = `${filenameBase}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  }

  async function run(fn: () => Promise<void>) {
    try {
      await fn();
    } catch {
      // swallow
    } finally {
      close();
    }
  }

  function downloadPng() {
    run(async () => {
      const blob = await loadBlob();
      triggerDownload(blob, "png");
    });
  }

  function downloadJpg() {
    run(async () => {
      const blob = await loadBlob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);
      const jpgBlob: Blob = await new Promise((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("toBlob null"))),
          "image/jpeg",
          0.92,
        ),
      );
      triggerDownload(jpgBlob, "jpg");
    });
  }

  function downloadPdf() {
    run(async () => {
      const { jsPDF } = await import("jspdf");
      const blob = await loadBlob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");

      const orientation = bitmap.width >= bitmap.height ? "l" : "p";
      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format: [bitmap.width, bitmap.height],
        compress: true,
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, bitmap.width, bitmap.height);
      pdf.save(`${filenameBase}.pdf`);
    });
  }

  function copyUrl() {
    run(async () => {
      const abs = new URL(url, window.location.origin).toString();
      await navigator.clipboard.writeText(abs);
    });
  }

  function copyImage() {
    run(async () => {
      const blob = await loadBlob();
      let pngBlob = blob;
      if (blob.type !== "image/png") {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
        pngBlob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(
            (b) => (b ? res(b) : rej(new Error("toBlob null"))),
            "image/png",
          ),
        );
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
    });
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        className="w-7 h-7 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-foreground transition-colors"
      >
        <MoreHorizontal size={14} strokeWidth={2.4} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-white/10 bg-[#15151b] shadow-xl py-1 text-sm"
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setDownloadOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/5 text-left"
            >
              <span className="flex items-center gap-2">
                <Download size={14} strokeWidth={2.2} />
                Download
              </span>
              <ChevronRight size={12} strokeWidth={2.2} />
            </button>
            {downloadOpen && (
              <div
                role="menu"
                className="absolute top-0 min-w-[120px] rounded-lg border border-white/10 bg-[#15151b] shadow-xl py-1
                           right-full mr-1
                           sm:right-auto sm:left-full sm:mr-0 sm:ml-1"
              >
                <button
                  onClick={downloadPng}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/5"
                >
                  PNG
                </button>
                <button
                  onClick={downloadJpg}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/5"
                >
                  JPG
                </button>
                <button
                  onClick={downloadPdf}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/5"
                >
                  PDF
                </button>
              </div>
            )}
          </div>
          <button
            onClick={copyUrl}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-left"
          >
            <LinkIcon size={14} strokeWidth={2.2} />
            Copy URL
          </button>
          <button
            onClick={copyImage}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-left"
          >
            <ImageIcon size={14} strokeWidth={2.2} />
            Copy image
          </button>
        </div>
      )}
    </div>
  );
}
