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
    text = re.sub(r"[^a-zа-я0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def get_known_tags():
    text = TAG_LABELS_PATH.read_text(encoding="utf-8")
    tags = set()

    for match in re.finditer(r'^[ \t]*(?:"([^"]+)"|([A-Za-z0-9_]+))\s*:', text, re.M):
        tags.add(match.group(1) or match.group(2))

    return tags


def get_card_items(card_id, links_by_card, items_by_id):
    result = []
    missing = []

    for link in links_by_card.get(card_id, []):
        content_id = clean(link.get("content_id"))
        item = items_by_id.get(content_id)

        if item:
            result.append(item)
        else:
            missing.append(content_id)

    return result, missing


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

    anime_cards = [
        card
        for card in cards
        if clean(card.get("content_type")) == "anime"
        and clean(card.get("is_active")) != "0"
    ]
    anime_card_ids = {clean(card.get("card_id")) for card in anime_cards}
    anime_items = [item for item in items if clean(item.get("content_type")) == "anime"]

    linked_to_anime_cards = set()
    card_reports = []

    for card in anime_cards:
        card_id = clean(card.get("card_id"))
        card_tags = split_tags(card.get("content_tags"))
        card_items, missing_items = get_card_items(card_id, links_by_card, items_by_id)

        for item in card_items:
            linked_to_anime_cards.add(clean(item.get("content_id")))

        report = {
            "id": card_id,
            "title": clean(card.get("card_title")),
            "rating": clean(card.get("rating")),
            "rating_source": clean(card.get("rating_source")),
            "tags": card_tags,
            "items": card_items,
            "missing_items": missing_items,
            "sources": Counter(source for item in card_items for source in get_sources(item)),
            "item_types": Counter(clean(item.get("content_type")) for item in card_items),
            "item_tags": Counter(tag for item in card_items for tag in split_tags(item.get("content_tags"))),
            "issues": [],
        }

        if not card_items:
            report["issues"].append("NO_ITEMS")
        if not report["rating"]:
            report["issues"].append("MISSING_RATING")
        if "anime" not in card_tags:
            report["issues"].append("CARD_TAGS_NO_ANIME")

        unknown_tags = [tag for tag in card_tags if tag not in known_tags]
        if unknown_tags:
            report["issues"].append("UNKNOWN_CARD_TAGS=" + ",".join(unknown_tags))

        duplicate_tags = [tag for tag, count in Counter(card_tags).items() if count > 1]
        if duplicate_tags:
            report["issues"].append("DUP_CARD_TAGS=" + ",".join(duplicate_tags))

        if missing_items:
            report["issues"].append("MISSING_LINK_ITEMS=" + ",".join(missing_items))

        for item in card_items:
            content_id = clean(item.get("content_id"))
            title = clean(item.get("canonical_title"))
            item_type = clean(item.get("content_type"))

            if item_type != "anime":
                report["issues"].append(f"NON_ANIME_ITEM={content_id}:{item_type}:{title}")

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

    similar_cards = []
    for index, first in enumerate(card_reports):
        for second in card_reports[index + 1 :]:
            first_title = normalize_title(first["title"])
            second_title = normalize_title(second["title"])

            if not first_title or not second_title:
                continue

            ratio = SequenceMatcher(None, first_title, second_title).ratio()
            if first_title == second_title or ratio >= 0.88:
                similar_cards.append((first, second, ratio))

    same_source_similar_items = []
    for report in card_reports:
        source_items = []

        for item in report["items"]:
            sources = get_sources(item) or ["none"]
            for source in sources:
                source_items.append(
                    (source, clean(item.get("content_id")), clean(item.get("canonical_title")))
                )

        for index, first in enumerate(source_items):
            for second in source_items[index + 1 :]:
                if first[0] != second[0] or first[1] == second[1]:
                    continue

                ratio = SequenceMatcher(
                    None,
                    normalize_title(first[2]),
                    normalize_title(second[2]),
                ).ratio()

                if ratio >= 0.92:
                    same_source_similar_items.append((report, first, second, ratio))

    unlinked_anime_items = [
        item
        for item in anime_items
        if clean(item.get("content_id")) not in linked_to_anime_cards
    ]

    linked_only_to_non_anime_cards = []
    for item in anime_items:
        content_id = clean(item.get("content_id"))
        card_ids = {clean(link.get("card_id")) for link in links_by_item.get(content_id, [])}
        non_anime_card_ids = [card_id for card_id in card_ids if card_id and card_id not in anime_card_ids]

        if non_anime_card_ids and content_id not in linked_to_anime_cards:
            linked_only_to_non_anime_cards.append((item, non_anime_card_ids))

    print("SUMMARY")
    print(f"anime_cards={len(anime_cards)}")
    print(f"anime_items={len(anime_items)}")
    print(f"linked_to_anime_cards_unique_items={len(linked_to_anime_cards)}")
    print(f"unlinked_anime_items={len(unlinked_anime_items)}")
    print(f"linked_only_to_non_anime_cards={len(linked_only_to_non_anime_cards)}")
    print(f"cards_with_missing_rating={sum(1 for report in card_reports if not report['rating'])}")
    print(f"cards_with_issues={sum(1 for report in card_reports if report['issues'])}")
    print()

    print("CARDS")
    for report in sorted(card_reports, key=lambda row: row["title"].lower()):
        print(
            f"{report['id']} | {report['title']} | rating={report['rating'] or '-'} "
            f"source={report['rating_source'] or '-'} | tags={','.join(report['tags']) or '-'} "
            f"| items={len(report['items'])} | sources={dict(report['sources'])} "
            f"| item_types={dict(report['item_types'])}"
        )
    print()

    print("CARD_ISSUES")
    has_card_issues = False
    for report in sorted(card_reports, key=lambda row: row["title"].lower()):
        if report["issues"]:
            has_card_issues = True
            print(f"{report['id']} | {report['title']}")
            for issue in report["issues"]:
                print(f"  - {issue}")
    if not has_card_issues:
        print("none")
    print()

    print("SIMILAR_CARD_TITLES")
    if similar_cards:
        for first, second, ratio in similar_cards:
            print(
                f"{first['id']}:{first['title']} <-> {second['id']}:{second['title']} "
                f"ratio={ratio:.3f}"
            )
    else:
        print("none")
    print()

    print("SAME_SOURCE_SIMILAR_ITEMS_WITHIN_CARD")
    if same_source_similar_items:
        for report, first, second, ratio in same_source_similar_items:
            print(
                f"{report['id']}:{report['title']} | {first[0]} | "
                f"{first[1]}:{first[2]} <-> {second[1]}:{second[2]} ratio={ratio:.3f}"
            )
    else:
        print("none")
    print()

    print("UNLINKED_ANIME_ITEMS")
    if unlinked_anime_items:
        for item in sorted(unlinked_anime_items, key=lambda row: clean(row.get("canonical_title")).lower()):
            content_id = clean(item.get("content_id"))
            linked_cards = [clean(link.get("card_id")) for link in links_by_item.get(content_id, [])]
            print(
                f"{content_id} | {clean(item.get('canonical_title'))} | "
                f"tags={clean(item.get('content_tags')) or '-'} | rating={clean(item.get('rating')) or '-'} "
                f"| date={clean(item.get('first_date')) or '-'} | duration={clean(item.get('duration_hours')) or '-'} "
                f"| sources={get_sources(item)} | linked_cards={linked_cards}"
            )
    else:
        print("none")
    print()

    print("ANIME_ITEMS_LINKED_ONLY_TO_NON_ANIME_CARDS")
    if linked_only_to_non_anime_cards:
        for item, card_ids in linked_only_to_non_anime_cards:
            print(f"{clean(item.get('content_id'))} | {clean(item.get('canonical_title'))} | cards={card_ids}")
    else:
        print("none")


if __name__ == "__main__":
    main()
