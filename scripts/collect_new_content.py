import csv
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parents[1]

CONTENT_ITEMS_PATH = ROOT / "public" / "data" / "content_items.csv"
DRAFTS_PATH = ROOT / "data" / "content_drafts.csv"
COOKIES_PATH = ROOT / "cookies.txt"
ENV_PATH = ROOT / ".env"

BOOSTY_LIMIT = 10
YOUTUBE_LIMIT = 10

BOOSTY_BLOG = "guzelka_games"

YOUTUBE_SOURCES = [
    {
        "source_name": "PAPAPACHUCA",
        "url": "https://www.youtube.com/@PAPAPACHUCA/videos",
        "section": "videos",
    },
    {
        "source_name": "PAPAPACHUCA",
        "url": "https://www.youtube.com/@PAPAPACHUCA/streams",
        "section": "streams",
    },
    {
        "source_name": "GUZ3LKA",
        "url": "https://www.youtube.com/@GUZ3LKA/videos",
        "section": "videos",
    },
    {
        "source_name": "GUZ3LKA",
        "url": "https://www.youtube.com/@GUZ3LKA/streams",
        "section": "streams",
    },
]

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


def load_env():
    if not ENV_PATH.exists():
        return

    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


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

    return [x.strip() for x in str(value).split("|") if x.strip()]


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


def make_draft_id(source, source_id):
    return f"{source}_{str(source_id).replace('/', '_')}"

def get_boosty_duration(post):
    for item in post.get("data", []):
        if item.get("type") == "ok_video":
            return str(item.get("duration") or "")

    return ""

def extract_boosty_description(post):
    descriptions = []

    for item in post.get("data", []):
        if item.get("type") == "text":
            content = item.get("content", "")

            if content:
                descriptions.append(content)

    return "\n".join(descriptions)

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


def make_draft(
    source,
    source_name,
    source_id,
    source_url,
    title,
    description="",
    source_date="",
    duration="",
    thumbnail="",
):
    content_type, content_tags = suggest_type_and_tags(title, description)

    return {
        "draft_id": make_draft_id(source, source_id),
        "status": "new",
        "source": source,
        "source_name": source_name,
        "source_id": source_id,
        "source_url": source_url,
        "source_title": title,
        "source_description": description,
        "source_date": source_date,
        "duration": duration,
        "suggested_canonical_title": title,
        "suggested_content_type": content_type,
        "suggested_content_tags": content_tags,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "imported_at": "",
        "thumbnail": thumbnail,
    }


def collect_boosty(existing_urls):
    boosty_token = os.getenv("BOOSTY_TOKEN", "")

    if not boosty_token:
        print("Boosty skipped: BOOSTY_TOKEN not found in .env")
        return []

    url = f"https://api.boosty.to/v1/blog/{BOOSTY_BLOG}/post/"

    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {boosty_token}",
        "x-app": "web",
        "x-currency": "USD",
        "x-locale": "en_US",
        "user-agent": "Mozilla/5.0",
    }

    params = {
        "limit": BOOSTY_LIMIT,
        "comments_limit": 0,
        "reply_limit": 0,
    }

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()

    payload = response.json()
    posts = payload.get("data", [])

    drafts = []

    for post in posts:
        source_id = str(post.get("id", ""))
        title = post.get("title") or ""
        description = post.get("teaser") or ""
        source_url = post.get("url") or f"https://boosty.to/{BOOSTY_BLOG}/posts/{source_id}"
        source_date = str(post.get("createdAt") or "")
        description = extract_boosty_description(post)
        duration = get_boosty_duration(post)
        

        if not source_id or not source_url or source_url in existing_urls:
            continue

        drafts.append(
            make_draft(
                source="boosty",
                source_name=BOOSTY_BLOG,
                source_id=source_id,
                source_url=source_url,
                title=title,
                description=description,
                source_date=source_date,
                duration=duration,
            )
        )

    return drafts


def collect_youtube(existing_urls):
    drafts = []

    for source in YOUTUBE_SOURCES:
        cmd = [
            "python",
            "-m",
            "yt_dlp",
            "--skip-download",
            "--ignore-errors",
            "--ignore-no-formats-error",
            "--playlist-end",
            str(YOUTUBE_LIMIT),
            "--print",
            '{"id":%(id)j,"title":%(title)j,"upload_date":%(upload_date)j,"timestamp":%(timestamp)j,"duration":%(duration)j,"duration_string":%(duration_string)j,"channel":%(channel)j,"webpage_url":%(webpage_url)j,"thumbnail":%(thumbnail)j,"description":%(description)j}',
        ]

        if COOKIES_PATH.exists():
            cmd.extend(["--cookies", str(COOKIES_PATH)])

        cmd.append(source["url"])

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

        if result.returncode != 0:
            print(f"YouTube failed: {source['source_name']} / {source['section']}")
            print(result.stderr)
            continue

        for line in result.stdout.splitlines():
            if not line.strip():
                continue

            data = json.loads(line)

            source_id = data.get("id", "")
            source_url = data.get("webpage_url", "")
            title = data.get("title", "")
            description = data.get("description", "") or ""
            source_date = data.get("upload_date", "") or ""
            duration = data.get("duration_string", "") or str(data.get("duration") or "")
            thumbnail=data.get("thumbnail", "") or ""

            if not source_id or not source_url or source_url in existing_urls:
                continue

            drafts.append(
                make_draft(
                    source="youtube",
                    source_name=f"{source['source_name']}:{source['section']}",
                    source_id=source_id,
                    source_url=source_url,
                    title=title,
                    description=description,
                    source_date=source_date,
                    duration=duration,
                    thumbnail=thumbnail,
                )
            )

    return drafts


def main():
    load_env()

    existing_urls = get_existing_urls()

    old_drafts = read_csv(DRAFTS_PATH)
    old_draft_ids = {row.get("draft_id", "") for row in old_drafts}

    new_drafts = []
    new_drafts.extend(collect_boosty(existing_urls))
    new_drafts.extend(collect_youtube(existing_urls))

    new_drafts = [
        row for row in new_drafts if row["draft_id"] not in old_draft_ids
    ]

    if not new_drafts:
        print("No new drafts found.")
        return

    result = old_drafts + new_drafts
    write_csv(DRAFTS_PATH, result, DRAFT_COLUMNS)

    print(f"Added drafts: {len(new_drafts)}")
    print(f"Saved: {DRAFTS_PATH}")


if __name__ == "__main__":
    main()