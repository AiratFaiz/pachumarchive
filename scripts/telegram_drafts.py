import csv
import json
import re
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

INPUT_FILE = ROOT / "data" / "telegram" / "result.json"
CONTENT_ITEMS_PATH = ROOT / "public" / "data" / "content_items.csv"
DRAFTS_PATH = ROOT / "data" / "content_drafts.csv"

CHANNEL_USERNAME = "gzlkgms"
TELEGRAM_LIMIT = 20

DRAFT_COLUMNS = [
    "draft_id",
    "status",
    "source",
    "source_name",
    "source_id",
    "source_url",
    "source_title",
    "source_description",
    "source_date",
    "duration",
    "suggested_canonical_title",
    "suggested_content_type",
    "suggested_content_tags",
    "created_at",
    "imported_at",
    "thumbnail",
]


def read_csv(path):
    if not path.exists():
        return []

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, columns):
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def split_urls(value):
    if not value:
        return []

    return [
        x.strip()
        for x in str(value).split("|")
        if x.strip()
    ]


def get_existing_urls():
    urls = set()

    for row in read_csv(CONTENT_ITEMS_PATH):
        for col in ["youtube_url", "telegram_url", "boosty_url"]:
            for url in split_urls(row.get(col, "")):
                urls.add(url)

    for row in read_csv(DRAFTS_PATH):
        for url in split_urls(row.get("source_url", "")):
            urls.add(url)

    return urls


def flatten_text(value):
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        parts = []

        for item in value:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                parts.append(item.get("text", ""))

        return "".join(parts)

    return ""


def parse_title_and_stream_date(text):
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    title = lines[0] if lines else ""
    stream_date = ""

    for line in lines:
        match = re.search(r"\b(\d{2}\.\d{2}\.\d{4})\b", line)

        if match:
            stream_date = match.group(1)
            break

    return title, stream_date


def normalize_telegram_date(value):
    value = str(value or "").strip()

    if not value:
        return ""

    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        ).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return value


def suggest_type_and_tags(title, description=""):
    text = f"{title} {description}".lower()

    content_type = ""
    tags = set()

    rules = [
        ("battle_rap", "kbk", ["кубок мц", "кубка мц"]),
        ("battle_rap", "rbl", ["rbl"]),
        ("battle_rap", "slovo", ["slovo", "слово"]),
        ("battle_rap", "versus", ["versus"]),
        ("battle_rap", "strela", ["strelaspb"]),
        ("battle_rap", "140", ["140 bpm", "140"]),
        ("battle_rap", "rnb", ["рвать на битах", "рнб"]),
        ("battle_rap", "bcb", ["бчб", "больше чем баттл"]),
        ("battle_rap", "chsv", ["чсв"]),

        ("game", "re", ["resident evil"]),
        ("game", "kcd", ["kingdom come"]),
        ("game", "gta", ["gta"]),
        ("game", "minecraft", ["майнкрафт"]),
        ("game", "dark_souls", ["dark souls"]),
        ("game", "outlast", ["outlast"]),
        ("game", "subnautica", ["subnautica"]),

        ("series", "sverh", ["сверхъестественное"]),
        ("series", "bb", ["во все тяжкие", "все тяжкие"]),

        ("anime", "naruto", ["наруто"]),

        ("music", "music", ["альбом"]),
    ]

    for rule_type, tag, patterns in rules:
        if any(pattern in text for pattern in patterns):
            if not content_type:
                content_type = rule_type
            tags.add(tag)

    return content_type, ",".join(sorted(tags))


def seconds_to_hms(seconds):
    if not seconds:
        return ""

    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60

    return f"{h:02d}:{m:02d}:{s:02d}"


def parse_streams_from_telegram_export(input_file):
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    messages = data.get("messages", [])

    streams = []
    current_stream = None

    for message in messages:
        if message.get("type") != "message":
            continue

        text = flatten_text(message.get("text", "")).strip()
        has_video = message.get("media_type") == "video_file"

        if text:
            title, stream_date = parse_title_and_stream_date(text)

            current_stream = {
                "first_message_id": message.get("id"),
                "last_message_id": message.get("id"),
                "telegram_url": f"https://t.me/{CHANNEL_USERNAME}/{message.get('id')}",
                "post_date": normalize_telegram_date(message.get("date")),
                "title": title,
                "stream_date": stream_date,
                "text": text,
                "parts_count": 0,
                "total_duration_seconds": 0,
                "message_ids": [],
            }

            streams.append(current_stream)

        if not current_stream:
            continue

        if has_video:
            current_stream["parts_count"] += 1
            current_stream["last_message_id"] = message.get("id")
            current_stream["message_ids"].append(str(message.get("id")))

            duration = message.get("duration_seconds") or 0
            current_stream["total_duration_seconds"] += int(duration)

    for stream in streams:
        stream["duration_hms"] = seconds_to_hms(
            stream["total_duration_seconds"]
        )
        stream["message_ids"] = ", ".join(stream["message_ids"])

    return streams


def make_draft_id(source_id):
    return f"telegram_{source_id}"


def stream_to_draft(stream):
    title = stream.get("title") or f"Telegram post {stream.get('first_message_id')}"
    description = stream.get("text") or ""
    content_type, content_tags = suggest_type_and_tags(title, description)

    return {
        "draft_id": make_draft_id(stream.get("first_message_id")),
        "status": "new",
        "source": "telegram",
        "source_name": CHANNEL_USERNAME,
        "source_id": str(stream.get("first_message_id")),
        "source_url": stream.get("telegram_url", ""),
        "source_title": title,
        "source_description": description,
        "source_date": stream.get("post_date", ""),
        "duration": stream.get("duration_hms", ""),
        "suggested_canonical_title": title,
        "suggested_content_type": content_type,
        "suggested_content_tags": content_tags,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "imported_at": "",
        "thumbnail": "",
    }


def main():
    if not INPUT_FILE.exists():
        print(f"Telegram export not found: {INPUT_FILE}")
        return

    existing_urls = get_existing_urls()
    old_drafts = read_csv(DRAFTS_PATH)
    old_draft_ids = {row.get("draft_id", "") for row in old_drafts}

    streams = parse_streams_from_telegram_export(INPUT_FILE)

    # берем только последние N сущностей
    streams = streams[-TELEGRAM_LIMIT:]

    new_drafts = []

    for stream in streams:
        telegram_url = stream.get("telegram_url", "")

        if telegram_url in existing_urls:
            continue

        draft = stream_to_draft(stream)

        if draft["draft_id"] in old_draft_ids:
            continue

        new_drafts.append(draft)

    if not new_drafts:
        print("No new Telegram drafts found.")
        return

    result = old_drafts + new_drafts
    write_csv(DRAFTS_PATH, result, DRAFT_COLUMNS)

    print(f"Added Telegram drafts: {len(new_drafts)}")
    print(f"Saved: {DRAFTS_PATH}")


if __name__ == "__main__":
    main()