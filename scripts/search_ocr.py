from __future__ import annotations

import argparse
import re
from pathlib import Path


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\ufeff", " ")).strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Print bounded contexts around OCR keywords.")
    parser.add_argument("pattern", help="Regular expression to search for")
    parser.add_argument("--glob", default="*.txt")
    parser.add_argument("--root", default="tmp/pdfs/ocr")
    parser.add_argument("--context", type=int, default=180)
    parser.add_argument("--limit", type=int, default=30)
    args = parser.parse_args()

    rx = re.compile(args.pattern, re.IGNORECASE)
    emitted = 0
    for path in sorted(Path(args.root).glob(args.glob)):
        text = normalized(path.read_text(encoding="utf-8", errors="replace"))
        for match in rx.finditer(text):
            start = max(0, match.start() - args.context)
            end = min(len(text), match.end() + args.context)
            print(f"[{path.name}] {text[start:end]}")
            emitted += 1
            if emitted >= args.limit:
                return


if __name__ == "__main__":
    main()
