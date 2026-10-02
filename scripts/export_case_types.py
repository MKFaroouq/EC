from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "tmp" / "source-analysis" / "workbook-inventory.json"
OUTPUT = ROOT / "src" / "domain" / "generated-case-types.ts"


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip(" .")


def main() -> None:
    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    cells = {cell["address"]: cell["value"] for cell in payload["sheets"][0]["analysis"]["cells"]}
    rows: list[dict[str, str]] = []
    seen: set[str] = set()

    for row in range(4, 451):
        raw_name = cells.get(f"E{row}")
        if not raw_name:
            continue
        name = normalize_name(str(raw_name))
        key = name.casefold()
        if not name or key in seen:
            continue
        seen.add(key)

        fixed = cells.get(f"F{row}") == "1"
        relative = cells.get(f"H{row}") == "1"
        review = cells.get(f"J{row}") == "1"
        exempt = cells.get(f"L{row}") == "1"
        if review or exempt or (not fixed and not relative):
            classification = "review"
        elif relative:
            classification = "relative"
        else:
            classification = "fixed"
        rows.append(
            {
                "id": f"workbook-{row:03d}",
                "name": name,
                "defaultValueKind": "known" if relative else "unknown",
                "classification": classification,
                "source": "workbook",
            }
        )

    body = json.dumps(rows, ensure_ascii=False, indent=2)
    OUTPUT.write_text(
        "// Generated mechanically from the supplied workbook; do not edit by hand.\n"
        'import type { CaseType } from "./types.js";\n\n'
        f"export const generatedCaseTypes = {body} satisfies CaseType[];\n",
        encoding="utf-8",
    )
    print(f"exported={len(rows)} output={OUTPUT}")


if __name__ == "__main__":
    main()
