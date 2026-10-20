---
version: 1
slug: "src-app-tabs-index-tsx"
primary_target: "src/app/(tabs)/index.tsx"
related_targets: ["src/app/(tabs)/goals.tsx","src/app/(tabs)/space.tsx","src/app/item.tsx"]
---

## Scope

Our Space app shell: Today (primary), Goals, Space, and the one Add/Edit sheet. Mode: Operate. Platform: Android first (Material 3 structure), iOS later.

Audience and job: two partners checking in on their own phones in under 15 seconds, then glancing at each other's card. Unattended run: the owner was asleep, so the decision page was not served; the assigned direction was built and can be re-rolled later.

## Direction contract

THESIS: Each person's day is a punch card and checking in stamps it. Refuses the category default of progress rings, streak flames, confetti and rainbow habit cards.

OWN-WORLD: Index-card ground with hairline blue row rules, blue-black ink text, and two stamp inks: violet for me, teal for my partner, used only for stamps, punches and the person's own count. Three values per screen: ground, ink, stamp. No red anywhere, no shadows beyond Material tonal surfaces, no card borders around rows.

STORY: I see what is left for today, stamp what I did, see my partner's card already stamped, and close the app.

FIRST VIEWPORT: Top bar with the date and "This week X of Y". My card: name, a large "1 of 3", rows of title over a quiet meta line with a 48dp stamp slot on the right. "This week" rows show N punch slots. "Done (n)" collapsed. Partner card below in teal, read-only. FAB for add, bottom navigation Today / Goals / Space.

FORM: punch card and rubber date stamp, position 3 of 7 on my ordered list (fridge door notes, kitchen wall calendar, punch card, friendship thread, postcards, paired objects, windowsill plants). seed:972ad8b790047167
Raises: from the variable-font specimen, hierarchy by scale contrast alone (the big count, no boxes). From metro tiles, chrome deleted so rows are type plus a stamp, no containers. From the centre-rail setting, states are printed marks with a three-value palette. From the orienteering map, one reserved ink means "punched" and nothing else uses it.

SIGNATURE: tapping a slot presses a stamp: the slot dips, a slightly rotated violet ring with the weekday ("MON") lands, with a light haptic. Weekly punches fill left to right. Reduced motion: the stamp appears without the press.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
