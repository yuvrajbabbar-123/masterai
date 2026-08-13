import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { FileText, UploadSimple, FilePdf, FileDoc, ArrowRight, CircleNotch } from "@phosphor-icons/react";

export default function LearnDocuments() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const loadDocs = async () => {
    try { const res = await api.get("/documents"); setDocs(res.data); } catch {}
  };
  useEffect(() => { loadDocs(); }, []);

  const upload = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    try {
      const res = await api.post("/documents/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document ready to type!");
      navigate(`/app/documents/${res.data.document_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally { setBusy(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    upload(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-10" data-testid="learn-documents">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
          <FileText size={34} weight="duotone" className="text-[#EAB308]" /> Learn from Documents
        </h1>
        <p className="text-[#A3A3A3] mt-2">Upload your notes or a PDF. AI turns it into type-over lessons — then you type it into memory.</p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        data-testid="dropzone"
        className={`max-w-2xl rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          dragOver ? "border-[#EAB308] bg-[#EAB308]/5" : "border-white/15 bg-[#171717] hover:border-white/30"
        }`}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden"
          data-testid="file-input" onChange={(e) => upload(e.target.files?.[0])} />
        {busy ? (
          <div className="flex flex-col items-center gap-3 text-[#A3A3A3]">
            <CircleNotch size={40} className="animate-spin text-[#EAB308]" />
            <p className="font-mono-type text-sm">Reading & building lessons…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#EAB308]/10 flex items-center justify-center">
              <UploadSimple size={28} weight="bold" className="text-[#EAB308]" />
            </div>
            <p className="font-medium">Drop a file here, or <span className="text-[#EAB308]">browse</span></p>
            <p className="text-xs text-[#525252] font-mono-type">PDF · DOCX · TXT · MD — up to 10 MB</p>
          </div>
        )}
      </div>

      {docs.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold mb-4">Your Documents</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((d) => {
              const Icon = d.filename?.toLowerCase().endsWith(".pdf") ? FilePdf : FileDoc;
              return (
                <button key={d.document_id} onClick={() => navigate(`/app/documents/${d.document_id}`)}
                  data-testid={`document-${d.document_id}`}
                  className="group text-left rounded-2xl border border-white/10 bg-[#171717] p-5 hover:-translate-y-1 hover:border-white/20 transition-transform">
                  <Icon size={26} weight="duotone" className="text-[#EAB308]" />
                  <h3 className="font-display font-bold text-lg mt-3 leading-tight line-clamp-2">{d.title}</h3>
                  <p className="text-xs text-[#525252] mt-1 truncate font-mono-type">{d.filename}</p>
                  <div className="flex items-center gap-1 text-xs text-[#525252] mt-4 group-hover:text-white transition-colors">
                    {(d.lessons || []).length} lessons <ArrowRight size={14} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
