import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";

type DownloadButtonProps = {
  onDownload: () => Promise<void> | void;
  disabled?: boolean;
};

export function DownloadXlsxButton({ onDownload, disabled = false }: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy || disabled) return;
    setBusy(true);

    // Small delay for nicer press animation
    await new Promise((r) => setTimeout(r, 1000));

    await onDownload();
    setBusy(false);
  };


  return (
    <button
      type="button"
      onClick={handleClick}
      aria-busy={busy}
      disabled={busy || disabled}
      className={twMerge(
        "group gap-3 hover:-translate-y-1 cursor-pointer relative overflow-hidden border-slate-600 bg-blue-600 text-white flex items-center justify-center px-7 py-2 rounded-lg hover:opacity-90 duration-200 font-semibold text-lg", 
        (busy || disabled) ? "pointer-events-none opacity-50 cursor-not-allowed hover:translate-y-0" : ""
      )}
    >
        {!busy && !disabled && (
          <span
            className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700"
            style={{ width: "50%" }}
          /> 
        )}

      <span
        className={
          "relative z-10 inline-flex items-center gap-2 " +
          "motion-reduce:transform-none " +
          (busy ? "opacity-80" : "")
        }
      >
        <span
          className={
            "grid place-items-center rounded-md bg-[#A9C8FB] p-2 border" +
            "transition-transform duration-200 group-hover:scale-105 group-active:scale-100 " +
            "motion-reduce:transition-none"
          }
        >
             {busy ? (<RefreshCw className="animate-spin size-5" />) : (<Download className="size-5" />)}
         </span>
        <span className="tracking-tight">{busy ? "Downloading…" : "Download XLSX"}</span>
      </span>
    </button>
  );
}
