import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { LessonRunner, documentToSteps } from "@/components/LessonRunner";

export default function DocumentView() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    api.get(`/documents/${documentId}`).then((r) => setDoc(r.data)).catch(() => navigate("/app/documents"));
  }, [documentId, navigate]);

  if (!doc) return <div className="text-[#525252] font-mono-type animate-pulse">loading document…</div>;

  return (
    <LessonRunner
      title={doc.title}
      subject={doc.subject || doc.filename}
      steps={documentToSteps(doc)}
      backTo="/app/documents"
      backLabel="Documents"
      mode="learn"
    />
  );
}
