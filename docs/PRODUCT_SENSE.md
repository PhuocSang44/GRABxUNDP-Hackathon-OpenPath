# PRODUCT_SENSE.md

Durable product judgment that agents cannot infer reliably from code alone.

## Product Core

- Primary user: wheelchair users and people with limited mobility navigating Ho Chi Minh City
- Job to be done: find accessible locations (ramps, toilets, parking, entrances) before and during a journey so they can move confidently
- Main frustration to remove: arriving at a destination only to discover it is inaccessible — no ramp, blocked sidewalk, no accessible toilet
- Quality bar for acceptance: every visible point must have a score, a category, and at least one verifiable attribute; the map must load and respond to filters in under two seconds on a standard laptop browser

## Product Rules

- Favour user-visible reliability over feature count. A map with accurate data for 20 locations beats a map with stale data for 200.
- Treat ambiguous behavior as a spec gap. Do not guess what an unspecified state should look like.
- If implementation changes what users see or trust (score meaning, category labels, filter behavior), update `docs/product-specs/accessibility-map.md` in the same session.
- Use product specs for concrete flows; use this file for cross-cutting priorities.
- Accessibility score is a trust signal. Do not fabricate or smooth scores without recording the source (`ai | community | manual`).

## No-Go Patterns

- Silently showing a location with a null or 0 score when the data is genuinely missing — show an "unrated" state instead
- Category labels that change between the marker tooltip and the detail popup
- Filter resets that require a page refresh
- API errors surfaced as blank map state with no user feedback
- Hard-coded API keys, tokens, or database credentials in source or docs
