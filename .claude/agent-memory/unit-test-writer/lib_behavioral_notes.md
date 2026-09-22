---
name: Formatter and Validator Behavioral Notes
description: Discovered edge-case behaviors in formatters.ts and validators.ts — document actual behavior, not ideal behavior
type: reference
---

## formatters.ts — groupItemsByDate

**Sort order**: items are sorted descending by their raw key string (the date or `"Unknown Date"` literal).
`"Unknown Date"` sorts AFTER `"2024-xx-xx"` dates in descending order because `"U" > "2"` lexicographically.
So in a mixed set, `"Unknown Date"` sections appear FIRST (index 0) before dated sections.

**Date format**: input `YYYY-MM-DD` becomes `DD/MM/YYYY` in the title.

**Null/undefined dates**: both map to the key `"Unknown Date"` and remain as-is in the title (no reformatting).

## formatters.ts — getDoctorDisplayName

**Prefix check**: only `startsWith('dr.')` and `startsWith('dr ')` (with a dot or space). `"drsmith"` does NOT match either — it will still get `"Dr. "` prefixed to become `"Dr. drsmith"`. Only strings that literally start with `"dr. "` or `"dr "` (i.e. followed by space or dot then space) are left untouched.

**Email fallback**: takes everything before `@`. Then applies the same prefix logic to that extracted username.

**Null + undefined fallback**: returns `"Dr. Doctor"`.

## validators.ts — age field

The validator uses `Number(age.trim())` — this accepts decimal strings like `"1.5"` without error (Number('1.5') = 1.5 >= 0). Only NaN or negative values produce errors. There is no upper-bound validation.

## validators.ts — phone field

The validator `trim()`s the phone string before regex matching, so `" 9876543210 "` (with surrounding whitespace) passes validation. Hyphens, spaces within digits, and letters all fail the `^\d{10}$` regex.

## errorMessages.ts — getReadableError pass-through heuristic

A raw error message is passed through as-is (not mapped to generic) only if ALL of:
1. Length < 100 characters
2. Does not contain `http`
3. Does not contain `://`
4. Does not match `/[A-Z_]{4,}/` (no 4+ char all-caps tokens)
5. Does not match `/[{}[\]]/` (no braces or brackets)
6. Does not contain `"Error:"`

If any condition fails → generic fallback returned.
