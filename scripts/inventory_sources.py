from __future__ import annotations

import hashlib
import json
from pathlib import Path

from pypdf import PdfReader


SOURCE_DIR = Path(r"C:\Users\user\Desktop\وزارة العدل - التطور التقني\رسوم")
OUTPUT = Path("tmp/source-analysis/pdf-inventory.json")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inspect_pdf(path: Path) -> dict[str, object]:
    record: dict[str, object] = {
        "file": path.name,
        "path": str(path),
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }
    if path.stat().st_size == 0:
        return {**record, "status": "empty", "pages": 0, "text_chars": 0}

    try:
        reader = PdfReader(path)
        page_count = len(reader.pages)
        sample_indexes = sorted({0, 1, 2, page_count // 2, page_count - 1})
        text_lengths: dict[int, int] = {}
        samples: list[dict[str, object]] = []
        for index in sample_indexes:
            text = reader.pages[index].extract_text() or ""
            text_lengths[index + 1] = len(text.strip())
            samples.append(
                {
                    "page": index + 1,
                    "text_chars": len(text.strip()),
                    "sample": " ".join(text.split())[:500],
                }
            )
        record.update(
            status="ok",
            pages=page_count,
            sampled_text_chars=sum(text_lengths.values()),
            sampled_pages_with_text=sum(length > 25 for length in text_lengths.values()),
            sample_page_text_lengths=text_lengths,
            text_samples=samples,
        )
    except Exception as exc:  # Preserve evidence even for malformed PDFs.
        record.update(status="error", error=f"{type(exc).__name__}: {exc}")
    return record


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    records = [inspect_pdf(path) for path in sorted(SOURCE_DIR.glob("*.pdf"))]
    OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(records, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
