# Pachuca Archive

Архив контента Пачуки с поиском, фильтрацией и ссылками на оригинальные записи.

Сайт собирает данные из нескольких источников:

* YouTube (PAPAPACHUCA, GUZ3LKA)
* Telegram (перезаливы)
* Boosty

Каждая запись представляет собой отдельную единицу контента (стрим, реакцию, прохождение, фильм и т.д.).

---

## Технологии

* Next.js
* React
* TypeScript
* Tailwind CSS
* Vercel

---

## Структура данных

Основная таблица:

```text
public/data/content_items.csv
```

Основные поля:

* content_id
* canonical_title
* content_type
* content_tags
* first_date
* youtube_url
* telegram_url
* boosty_url

---

## Автоматизация

Новые записи сначала попадают в черновики:

```text
data/content_drafts.csv
```

После проверки импортируются в основную таблицу.

Схема:

```text
YouTube
Boosty
Telegram
        ↓
content_drafts.csv
        ↓
ручная модерация
        ↓
content_items.csv
        ↓
сайт
```

---

## Обновление данных

### YouTube + Boosty

Собрать новые записи:

```bash
python scripts/collect_new_content.py
```

### Telegram

Экспортировать канал в:

```text
data/telegram/result.json
```

После чего выполнить:

```bash
python scripts/collect_telegram_drafts.py
```

### Импорт записей

После проверки изменить:

```text
status = approved
```

и выполнить:

```bash
python scripts/apply_drafts.py
```

---

## Локальный запуск

Установка зависимостей:

```bash
npm install
```

Запуск:

```bash
npm run dev
```

---

## Планы

* объединение одинакового контента между площадками;
* карточки контента;
* улучшенные фильтры;
* автоматизация модерации;
* улучшение тегирования и классификации.
