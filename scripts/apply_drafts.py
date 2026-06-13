import csv
import re
from pathlib import Path
from datetime import datetime, timezone

import pandas as pd
import hashlib

ROOT = Path(__file__).resolve().parents[1]

CONTENT_ITEMS_PATH = ROOT / "public" / "data" / "content_items.csv"
DRAFTS_PATH = ROOT / "data" / "content_drafts.csv"

def parse_source_date(value: str) -> str:
    value = str(value or "").strip()

    if not value:
        return ""

    # YouTube upload_date
    if value.isdigit() and len(value) == 8:
        try:
            return datetime.strptime(
                value,
                "%Y%m%d"
            ).strftime("%Y-%m-%d 00:00:00")
        except Exception:
            return value

    # Unix timestamp (Boosty)
    if value.isdigit():
        try:
            return datetime.fromtimestamp(
                int(value)
            ).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            return value

    # ISO дата
    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        ).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return value


def parse_duration_sec(value: str) -> str:
    value = str(value or "").strip()

    if not value:
        return ""

    # yt-dlp duration_string: 34:19 или 1:02:33
    parts = value.split(":")

    if all(part.isdigit() for part in parts):
        parts = [int(part) for part in parts]

        if len(parts) == 2:
            minutes, seconds = parts
            return str(minutes * 60 + seconds)

        if len(parts) == 3:
            hours, minutes, seconds = parts
            return str(hours * 3600 + minutes * 60 + seconds)

    # если уже секунды
    if value.isdigit():
        return value

    return ""


def duration_hours_from_sec(value: str) -> str:
    if not value:
        return ""

    try:
        return str(round(int(value) / 3600, 2))
    except Exception:
        return ""

def read_csv_or_empty(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()

    return pd.read_csv(path, dtype=str).fillna("")


def normalize_title(value: str) -> str:
    value = str(value).lower()
    value = value.replace("ё", "е")
    value = re.sub(r"[^a-zа-я0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def make_slug(value: str) -> str:
    value = normalize_title(value)
    value = re.sub(r"\s+", "_", value)
    return value[:80] or "content"


def make_unique_content_id(base: str, existing_ids: set[str]) -> str:
    content_id = base
    counter = 2

    while content_id in existing_ids:
        content_id = f"{base}_{counter}"
        counter += 1

    existing_ids.add(content_id)
    return content_id


def parse_tags(value: str) -> str:
    if not value:
        return ""

    tags = [
        tag.strip()
        for tag in str(value).split(",")
        if tag.strip()
    ]

    return ",".join(sorted(set(tags)))

def make_content_id(value):
    return (
        "cnt_" +
        hashlib.md5(
            str(value).encode("utf-8")
        ).hexdigest()[:10]
    )

def draft_to_content_row(draft: pd.Series, columns: list[str], existing_ids: set[str]) -> dict:
    title = draft.get("suggested_canonical_title") or draft.get("source_title") or ""
    normalized_title = normalize_title(title)

    content_id = make_unique_content_id(
        make_content_id(title),
        existing_ids,
    )

    row = {col: "" for col in columns}

    source = draft.get("source", "")
    source_url = draft.get("source_url", "")
    source_description = draft.get("source_description", "")
    source_date = parse_source_date(draft.get("source_date", ""))
    duration_sec = parse_duration_sec(draft.get("duration", ""))
    duration_hours = duration_hours_from_sec(duration_sec)

    values = {
        "content_id": content_id,
        "canonical_title": title,
        "normalized_title": normalized_title,
        "content_type": draft.get("suggested_content_type", ""),
        "content_tags": parse_tags(draft.get("suggested_content_tags", "")),
        "first_date": source_date,
        "last_date": source_date,
        "duration_sec": duration_sec,
        "duration_hours": duration_hours,
        "records_count": "1",
        "sources": source,
        "rating": "",
        "rating_source": "",
        "youtube_url": "",
        "telegram_url": "",
        "boosty_url": "",
        "youtube_description": "",
        "telegram_description": "",
        "boosty_description": "",
        "youtube_channel": "",
        "thumbnail": draft.get("thumbnail", ""),
    }

    if source == "youtube":
        values["youtube_url"] = source_url
        values["youtube_description"] = source_description
        values["youtube_channel"] = str(draft.get("source_name", "")).split(":")[0]

    elif source == "telegram":
        values["telegram_url"] = source_url
        values["telegram_description"] = source_description

    elif source == "boosty":
        values["boosty_url"] = source_url
        values["boosty_description"] = source_description

    for key, value in values.items():
        if key in row:
            row[key] = value

    return row


def main():
    content_df = read_csv_or_empty(CONTENT_ITEMS_PATH)
    drafts_df = read_csv_or_empty(DRAFTS_PATH)

    if drafts_df.empty:
        print("No drafts file or drafts file is empty.")
        return

    approved_df = drafts_df[drafts_df["status"] == "approved"].copy()

    if approved_df.empty:
        print("No approved drafts.")
        return

    if content_df.empty:
        raise ValueError("content_items.csv is empty or not found.")

    columns = list(content_df.columns)
    existing_ids = set(content_df["content_id"].astype(str))

    new_rows = [
        draft_to_content_row(row, columns, existing_ids)
        for _, row in approved_df.iterrows()
    ]

    print(columns)

    new_content_df = pd.DataFrame(new_rows, columns=columns)

    result_content_df = pd.concat(
        [content_df, new_content_df],
        ignore_index=True,
    )

    result_content_df.to_csv(
        CONTENT_ITEMS_PATH,
        index=False,
        quoting=csv.QUOTE_MINIMAL,
    )

    print(new_content_df.head().T)

    now = datetime.now().isoformat(timespec="seconds")

    drafts_df.loc[drafts_df["status"] == "approved", "status"] = "imported"
    drafts_df.loc[drafts_df["status"] == "imported", "imported_at"] = now

    drafts_df.to_csv(
        DRAFTS_PATH,
        index=False,
        quoting=csv.QUOTE_MINIMAL,
    )

    print(f"Imported rows: {len(new_rows)}")
    print(f"Updated: {CONTENT_ITEMS_PATH}")
    print(f"Updated: {DRAFTS_PATH}")


if __name__ == "__main__":
    main()