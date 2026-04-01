"""Извлечение словаря из words.pdf: N. English [ipa] — русский."""

from __future__ import annotations

import csv
import re
from pathlib import Path

import pdfplumber

PDF_PATH = Path(__file__).resolve().parent / "words.pdf"
OUT_PATH = Path(__file__).resolve().parent / "english_words_with_russian.txt"
CSV_OUT_PATH = Path(__file__).resolve().parent / "english_words_with_russian.csv"

# Начало записи словаря: номер, точка, пробел, латинская буква
ENTRY_START = re.compile(r"(\d+)\.\s+([A-Za-z])")
RU_CONTINUATION = re.compile(r"^[А-Яа-яЁё,\-()\s]+$")


def segment_line(line: str) -> list[str]:
    """Разбивает строку на сегменты только по «N. Латиница», игнорируя «934.» в LH 934."""
    matches = list(ENTRY_START.finditer(line))
    if not matches:
        return []
    out: list[str] = []
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(line)
        out.append(line[start:end].strip())
    return out


def trim_trailing_next_entry(ru: str) -> str:
    ru = ru.strip()
    m = re.search(r"\s+(\d+\.\s+[A-Za-z])", ru)
    if m:
        ru = ru[: m.start()].strip()
    return ru


def parse_segment(seg: str) -> tuple[str, str, str] | None:
    m = re.match(r"(\d+)\.\s+(.+)$", seg, re.DOTALL)
    if not m:
        return None
    num, rest = m.group(1), m.group(2).strip()

    for sep in (" \u2014 ", " — ", " \u2013 ", " - "):
        if sep in rest:
            left, ru = rest.split(sep, 1)
            return num, left.strip(), trim_trailing_next_entry(ru)

    m2 = re.search(
        r"\]\s+([А-Яа-яЁё0-9«»\"\u201c\u201d\u2026].*?)(?=\s+\d+\.\s+[A-Za-z]|$)",
        rest,
        re.DOTALL,
    )
    if m2:
        left = rest[: m2.start(1)].strip()
        ru = m2.group(1).strip()
        return num, left, trim_trailing_next_entry(ru)

    return None


def is_russian_continuation(line: str) -> bool:
    """Короткая строка-перенос перевода, например «в ком-то»."""
    cleaned = line.strip()
    if not cleaned or len(cleaned) > 80:
        return False
    if re.search(r"[A-Za-z0-9]", cleaned):
        return False
    return bool(RU_CONTINUATION.fullmatch(cleaned))


def append_ru(by_num: dict[int, tuple[str, str, str]], num: int, chunk: str) -> None:
    if num not in by_num:
        return
    num_s, eng_ipa, ru = by_num[num]
    addon = chunk.strip()
    if not addon:
        return
    if addon not in ru:
        ru = f"{ru} {addon}".strip()
    by_num[num] = (num_s, eng_ipa, ru)


def needs_more_ru(ru: str) -> bool:
    """Грубая эвристика незавершённого перевода."""
    s = ru.strip().lower()
    if not s:
        return True
    if re.search(r"[A-Za-z]", s):
        return True
    if s.endswith(","):
        return True
    tail_words = ("в", "во", "на", "по", "к", "ко", "с", "со", "для", "от", "до", "из", "у")
    return any(s.endswith(f" {w}") for w in tail_words)


def parse_missing_entry(text: str, num: int) -> tuple[str, str, str] | None:
    """Резервный парсинг для редких разорванных случаев."""
    m = re.search(
        rf"{num}\.\s+(.+?)(?=\d+\.\s+[A-Za-z]|$)",
        text,
        re.DOTALL,
    )
    if not m:
        return None
    body = " ".join(m.group(1).split())
    for sep in (" — ", " – ", " - "):
        if sep in body:
            left, ru = body.split(sep, 1)
            return str(num), left.strip(), ru.strip()
    m2 = re.search(r"\]\s+(.+)$", body)
    if m2:
        left = body[: m2.start(1)].strip()
        ru = m2.group(1).strip()
        return str(num), left, ru
    return None


def split_english_and_ipa(eng_ipa: str) -> tuple[str, str]:
    """Делит 'English [ipa]' на english и ipa."""
    ipa_parts = re.findall(r"\[([^\]]+)\]", eng_ipa)
    english = re.sub(r"\s*\[[^\]]+\]", "", eng_ipa).strip()
    ipa = " | ".join(part.strip() for part in ipa_parts if part.strip())
    return english, ipa


def main() -> None:
    with pdfplumber.open(PDF_PATH) as pdf:
        text = "\n".join((p.extract_text() or "") for p in pdf.pages)

    by_num: dict[int, tuple[str, str, str]] = {}
    left_column_candidate: int | None = None
    last_single_candidate: int | None = None
    pending_ru_candidate: int | None = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        segments = segment_line(line)
        if segments:
            parsed_nums: list[int] = []
            for seg in segments:
                p = parse_segment(seg)
                if not p:
                    continue
                num_s, eng_ipa, ru = p
                n = int(num_s)
                parsed_nums.append(n)
                if n not in by_num:
                    by_num[n] = (num_s, eng_ipa, ru)
                if needs_more_ru(ru):
                    if pending_ru_candidate is None or n >= pending_ru_candidate:
                        pending_ru_candidate = n
            if len(parsed_nums) >= 2:
                # В двухколоночной вёрстке перенос обычно относится к левой записи.
                left_column_candidate = parsed_nums[0]
                last_single_candidate = None
            elif len(parsed_nums) == 1:
                last_single_candidate = parsed_nums[0]
                left_column_candidate = None
            continue

        if is_russian_continuation(line):
            if pending_ru_candidate is not None:
                append_ru(by_num, pending_ru_candidate, line)
                if pending_ru_candidate in by_num:
                    if not needs_more_ru(by_num[pending_ru_candidate][2]):
                        pending_ru_candidate = None
            elif left_column_candidate is not None:
                append_ru(by_num, left_column_candidate, line)
            elif last_single_candidate is not None:
                append_ru(by_num, last_single_candidate, line)

    missing = [i for i in range(1, 1001) if i not in by_num]
    if missing:
        for n in missing:
            p = parse_missing_entry(text, n)
            if p:
                by_num[n] = p
        missing = [i for i in range(1, 1001) if i not in by_num]
    if missing:
        print("Предупреждение: пропущены номера:", missing[:50], "… всего", len(missing))

    out_lines = []
    csv_rows: list[list[str]] = [["number", "english", "ipa", "ru"]]
    for i in range(1, 1001):
        if i in by_num:
            num_s, eng_ipa, ru = by_num[i]
            out_lines.append(f"{num_s}. {eng_ipa} — {ru}")
            english, ipa = split_english_and_ipa(eng_ipa)
            csv_rows.append([num_s, english, ipa, ru])

    OUT_PATH.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    with CSV_OUT_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)
    print(f"Записано {len(out_lines)} строк в {OUT_PATH}")
    print(f"Записано {len(csv_rows) - 1} строк в {CSV_OUT_PATH}")


if __name__ == "__main__":
    main()
