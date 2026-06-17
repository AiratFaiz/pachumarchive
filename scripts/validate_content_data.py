import csv
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"

CONTENT_ITEMS_PATH = DATA_DIR / "content_items.csv"
CONTENT_CARDS_PATH = DATA_DIR / "content_cards.csv"
CONTENT_CARD_ITEMS_PATH = DATA_DIR / "content_card_items.csv"
TAG_LABELS_PATH = ROOT / "src" / "lib" / "tagLabels.ts"
CONTENT_META_PATH = ROOT / "src" / "lib" / "contentMeta.ts"

SOURCE_URL_FIELDS = ("boosty_url", "telegram_url", "youtube_url")
RATED_TYPES = {"anime", "movie", "series"}


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def read_header(path):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return next(csv.reader(f))


def clean(value):
    return str(value or "").strip()


def split_tags(value):
    return [tag.strip() for tag in str(value or "").split(",") if tag.strip()]


def find_duplicates(values):
    counts = Counter(values)
    return [value for value, count in counts.items() if count > 1]


def load_ts_record_keys(path, export_name):
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"export const {export_name}[^=]*=\s*{{(.*?)}};", text, re.S)
    if not match:
        raise RuntimeError(f"Could not find {export_name} in {path}")

    keys = set()
    for raw_key in re.findall(r"^\s*([^:\n]+):", match.group(1), re.M):
        key = raw_key.strip().strip('"\'')
        if key:
            keys.add(key)

    return keys


def report(label, issues, formatter, limit=50):
    if not issues:
        print(f"{label}: ok")
        return 0

    print(f"{label}: {len(issues)} issue(s)")
    for issue in issues[:limit]:
        print(f"- {formatter(issue)}")
    if len(issues) > limit:
        print(f"- ... {len(issues) - limit} more")

    return len(issues)


def report_header_issues(path):
    header = read_header(path)
    duplicate_headers = find_duplicates([name for name in header if name])
    blank_positions = [str(index + 1) for index, name in enumerate(header) if not name]
    issues = []

    for name in duplicate_headers:
        issues.append(f"duplicate header {name!r}")
    if blank_positions:
        issues.append(f"blank header column(s): {', '.join(blank_positions)}")

    return report(
        f"{path.relative_to(ROOT)} headers",
        issues,
        lambda issue: issue,
    )


def report_duplicate_tags(label, rows, id_field, title_field):
    issues = []

    for row in rows:
        tags = split_tags(row.get("content_tags"))
        duplicates = find_duplicates(tags)

        if duplicates:
            issues.append((row, duplicates))

    return report(
        f"{label} duplicate tags",
        issues,
        lambda issue: (
            f"{clean(issue[0].get(id_field))}: "
            f"{clean(issue[0].get(title_field))} ({', '.join(issue[1])})"
        ),
    )


def valid_datetime(value):
    if not clean(value):
        return True

    try:
        datetime.strptime(clean(value), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return False

    return True


def valid_rating(value):
    if not clean(value):
        return True


    try:
        rating = float(clean(value).replace(",", "."))
    except ValueError:
        return False

    return 0 <= rating <= 10


def has_source_url(row):
    return any(clean(row.get(field)) for field in SOURCE_URL_FIELDS)


def main():
    issue_count = 0

    for path in (CONTENT_ITEMS_PATH, CONTENT_CARDS_PATH, CONTENT_CARD_ITEMS_PATH):
        issue_count += report_header_issues(path)

    cards = read_csv(CONTENT_CARDS_PATH)
    items = read_csv(CONTENT_ITEMS_PATH)
    card_items = read_csv(CONTENT_CARD_ITEMS_PATH)

    valid_content_types = load_ts_record_keys(CONTENT_META_PATH, "contentTypeLabels")
    valid_tags = load_ts_record_keys(TAG_LABELS_PATH, "tagLabels")
    card_ids = {clean(row.get("card_id")) for row in cards if clean(row.get("card_id"))}
    content_ids = {
        clean(row.get("content_id")) for row in items if clean(row.get("content_id"))
    }

    issue_count += report_duplicate_tags(
        "content_cards.csv",
        cards,
        "card_id",
        "card_title",
    )
    issue_count += report_duplicate_tags(
        "content_items.csv",
        items,
        "content_id",
        "canonical_title",
    )

    issue_count += report(
        "content_cards.csv empty card_title",
        [row for row in cards if not clean(row.get("card_title"))],
        lambda row: clean(row.get("card_id")) or "<missing card_id>",
    )
    issue_count += report(
        "content_items.csv empty canonical_title",
        [row for row in items if not clean(row.get("canonical_title"))],
        lambda row: clean(row.get("content_id")) or "<missing content_id>",
    )

    issue_count += report(
        "content_cards.csv unknown content_type",
        [
            row
            for row in cards
            if clean(row.get("content_type"))
            and clean(row.get("content_type")) not in valid_content_types
        ],
        lambda row: (
            f"{clean(row.get('card_id'))}: {clean(row.get('card_title'))} "
            f"({clean(row.get('content_type'))})"
        ),
    )
    issue_count += report(
        "content_items.csv unknown content_type",
        [
            row
            for row in items
            if clean(row.get("content_type"))
            and clean(row.get("content_type")) not in valid_content_types
        ],
        lambda row: (
            f"{clean(row.get('content_id'))}: {clean(row.get('canonical_title'))} "
            f"({clean(row.get('content_type'))})"
        ),
    )

    card_unknown_tags = [
        (row, tag)
        for row in cards
        for tag in split_tags(row.get("content_tags"))
        if tag not in valid_tags
    ]
    item_unknown_tags = [
        (row, tag)
        for row in items
        for tag in split_tags(row.get("content_tags"))
        if tag not in valid_tags
    ]
    issue_count += report(
        "content_cards.csv unknown tags",
        card_unknown_tags,
        lambda issue: (
            f"{clean(issue[0].get('card_id'))}: "
            f"{clean(issue[0].get('card_title'))} ({issue[1]})"
        ),
    )
    issue_count += report(
        "content_items.csv unknown tags",
        item_unknown_tags,
        lambda issue: (
            f"{clean(issue[0].get('content_id'))}: "
            f"{clean(issue[0].get('canonical_title'))} ({issue[1]})"
        ),
    )

    issue_count += report(
        "content_card_items.csv broken card_id",
        [row for row in card_items if clean(row.get("card_id")) not in card_ids],
        lambda row: (
            f"card_id={clean(row.get('card_id')) or '<blank>'}, "
            f"content_id={clean(row.get('content_id'))}"
        ),
    )
    issue_count += report(
        "content_card_items.csv broken content_id",
        [row for row in card_items if clean(row.get("content_id")) not in content_ids],
        lambda row: (
            f"card_id={clean(row.get('card_id'))}, "
            f"content_id={clean(row.get('content_id')) or '<blank>'}"
        ),
    )

    date_issues = []
    for row in items:
        for field in ("first_date", "last_date"):
            if not valid_datetime(row.get(field)):
                date_issues.append((row, field, clean(row.get(field))))

    issue_count += report(
        "content_items.csv invalid dates",
        date_issues,
        lambda issue: (
            f"{clean(issue[0].get('content_id'))}: "
            f"{clean(issue[0].get('canonical_title'))} "
            f"{issue[1]}={issue[2]!r}"
        ),
    )

    issue_count += report(
        "content_items.csv missing source URL",
        [row for row in items if not has_source_url(row)],
        lambda row: f"{clean(row.get('content_id'))}: {clean(row.get('canonical_title'))}",
    )

    issue_count += report(
        "content_cards.csv invalid rating",
        [row for row in cards if not valid_rating(row.get("rating"))],
        lambda row: (
            f"{clean(row.get('card_id'))}: {clean(row.get('card_title'))} "
            f"({clean(row.get('rating'))})"
        ),
    )
    issue_count += report(
        "content_items.csv invalid rating",
        [row for row in items if not valid_rating(row.get("rating"))],
        lambda row: (
            f"{clean(row.get('content_id'))}: {clean(row.get('canonical_title'))} "
            f"({clean(row.get('rating'))})"
        ),
    )
    issue_count += report(
        "content_cards.csv rated type without rating",
        [
            row
            for row in cards
            if clean(row.get("content_type")) in RATED_TYPES
            and clean(row.get("is_active")) != "0"
            and not clean(row.get("rating"))
        ],
        lambda row: f"{clean(row.get('card_id'))}: {clean(row.get('card_title'))}",
    )

    if issue_count:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
