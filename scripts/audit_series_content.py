import csv
import re
from collections import Counter, defaultdict
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ITEMS_PATH = ROOT / "public" / "data" / "content_items.csv"
CARDS_PATH = ROOT / "public" / "data" / "content_cards.csv"
LINKS_PATH = ROOT / "public" / "data" / "content_card_items.csv"
TAG_LABELS_PATH = ROOT / "src" / "lib" / "tagLabels.ts"
CONTENT_TYPE = "series"


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def clean(value):
    return str(value or "").strip()


def split_tags(value):
    return [tag.strip() for tag in clean(value).split(",") if tag.strip()]


def parse_date(value):
    text = clean(value)
    if not text:
        return None

    for date_format in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, date_format)
        except ValueError:
            pass

    return "invalid"


def get_sources(row):
    sources = []
    if clean(row.get("boosty_url")):
        sources.append("boosty")
    if clean(row.get("telegram_url")):
        sources.append("telegram")
    if clean(row.get("youtube_url")):
        sources.append("youtube")
    return sources


def normalize_title(value):
    text = clean(value).lower().replace("ё", "е")
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"\[[^]]*\]", " ", text)
    text = re.sub(r"\b(series|сериал|season|сезон|серии?|s|e|ep)\b", " ", text)
    text = re.sub(r"#\s*\d+", " ", text)
    text = re.sub(r"[^a-zа-я0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def get_known_tags():
    text = TAG_LABELS_PATH.read_text(encoding="utf-8")
    tags = set()

    for match in re.finditer(r'^[ \t]*(?:"([^"]+)"|([A-Za-z0-9_]+))\s*:', text, re.M):
        tags.add(match.group(1) or match.group(2))

    return tags


def main():
    items = read_csv(ITEMS_PATH)
    cards = read_csv(CARDS_PATH)
    links = read_csv(LINKS_PATH)
    known_tags = get_known_tags()

    items_by_id = {
        clean(row.get("content_id")): row
        for row in items
        if clean(row.get("content_id"))
    }

    links_by_card = defaultdict(list)
    links_by_item = defaultdict(list)
    for link in links:
        card_id = clean(link.get("card_id"))
        content_id = clean(link.get("content_id"))
        if card_id:
            links_by_card[card_id].append(link)
        if content_id:
            links_by_item[content_id].append(link)

    type_cards = [
        card
        for card in cards
        if clean(card.get("content_type")) == CONTENT_TYPE
        and clean(card.get("is_active")) != "0"
    ]
    type_card_ids = {clean(card.get("card_id")) for card in type_cards}
    type_items = [item for item in items if clean(item.get("content_type")) == CONTENT_TYPE]

    linked_to_type_cards = set()
    card_reports = []

    for card in type_cards:
        card_id = clean(card.get("card_id"))
        card_tags = split_tags(card.get("content_tags"))
        linked_items = []
        missing_items = []

        for link in links_by_card.get(card_id, []):
            content_id = clean(link.get("content_id"))
            item = items_by_id.get(content_id)
            if item:
                linked_items.append(item)
                linked_to_type_cards.add(content_id)
            else:
                missing_items.append(content_id)

        report = {
            "id": card_id,
            "title": clean(card.get("card_title")),
            "rating": clean(card.get("rating")),
            "rating_source": clean(card.get("rating_source")),
            "tags": card_tags,
            "items": linked_items,
            "sources": Counter(source for item in linked_items for source in get_sources(item)),
            "item_types": Counter(clean(item.get("content_type")) for item in linked_items),
            "issues": [],
        }

        if not linked_items:
            report["issues"].append("NO_ITEMS")
        if not report["rating"]:
            report["issues"].append("MISSING_RATING")
        if report["rating"] and not report["rating_source"]:
            report["issues"].append("RATING_WITHOUT_SOURCE")
        if CONTENT_TYPE not in card_tags:
            report["issues"].append(f"CARD_TAGS_NO_{CONTENT_TYPE.upper()}")

        unknown_tags = [tag for tag in card_tags if tag not in known_tags]
        if unknown_tags:
            report["issues"].append("UNKNOWN_CARD_TAGS=" + ",".join(unknown_tags))

        duplicate_tags = [tag for tag, count in Counter(card_tags).items() if count > 1]
        if duplicate_tags:
            report["issues"].append("DUP_CARD_TAGS=" + ",".join(duplicate_tags))

        if missing_items:
            report["issues"].append("MISSING_LINK_ITEMS=" + ",".join(missing_items))

        for item in linked_items:
            content_id = clean(item.get("content_id"))
            title = clean(item.get("canonical_title"))
            item_type = clean(item.get("content_type"))

            if item_type != CONTENT_TYPE:
                report["issues"].append(f"NON_{CONTENT_TYPE.upper()}_ITEM={content_id}:{item_type}:{title}")

            first_date = parse_date(item.get("first_date"))
            last_date = parse_date(item.get("last_date"))
            if first_date == "invalid" or last_date == "invalid":
                report["issues"].append(
                    f"BAD_DATE={content_id}:{clean(item.get('first_date'))}/{clean(item.get('last_date'))}"
                )
            if not clean(item.get("first_date")) and not clean(item.get("last_date")):
                report["issues"].append(f"MISSING_DATE={content_id}:{title}")

            duration = clean(item.get("duration_hours"))
            if not duration:
                report["issues"].append(f"MISSING_DURATION={content_id}:{title}")
            else:
                try:
                    if float(duration) <= 0:
                        report["issues"].append(f"ZERO_DURATION={content_id}:{title}:{duration}")
                except ValueError:
                    report["issues"].append(f"BAD_DURATION={content_id}:{title}:{duration}")

            if not get_sources(item):
                report["issues"].append(f"NO_SOURCE_URL={content_id}:{title}")

        card_reports.append(report)

    auto_items = [
        item
        for item in type_items
        if clean(item.get("content_id")) not in linked_to_type_cards
    ]

    similar_cards = []
    for index, first in enumerate(card_reports):
        for second in card_reports[index + 1 :]:
            first_title = normalize_title(first["title"])
            second_title = normalize_title(second["title"])
            if not first_title or not second_title:
                continue
            ratio = SequenceMatcher(None, first_title, second_title).ratio()
            if first_title == second_title or ratio >= 0.9:
                similar_cards.append((first, second, ratio))

    exact_same_source_items = []
    for report in card_reports:
        bucket = defaultdict(list)
        for item in report["items"]:
            for source in get_sources(item) or ["none"]:
                bucket[(source, normalize_title(item.get("canonical_title")))].append(
                    (clean(item.get("content_id")), clean(item.get("canonical_title")))
                )
        for (source, _), values in bucket.items():
            if len(values) > 1:
                exact_same_source_items.append((report, source, values))

    multi_type_cards = defaultdict(list)
    for report in card_reports:
        for item in report["items"]:
            content_id = clean(item.get("content_id"))
            multi_type_cards[content_id].append(
                (report["id"], report["title"], clean(item.get("canonical_title")), clean(item.get("content_type")), get_sources(item))
            )
    multi_type_cards = {
        content_id: values
        for content_id, values in multi_type_cards.items()
        if len({value[0] for value in values}) > 1
    }

    linked_only_to_other_type_cards = []
    for item in type_items:
        content_id = clean(item.get("content_id"))
        card_ids = {clean(link.get("card_id")) for link in links_by_item.get(content_id, [])}
        other_card_ids = [card_id for card_id in card_ids if card_id and card_id not in type_card_ids]
        if other_card_ids and content_id not in linked_to_type_cards:
            linked_only_to_other_type_cards.append((item, other_card_ids))

    print("COUNTS")
    print(f"manual_{CONTENT_TYPE}_cards={len(type_cards)}")
    print(f"auto_single_{CONTENT_TYPE}_cards_from_unlinked_items={len(auto_items)}")
    print(f"visual_{CONTENT_TYPE}_cards_total_estimate={len(type_cards) + len(auto_items)}")
    print(f"{CONTENT_TYPE}_items={len(type_items)}")
    print(f"unique_items_linked_to_manual_{CONTENT_TYPE}_cards={len(linked_to_type_cards)}")
    print()

    print("MANUAL_CARDS")
    for report in sorted(card_reports, key=lambda row: row["title"].lower()):
        print(
            f"{report['id']} | {report['title']} | rating={report['rating'] or '-'} "
            f"source={report['rating_source'] or '-'} | tags={','.join(report['tags']) or '-'} "
            f"| items={len(report['items'])} | sources={dict(report['sources'])} "
            f"| item_types={dict(report['item_types'])}"
        )
    print()

    print("MANUAL_CARDS_WITH_ISSUES")
    issue_reports = [report for report in card_reports if report["issues"]]
    print(len(issue_reports))
    for report in sorted(issue_reports, key=lambda row: row["title"].lower()):
        print(f"{report['id']} | {report['title']}")
        for issue in report["issues"]:
            print(f"  - {issue}")
    print()

    print("AUTO_SINGLE_ITEMS")
    print(len(auto_items))
    for item in sorted(auto_items, key=lambda row: clean(row.get("canonical_title")).lower()):
        print(
            f"{clean(item.get('content_id'))} | {clean(item.get('canonical_title'))} | "
            f"rating={clean(item.get('rating')) or '-'} source={clean(item.get('rating_source')) or '-'} "
            f"| date={clean(item.get('first_date')) or '-'} | duration={clean(item.get('duration_hours')) or '-'} "
            f"| sources={get_sources(item)} | tags={clean(item.get('content_tags')) or '-'}"
        )
    print()

    print("AUTO_SINGLE_ITEMS_MISSING_RATING")
    missing_auto_rating = [item for item in auto_items if not clean(item.get("rating"))]
    print(len(missing_auto_rating))
    for item in missing_auto_rating:
        print(f"{clean(item.get('content_id'))} | {clean(item.get('canonical_title'))}")
    print()

    print("SIMILAR_MANUAL_CARD_TITLES")
    print(len(similar_cards))
    for first, second, ratio in similar_cards:
        print(f"{first['id']}:{first['title']} <-> {second['id']}:{second['title']} ratio={ratio:.3f}")
    print()

    print("EXACT_SAME_TITLE_SAME_SOURCE_WITHIN_CARD")
    print(len(exact_same_source_items))
    for report, source, values in exact_same_source_items:
        print(f"{report['id']}:{report['title']} | {source} | {values}")
    print()

    print("SAME_CONTENT_ID_IN_MULTIPLE_MANUAL_SERIES_CARDS")
    print(len(multi_type_cards))
    for content_id, values in multi_type_cards.items():
        print(content_id, values)
    print()

    print("SERIES_ITEMS_LINKED_ONLY_TO_NON_SERIES_CARDS")
    print(len(linked_only_to_other_type_cards))
    for item, card_ids in linked_only_to_other_type_cards:
        print(f"{clean(item.get('content_id'))} | {clean(item.get('canonical_title'))} | cards={card_ids}")


if __name__ == "__main__":
    main()
