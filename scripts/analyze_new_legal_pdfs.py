from __future__ import annotations

import json
import re
from pathlib import Path

import pypdfium2 as pdfium
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "tmp" / "pdfs" / "new-legal-sources"
SOURCES = {
    "jslem": Path(r"C:\Users\user\Desktop\JSLEM_Volume 59_Issue 3_Pages 61-128.pdf"),
    "cassation_fees": Path(r"C:\Users\user\Desktop\النقض-في-الرسوم-القضائية.pdf"),
    "jurisprudence_fiqh": Path(r"C:\Users\user\Desktop\فقه_الرسوم_القضائية_في_ضوء_الفقه_و_القانون.pdf"),
    "fee_law_observations": Path(r"C:\Users\user\Desktop\نظرات_في_قانون_الرسوم_القضائية_عبدالرحمن_فؤاد.pdf"),
}
TERMS = (
    "رسوم قضائية",
    "الرسم النسبي",
    "تسوية",
    "تقدير الرسوم",
    "الخدمات القضائية",
    "محكمة النقض",
    "قانون الرسوم",
    "المطالبة",
    "المقضي به",
    "مجهول القيمة",
)


def compact(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    inventory: list[dict[str, object]] = []
    for key, source in SOURCES.items():
        reader = PdfReader(str(source))
        page_texts: list[str] = []
        hits: list[dict[str, object]] = []
        for index, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            page_texts.append(text)
            normalized = compact(text)
            matched = [term for term in TERMS if term in normalized]
            if matched:
                hits.append({"page": index + 1, "terms": matched, "sample": normalized[:700]})

        text_path = OUTPUT / f"{key}.txt"
        text_path.write_text(
            "\n\n".join(f"===== PAGE {i + 1} =====\n{text}" for i, text in enumerate(page_texts)),
            encoding="utf-8",
        )

        pdf = pdfium.PdfDocument(str(source))
        rendered: list[str] = []
        # JSLEM contains a broken Arabic text layer: every page reports text, but
        # the glyph order/encoding is unusable for reliable search. Render all of
        # it so the Windows Arabic OCR pass works from the visual source instead.
        if key == "jslem" or not any(compact(text) for text in page_texts):
            page_indexes = list(range(len(pdf)))
        else:
            page_indexes = sorted({0, len(pdf) - 1, *(int(item["page"]) - 1 for item in hits[:8])})
        for page_index in page_indexes:
            page = pdf[page_index]
            bitmap = page.render(scale=1.4)
            target = OUTPUT / f"{key}-page-{page_index + 1:03d}.png"
            bitmap.to_pil().save(target)
            rendered.append(str(target))

        inventory.append(
            {
                "key": key,
                "source": str(source),
                "bytes": source.stat().st_size,
                "pages": len(reader.pages),
                "metadata": {str(k): str(v) for k, v in (reader.metadata or {}).items()},
                "extracted_characters": sum(len(text) for text in page_texts),
                "pages_with_text": sum(bool(compact(text)) for text in page_texts),
                "term_hits": hits,
                "text_output": str(text_path),
                "rendered_pages": rendered,
            }
        )

    (OUTPUT / "inventory.json").write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(inventory, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
