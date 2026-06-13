import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DRAFTS_PATH = ROOT / "data" / "content_drafts.csv"
REVIEW_PATH = ROOT / "data" / "content_drafts_review.md"


def read_csv(path):
    if not path.exists():
        return []

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def trim(text, limit=800):
    text = str(text or "").strip()

    if len(text) <= limit:
        return text

    return text[:limit].rstrip() + "..."


def main():
    rows = read_csv(DRAFTS_PATH)

    new_rows = [
        row for row in rows
        if row.get("status") in ("new", "needs_edit")
    ]

    if not new_rows:
        print("No drafts to review.")
        return

    lines = ["# Content drafts review", ""]

    for i, row in enumerate(new_rows, start=1):
        lines.extend([
            f"## {i}. {row.get('source_title', '')}",
            "",
            f"**draft_id:** `{row.get('draft_id', '')}`",
            "",
            f"**status:** `{row.get('status', '')}`",
            "",
            f"**source:** `{row.get('source', '')}` / `{row.get('source_name', '')}`",
            "",
            f"**url:** {row.get('source_url', '')}",
            "",
            f"**date:** {row.get('source_date', '')}",
            "",
            f"**duration:** {row.get('duration', '')}",
            "",
            f"**suggested title:** {row.get('suggested_canonical_title', '')}",
            "",
            f"**suggested type:** `{row.get('suggested_content_type', '')}`",
            "",
            f"**suggested tags:** `{row.get('suggested_content_tags', '')}`",
            "",
            "**description:**",
            "",
            trim(row.get("source_description", "")),
            "",
            "---",
            "",
        ])

    REVIEW_PATH.write_text("\n".join(lines), encoding="utf-8")

    print(f"Drafts to review: {len(new_rows)}")
    print(f"Saved: {REVIEW_PATH}")


if __name__ == "__main__":
    main()