import csv
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parent.parent

CONTENT_ITEMS_PATH = BASE_DIR / "public/data/content_items_copy.csv"
CONTENT_CARDS_PATH = BASE_DIR / "public/data/content_cards.csv"
CONTENT_CARD_ITEMS_PATH = BASE_DIR / "public/data/content_card_items.csv"

OUT_CARDS_PATH = BASE_DIR / "data/generated_content_cards.csv"
OUT_CARD_ITEMS_PATH = BASE_DIR / "data/generated_content_card_items.csv"


def read_csv(path: Path):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def clean(value):
    return str(value or "").strip()


def title_key(value):
    return clean(value).lower()


def split_tags(value):
    return [
        tag.strip()
        for tag in clean(value).split(",")
        if tag.strip()
    ]


def main():
    items = read_csv(CONTENT_ITEMS_PATH)
    cards = read_csv(CONTENT_CARDS_PATH)
    card_items = read_csv(CONTENT_CARD_ITEMS_PATH)

    linked_content_ids = {
        clean(row["content_id"])
        for row in card_items
        if clean(row.get("content_id"))
    }

    card_by_title = {
        title_key(row["card_title"]): row
        for row in cards
        if clean(row.get("card_title"))
    }

    max_card_id = max(
        int(clean(row["card_id"]))
        for row in cards
        if clean(row.get("card_id")).isdigit()
    )

    max_sort_order_by_card = defaultdict(int)

    for row in card_items:
        card_id = clean(row.get("card_id"))
        sort_order = clean(row.get("sort_order"))

        if not card_id:
            continue

        try:
            order = int(float(sort_order))
        except ValueError:
            order = 0

        max_sort_order_by_card[card_id] = max(
            max_sort_order_by_card[card_id],
            order,
        )

    groups = defaultdict(list)

    for item in items:
        content_id = clean(item.get("content_id"))
        content_type = clean(item.get("content_type"))
        canonical_title = clean(item.get("canonical_title"))

        if not content_id:
            continue

        if content_type != "movie":
            continue

        if not canonical_title:
            continue

        groups[title_key(canonical_title)].append(item)

    generated_cards = []
    generated_card_items = []

    for key, group in groups.items():
        if len(group) < 2:
            continue

        unlinked_items = [
            item for item in group
            if clean(item.get("content_id")) not in linked_content_ids
        ]

        if not unlinked_items:
            continue

        existing_card = card_by_title.get(key)

        if existing_card:
            card_id = clean(existing_card["card_id"])
            card_title = clean(existing_card["card_title"])
        else:
            max_card_id += 1
            card_id = str(max_card_id)
            card_title = clean(group[0].get("canonical_title"))

            tags = []
            for item in group:
                for tag in split_tags(item.get("content_tags")):
                    if tag not in tags:
                        tags.append(tag)

            rating = next(
                (clean(item.get("rating")) for item in group if clean(item.get("rating"))),
                "",
            )

            rating_source = next(
                (clean(item.get("rating_source")) for item in group if clean(item.get("rating_source"))),
                "",
            )

            generated_cards.append({
                "card_id": card_id,
                "card_title": card_title,
                "content_type": "movie",
                "content_tags": ",".join(tags),
                "rating": rating,
                "rating_source": rating_source,
                "is_active": "1",
            })

        current_sort_order = max_sort_order_by_card[card_id]

        for item in unlinked_items:
            current_sort_order += 1

            generated_card_items.append({
                "card_id": card_id,
                "content_id": clean(item.get("content_id")),
                "sort_order": str(current_sort_order),
                "card_name": card_title,
            })

        max_sort_order_by_card[card_id] = current_sort_order

    write_csv(
        OUT_CARDS_PATH,
        generated_cards,
        [
            "card_id",
            "card_title",
            "content_type",
            "content_tags",
            "rating",
            "rating_source",
            "is_active",
        ],
    )

    write_csv(
        OUT_CARD_ITEMS_PATH,
        generated_card_items,
        [
            "card_id",
            "content_id",
            "sort_order",
            "card_name",
        ],
    )

    print(f"Generated cards: {len(generated_cards)}")
    print(f"Generated card items: {len(generated_card_items)}")
    print(f"Cards file: {OUT_CARDS_PATH}")
    print(f"Card items file: {OUT_CARD_ITEMS_PATH}")


if __name__ == "__main__":
    main()