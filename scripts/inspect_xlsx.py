from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from zipfile import ZipFile

from lxml import etree


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


def shared_strings(zip_file: ZipFile) -> list[str]:
    try:
        root = etree.fromstring(zip_file.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return ["".join(item.itertext()) for item in root.findall(f"{{{MAIN_NS}}}si")]


def workbook_sheets(zip_file: ZipFile) -> list[tuple[str, str, str]]:
    workbook = etree.fromstring(zip_file.read("xl/workbook.xml"))
    relationships = etree.fromstring(zip_file.read("xl/_rels/workbook.xml.rels"))
    targets = {
        rel.get("Id"): rel.get("Target")
        for rel in relationships.findall(f"{{{PKG_REL_NS}}}Relationship")
    }
    result: list[tuple[str, str, str]] = []
    for sheet in workbook.findall(f".//{{{MAIN_NS}}}sheet"):
        relationship_id = sheet.get(f"{{{REL_NS}}}id", "")
        target = targets[relationship_id]
        entry = target.lstrip("/") if target.startswith("/") else f"xl/{target.lstrip('./')}"
        result.append((sheet.get("name", ""), sheet.get("sheetId", ""), entry))
    return result


CELL_RE = re.compile(rb"<c\b(?P<attrs>[^>]*?)(?<!/)>(?P<body>.*?)</c>", re.DOTALL)
ATTR_RE = re.compile(rb"\b(?P<name>[A-Za-z]+)=\"(?P<value>[^\"]*)\"")
VALUE_RE = re.compile(rb"<v>(?P<value>.*?)</v>", re.DOTALL)
FORMULA_RE = re.compile(rb"<f(?:\s[^>]*)?>(?P<value>.*?)</f>", re.DOTALL)
TEXT_RE = re.compile(rb"<t(?:\s[^>]*)?>(?P<value>.*?)</t>", re.DOTALL)


def decode_xml(value: bytes | None) -> str | None:
    if value is None:
        return None
    return html.unescape(value.decode("utf-8"))


def sheet_cells(
    zip_file: ZipFile, entry: str, strings: list[str], limit: int = 20_000
) -> dict[str, object]:
    cells: list[dict[str, object]] = []
    valued_count = 0
    formula_count = 0
    max_row = 0
    max_col = ""
    sheet_xml = zip_file.read(entry)
    for match in CELL_RE.finditer(sheet_xml):
            attributes = {
                item.group("name").decode("ascii"): html.unescape(item.group("value").decode("utf-8"))
                for item in ATTR_RE.finditer(match.group("attrs"))
            }
            body = match.group("body")
            address = attributes.get("r", "")
            cell_type = attributes.get("t")
            style = attributes.get("s")
            formula_match = FORMULA_RE.search(body)
            value_match = VALUE_RE.search(body)
            inline_match = TEXT_RE.search(body) if cell_type == "inlineStr" else None
            formula = decode_xml(formula_match.group("value")) if formula_match else None
            raw_value = decode_xml(value_match.group("value")) if value_match else None
            inline_text = decode_xml(inline_match.group("value")) if inline_match else None

            if formula is not None:
                formula_count += 1
            if formula is not None or raw_value is not None or inline_text is not None:
                valued_count += 1
                display_value: object = raw_value
                if cell_type == "s" and raw_value is not None:
                    try:
                        index = int(raw_value)
                        display_value = strings[index] if 0 <= index < len(strings) else raw_value
                    except ValueError:
                        display_value = raw_value
                elif cell_type == "inlineStr":
                    display_value = inline_text

                if len(cells) < limit:
                    cells.append(
                        {
                            "address": address,
                            "type": cell_type,
                            "style": style,
                            "value": display_value,
                            "rawValue": raw_value,
                            "formula": formula,
                        }
                    )

            if address:
                letters = "".join(ch for ch in address if ch.isalpha())
                digits = "".join(ch for ch in address if ch.isdigit())
                if digits:
                    max_row = max(max_row, int(digits))
                if len(letters) > len(max_col) or (len(letters) == len(max_col) and letters > max_col):
                    max_col = letters

    return {
        "entry": entry,
        "valuedCellCount": valued_count,
        "formulaCount": formula_count,
        "physicalMaxRow": max_row,
        "physicalMaxColumn": max_col,
        "truncated": valued_count > limit,
        "cells": cells,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--output", type=Path, default=Path("tmp/source-analysis/workbook-inventory.json"))
    args = parser.parse_args()
    if not args.workbook.is_file():
        raise FileNotFoundError(args.workbook)

    with ZipFile(args.workbook) as zip_file:
        strings = shared_strings(zip_file)
        sheets = []
        for name, sheet_id, entry in workbook_sheets(zip_file):
            print(f"Scanning sheet {sheet_id}: {name}", flush=True)
            sheets.append(
                {
                    "name": name,
                    "sheetId": sheet_id,
                    "analysis": sheet_cells(zip_file, entry, strings),
                }
            )

    result = {
        "workbook": str(args.workbook),
        "bytes": args.workbook.stat().st_size,
        "sharedStringCount": len(strings),
        "sheetCount": len(sheets),
        "sheets": sheets,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "sheetCount": len(sheets),
        "sheets": [
            {
                "name": item["name"],
                "valuedCellCount": item["analysis"]["valuedCellCount"],
                "formulaCount": item["analysis"]["formulaCount"],
                "physicalMaxRow": item["analysis"]["physicalMaxRow"],
                "physicalMaxColumn": item["analysis"]["physicalMaxColumn"],
            }
            for item in sheets
        ],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
