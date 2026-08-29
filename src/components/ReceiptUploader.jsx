import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Paperclip, Upload, FileText, ImageIcon, ExternalLink, Trash2, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Reusable receipt/document uploader component.
 * Props:
 *   urls: string[]          - current attachment URLs
 *   onChange: (urls) => void - called when list changes
 *   disabled?: boolean
 *   label?: string
 */
export default function ReceiptUploader({ urls = [], onChange, disabled = false, label = "Receipts & Documents" }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const newUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newUrls.push(file_url);
      }
      onChange([...urls, ...newUrls]);
      toast.success(`${newUrls.length} file(s) attached`);
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = (idx) => onChange(urls.filter((_, i) => i !== idx));

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">{label}</span>
          {urls.length > 0 && (
            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{urls.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || disabled}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 bg-white text-slate-500 text-xs font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />Uploading…</>
          ) : (
            <><Upload className="w-3 h-3" />Attach</>
          )}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
      </div>

      {urls.length === 0 ? (
        <p className="text-[10px] text-slate-400 text-center py-2">No attachments. Attach photos or PDF receipts.</p>
      ) : (
        <div className="space-y-1.5">
          {urls.map((url, idx) => {
            const isPdf = url.toLowerCase().includes(".pdf") || url.toLowerCase().includes("pdf");
            const name = url.split("/").pop()?.split("?")[0] || `File ${idx + 1}`;
            return (
              <div key={idx} className="flex items-center gap-2 bg-white rounded-lg border border-slate-100 px-2.5 py-1.5">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${isPdf ? "bg-red-50" : "bg-blue-50"}`}>
                  {isPdf ? <FileText className="w-3.5 h-3.5 text-red-500" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                </div>
                <span className="flex-1 text-[10px] text-slate-600 truncate">{name}</span>
                <a href={url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 p-0.5">
                  <ExternalLink className="w-3 h-3" />
                </a>
                {!disabled && (
                  <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}