import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import { Input } from "@/components/ui/input";
import {
  FolderOpen, Folder, FileText, ImageIcon, File, Plus, X, Upload,
  Trash2, ExternalLink, Search, ChevronLeft, Pencil, FolderPlus, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const FOLDER_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#ec4899","#64748b","#0d9488"
];

function fileIcon(url = "", type = "") {
  const lower = (url + type).toLowerCase();
  if (lower.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  if (lower.match(/jpg|jpeg|png|webp|gif/)) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
}

function formatSize(kb) {
  if (!kb) return "";
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

// ── NEW FOLDER MODAL ─────────────────────────────────────────────────────────
function FolderModal({ parentId, onClose, onSave, saving }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [desc, setDesc] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-slate-900">New Folder</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <Input placeholder="Folder name *" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" autoFocus />
          <Input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} className="rounded-xl" />
          <div>
            <p className="text-xs text-slate-500 mb-2">Folder colour</p>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                  style={{ background: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
          <button onClick={() => onSave({ name, description: desc, color, type: "folder", folder_id: parentId || null })}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
            {saving ? "Creating…" : "Create Folder"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UPLOAD DOCUMENT MODAL ────────────────────────────────────────────────────
function UploadModal({ folderId, folderName, onClose, onSave, saving }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileSizeKb, setFileSizeKb] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(file_url);
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      setFileType(ext);
      setFileSizeKb(Math.round(file.size / 1024));
      toast.success("File uploaded!");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold text-slate-900">Upload Document</p>
            {folderName && <p className="text-xs text-slate-400">to "{folderName}"</p>}
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${fileUrl ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-blue-300"}`}>
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Uploading…
              </div>
            ) : fileUrl ? (
              <div className="flex items-center justify-center gap-2 text-sm text-green-700 font-semibold">
                <FileText className="w-4 h-4" /> File ready ✓
              </div>
            ) : (
              <div>
                <Upload className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Click to select file</p>
                <p className="text-[10px] text-slate-400">PDF, JPG, PNG, Word, Excel…</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" accept="*/*" onChange={handleFile} />

          <Input placeholder="Document name *" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
          <Input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} className="rounded-xl" />
          <Input placeholder="Tags e.g. tax, insurance, 2024" value={tags} onChange={e => setTags(e.target.value)} className="rounded-xl" />
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
          <button
            onClick={() => onSave({ name: name || "Untitled", description: desc, tags, type: "document", folder_id: folderId || null, folder_name: folderName || null, file_url: fileUrl, file_type: fileType, file_size_kb: fileSizeKb })}
            disabled={saving || !fileUrl || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
            {saving ? "Saving…" : "Save Document"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DocumentVault() {
  const { isAdmin, isManagement, isAccounting, isSleepingPartner } = useRole();
  const qc = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [search, setSearch] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = isAdmin || isManagement || isAccounting;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["document_vault"],
    queryFn: () => base44.entities.DocumentVault.list("-created_date", 500),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.DocumentVault.create(data),
    onSuccess: () => { qc.invalidateQueries(["document_vault"]); toast.success("Saved"); setSaving(false); setShowFolderModal(false); setShowUploadModal(false); },
    onError: (e) => { toast.error(e.message); setSaving(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.DocumentVault.delete(id),
    onSuccess: () => { qc.invalidateQueries(["document_vault"]); toast.success("Deleted"); },
  });

  const handleSave = (data) => { setSaving(true); createMut.mutate(data); };

  // Build breadcrumb
  const breadcrumb = useMemo(() => {
    if (!currentFolderId) return [];
    const crumbs = [];
    let id = currentFolderId;
    while (id) {
      const folder = items.find(i => i.id === id);
      if (!folder) break;
      crumbs.unshift(folder);
      id = folder.folder_id;
    }
    return crumbs;
  }, [currentFolderId, items]);

  // Filter items for current view
  const visible = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return items.filter(i => i.type === "document" && (
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.tags?.toLowerCase().includes(q) ||
        i.folder_name?.toLowerCase().includes(q)
      ));
    }
    return items.filter(i => (i.folder_id || null) === (currentFolderId || null));
  }, [items, currentFolderId, search]);

  const folders = visible.filter(i => i.type === "folder");
  const documents = visible.filter(i => i.type === "document");

  const currentFolder = currentFolderId ? items.find(i => i.id === currentFolderId) : null;

  return (
    <div className="pb-28 bg-slate-50 min-h-screen">
      {showFolderModal && (
        <FolderModal
          parentId={currentFolderId}
          onClose={() => setShowFolderModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {showUploadModal && (
        <UploadModal
          folderId={currentFolderId}
          folderName={currentFolder?.name}
          onClose={() => setShowUploadModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      <MobileHeader
        title="Document Vault"
        backTo="AppSettingsPage"
        rightAction={
          canEdit && (
            <div className="flex gap-2">
              <button onClick={() => setShowFolderModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-xl">
                <FolderPlus className="w-3.5 h-3.5" /> Folder
              </button>
              <button onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl">
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
            </div>
          )
        }
      />

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search documents, tags…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl bg-white" />
        </div>
      </div>

      {/* Breadcrumb */}
      {!search && (
        <div className="px-4 pb-2 flex items-center gap-1.5 overflow-x-auto">
          <button onClick={() => setCurrentFolderId(null)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${!currentFolderId ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
            🏠 Root
          </button>
          {breadcrumb.map((crumb) => (
            <React.Fragment key={crumb.id}>
              <span className="text-slate-300 text-xs">/</span>
              <button onClick={() => setCurrentFolderId(crumb.id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors shrink-0 ${currentFolderId === crumb.id ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}
                style={{ borderColor: crumb.color + "60" }}>
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Stats */}
      {!search && (
        <div className="px-4 pb-3 flex gap-3 text-xs text-slate-400">
          <span>{folders.length} folder{folders.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{documents.length} document{documents.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {isLoading ? (
        <div className="px-4 space-y-2">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-slate-100" />)}
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {search && (
            <p className="text-xs text-slate-500 font-medium mb-1">Search results for "{search}" — {visible.length} found</p>
          )}

          {/* Folders */}
          {folders.length > 0 && (
            <div className="space-y-1.5">
              {!search && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Folders</p>}
              {folders.map(folder => (
                <div key={folder.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => setCurrentFolderId(folder.id)}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: (folder.color || "#3b82f6") + "20" }}>
                      <Folder className="w-5 h-5" style={{ color: folder.color || "#3b82f6" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{folder.name}</p>
                      {folder.description && <p className="text-xs text-slate-400 truncate">{folder.description}</p>}
                      <p className="text-[10px] text-slate-300">
                        {items.filter(i => i.folder_id === folder.id && i.type === "document").length} documents
                      </p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180" />
                  </button>
                  {canEdit && (
                    <div className="border-t border-slate-50 px-4 py-2 flex justify-end">
                      <button onClick={() => { if (window.confirm("Delete folder and all its documents?")) deleteMut.mutate(folder.id); }}
                        className="text-[10px] text-red-400 hover:text-red-600 font-semibold flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="space-y-1.5">
              {!search && folders.length > 0 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">Documents</p>}
              {documents.map(doc => (
                <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                      {fileIcon(doc.file_url, doc.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                      {doc.description && <p className="text-xs text-slate-400 truncate">{doc.description}</p>}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {search && doc.folder_name && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full">📁 {doc.folder_name}</span>
                        )}
                        {doc.file_type && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase">{doc.file_type}</span>}
                        {doc.file_size_kb && <span className="text-[10px] text-slate-400">{formatSize(doc.file_size_kb)}</span>}
                        {doc.created_date && <span className="text-[10px] text-slate-300">{format(new Date(doc.created_date), "dd MMM yyyy")}</span>}
                      </div>
                      {doc.tags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.tags.split(",").map((t, i) => (
                            <span key={i} className="text-[9px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full font-medium">#{t.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors">
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      )}
                      {canEdit && (
                        <button onClick={() => { if (window.confirm("Delete this document?")) deleteMut.mutate(doc.id); }}
                          className="text-red-300 hover:text-red-500 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {folders.length === 0 && documents.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-600 mb-1">
                {search ? "No documents found" : currentFolderId ? "This folder is empty" : "Document Vault is empty"}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {canEdit ? "Create folders to organise, then upload your documents." : "No documents have been uploaded yet."}
              </p>
              {canEdit && !search && (
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setShowFolderModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl">
                    <FolderPlus className="w-3.5 h-3.5" /> New Folder
                  </button>
                  <button onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">
                    <Upload className="w-3.5 h-3.5" /> Upload Document
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}