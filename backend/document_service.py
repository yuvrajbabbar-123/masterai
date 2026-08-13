import io
import re
from pypdf import PdfReader
from docx import Document


def extract_text(filename: str, content: bytes) -> str:
    lower = (filename or "").lower()
    if lower.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
    elif lower.endswith(".docx"):
        doc = Document(io.BytesIO(content))
        text = "\n".join(p.text for p in doc.paragraphs)
    elif lower.endswith(".txt") or lower.endswith(".md"):
        text = content.decode("utf-8", errors="ignore")
    else:
        raise ValueError("Unsupported file type. Please upload a PDF, DOCX, TXT or MD file.")
    # normalise whitespace
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
