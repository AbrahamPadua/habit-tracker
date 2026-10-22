---
name: Our Space
description: A two-person habit tracker where each day is a punch card and checking in presses an ink stamp.
colors:
  ground: "#E9ECF1"
  card: "#FBFBFC"
  rule: "#D2DCEA"
  ink: "#1B2030"
  muted: "#566074"
  faint: "#646D80"
  me-violet: "#5B3FB5"
  partner-teal: "#0E7066"
  action: "#1B2030"
  on-action: "#FBFBFC"
  tonal: "#DCE2EB"
  ground-dark: "#0F1115"
  card-dark: "#181B22"
  rule-dark: "#2A3243"
  ink-dark: "#E7E9EF"
  muted-dark: "#A3ABBC"
  faint-dark: "#8C95A8"
  me-violet-dark: "#B6A5FF"
  partner-teal-dark: "#62D3C3"
  action-dark: "#E7E9EF"
  on-action-dark: "#14161C"
  tonal-dark: "#262C38"
typography:
  display:
    fontFamily: "platform default sans"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: "44px"
    letterSpacing: "-1px"
  headline:
    fontFamily: "platform default sans"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "30px"
    letterSpacing: "-0.3px"
  title:
    fontFamily: "platform default sans"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "platform default sans"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "22px"
  meta:
    fontFamily: "platform default sans"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  label:
    fontFamily: "platform default sans"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "16px"
    letterSpacing: "0.8px"
  stamp:
    fontFamily: "Menlo (iOS), monospace (Android)"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.3px"
rounded:
  input: "12px"
  card: "20px"
  fab: "16px"
  chip: "18px"
  button: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "16px 16px 8px"
  stamp-slot:
    size: "40px"
    width: "48px"
    height: "48px"
    rounded: "{rounded.full}"
  button-filled:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.button}"
    height: "48px"
    padding: "0 24px"
  button-tonal:
    backgroundColor: "{colors.tonal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    height: "48px"
    padding: "0 24px"
  button-text:
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    height: "48px"
    padding: "0 12px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    height: "36px"
    padding: "0 14px"
  chip-selected:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
  fab:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.fab}"
    size: "56px"
---

# Design System: Our Space

Light values are listed above; each color has a `-dark` twin, selected by the system color scheme (`src/ui/theme.ts`).

## Overview

**Creative North Star: "The Punch Card"**

Each person's day is an index card, and checking in presses a rubber date stamp into a round slot. The ground is cool card stock with hairline blue rules, the text is blue-black ink, and two stamp inks carry all meaning: violet for me, teal for my partner. Hierarchy comes from scale contrast (one large count against 16px rows), not from boxes, badges or borders.

Every screen holds three values: ground, ink, stamp. Rows have no containers, only a hairline rule beneath. Unchecked means "not recorded", so nothing in the system is red and no state reads as failure. The partner's card is the same card in teal, read-only.

**Key Characteristics:**
- Index-card ground, hairline blue rules, blue-black ink.
- Violet and teal are stamp inks, not UI accents; controls are neutral ink.
- Rows are type plus a 48dp stamp slot on the right; no row borders or fills.
- One big number per card ("1 of 3"), in the owner's ink.
- Flat, with tonal surfaces only.

## Colors

Cool, quiet neutrals with two saturated inks held in reserve.

### Primary
- **Me Violet** (`me-violet`, dark `me-violet-dark`): the owner's stamps, weekly punches, own count and the owner's card spinner. Nothing else.

### Secondary
- **Partner Teal** (`partner-teal`, dark `partner-teal-dark`): the partner's stamps, punches, count and loading spinner.

### Neutral
- **Ground** (`ground`): screen background behind the cards.
- **Card Stock** (`card`): card, tab bar and unselected chip surface.
- **Blue Rule** (`rule`): hairline row dividers and the tab bar top border only.
- **Blue-Black Ink** (`ink`): titles, body, error text, the active tab.
- **Muted** (`muted`): meta lines, section labels, done rows, inactive tabs.
- **Faint** (`faint`): control borders (empty slot outline, input and unselected chip borders, about 5:1, meeting 3:1 non-text contrast), empty punch outlines, lock glyph, date numerals.
- **Action** (`action`) and **On Action** (`on-action`): the inverted ink pair for the FAB, filled button, selected chip and Switch-on.
- **Tonal** (`tonal`): tonal button fill, suggestion strip and the active-tab pill (ink text on it).

### Named Rules
**The Reserved Ink Rule.** Violet and teal appear only on stamps, punches, a person's own count and the owner's card spinner. Controls (FAB, buttons, chips, switches, tabs) use `action`, `tonal` and `ink`.
**The No Red Rule.** No red, no warning hue, anywhere. Overdue and unrecorded are stated in plain muted text.
**The Three Values Rule.** A screen is ground, ink and stamp. A fourth color needs a reason the build already shows.

## Typography

**Display, Body and Label Font:** the platform default sans (Roboto on Android, San Francisco on iOS); no custom face is loaded.
**Stamp Font:** platform monospace (Menlo on iOS, `monospace` on Android).

**Character:** plain and legible; the voice comes from size contrast and the monospaced stamp text. Sizes follow the system font setting, except stamp text, which is fixed.

### Hierarchy
- **Display** (700, 40/44, -1 tracking): the "done" count on each card only.
- **Headline** (600, 24/30, -0.3 tracking): screen-level headings.
- **Title** (600, 17/22): card owner name, "of N", button labels (15px).
- **Body** (400, 16/22): row titles, empty-state copy.
- **Meta** (400, 13/18): row meta line ("Daily · Goal name"), "This week X of Y", chip text (600).
- **Label** (700, 12/16, 0.8 tracking, uppercase): date in the top bar, section labels, "Done (n)".
- **Stamp** (mono 700, 11, 0.3 tracking, not scaled with the system font): weekday mark inside a stamp, e.g. "MON".

### Named Rules
**The Big Count Rule.** One display-size number per card; everything else stays at body size or below.

## Layout

Single column, page padding 16px, cards stacked with a 16px gap, bottom padding 120px to clear the FAB. Spacing steps: 4, 8, 12, 16, 24, 32. Rows have a 56px minimum height with a 48x48 touch target for the stamp; rows are separated by a hairline, not spacing. Section labels sit 24px above and 8px below. Navigation is Material 3 bottom tabs (Today, Goals, Space) with the FAB bottom-right at 16px inset. Chips use 6px hit slop to reach 48dp.

## Elevation & Depth

Flat. Depth is tonal: ground behind, card stock on top. The tab bar is a card-colored surface with a rule border. The only shadow is the FAB's Material elevation (3). Pressed controls dim (opacity 0.8) or shrink (stamp slot to 0.86).

### Named Rules
**The Tonal Only Rule.** Separate surfaces by ground-versus-card value, not by shadows or card borders around rows.

## Shapes

Round and soft: cards 20px, inputs 12px, FAB 16px, chips 18px (fully round at 36px height), buttons 24px (pill at 48px). Stamp slots, punches and stamps are circles. The stamp itself is a ring tilted -12 degrees. Borders are 1px (chips, inputs), 1.5px (slots, empty punches) and 2px (stamp ring). Control borders use `faint`; hairlines stay `rule`.

## Components

### Stamp (signature)
A 40px circular slot with a 1.5px `faint` outline inside a 48x48 hit area. Pressing dips the slot to 0.86 over 70ms; the stamp (2px ring in the person's ink, 12% ink fill, weekday in mono) lands from 1.35x scale to 1x with a spring, rotated -12 degrees, with a light haptic on native. With reduce-motion on, it appears with no animation. Read-only (no press handler) for the partner's card, where the empty slot outline is dashed so it never looks tappable; the label announces "done" or "not recorded". Role is checkbox with checked state.

### Punches
Weekly targets show N small circles (10px, 1.5px outline) filled left to right in the person's ink; extra completions show "+n".

### Card Cat
A small tuxedo cat drawn after Tommy Boy, the owner's cat (`src/ui/Cat.tsx`, react-native-svg). He has black fur, a narrow white blaze up the forehead just left of centre that opens into a white muzzle, a white bib and belly, white feet with pink toe beans, olive-green eyes, a pale pink nose, long white whiskers, and a silver collar with a bone-shaped tag. The coat looks the same in both themes. The `catRim` token outlines him in his own fur color on light cards and in a soft grey on dark ones, so the black fur doesn't sink into the card. The stamp inks stay on stamps.

There is one Tommy, and he lives on top of my card on Today (`src/ui/CardCat.tsx`), 44px tall, feet sinking 3px into the card's top edge, clear of the rounded corners. My card gets extra headroom for him; the partner card and the invite card have no cat. His pose follows the day: he sits and blinks at uneven 3 to 6 second intervals with a slow tail swish while something is left, curls up asleep and breathes once today's list is all stamped, and peeks over the top edge when my card is empty. Awake, every 20 to 45 seconds he either strolls along the edge to a new spot (side view, about 45px a second) or plops onto his butt, sticks a hind leg straight up and licks himself for 3.5 seconds. Asleep, he only shuffles to a new spot every couple of minutes. He also sits at 72px on sign-in. Decorative only: hidden from screen readers, not touchable, and still when Reduce Motion is on. He never celebrates a single stamp and never blocks a tap.

Once a day, the first time Today opens on a phone, my cat makes an entrance (`src/ui/WalkingCat.tsx`): the same tuxedo cat, seen from the side in white socks, walks in from the left along the floor, crouches and takes aim, leaps up onto the top edge of my card, turns, and walks back to his spot, where the resting cat takes over. The leap is timed to the climb (0.9 to 1.7 seconds) so he never looks rushed; the whole entrance takes about 6 seconds on a phone. It passes taps through, is skipped with Reduce Motion, and shows the resting cat anyway after 12 seconds if anything stalls.

### Stamp Grid
The last 12 weeks on Goals, owner only: 12 week columns (Monday at top) of rounded 4px-radius day cells that fill the card width with a 4px gap. Empty days are `tonal`; 1, 2-3 and 4+ stamps use the `heat` ramp (my ink mixed toward the card, lightest step above 2:1 on the card, validated in both themes). Future days in the current week are blank. Title and total stamps sit above, a "Less / More" key and a tap readout ("Tue: 3 stamps") below. No streaks, no red, no partner grid.

### Item Row
Title (body, up to 2 lines, muted when done, no strikethrough; labelled "Edit <title>, <meta>") over a meta line (punches, meta text joined by " · ", lock glyph if private). Stamp on the right, move icon (22px) before it on any open task. A hairline rule below. Moving opens chips (Today, Tomorrow, Next week, Someday, Drop it). Suggestions appear as a `tonal` strip with ink text, 12px radius, with a selected and a plain chip.

### Card
Card stock, 20px radius, 16px side and top padding. Header: owner name left, large count right ("1" display in ink color, "of 3" title in muted).

### Buttons
Filled (`action` fill, `on-action` text), tonal (`tonal` fill, ink text), text (transparent, ink text). 48px minimum height, pill radius, title text at 15px. Disabled opacity 0.45.

### Chips
36px tall, 18px radius, 1px outline. Unselected: card fill, `faint` outline, ink text. Selected: `action` fill and outline, `on-action` text.

### Error Text
Ink text with an alert-circle-outline icon (18px), alert role, polite live region. State is carried by icon and words, never by color.

### Navigation and FAB
Bottom tabs with outline/filled MaterialCommunity icon pairs at 24px, 12px semibold labels, active ink on a 64x32 `tonal` pill behind the icon (Material 3), inactive muted. FAB is 56px, 16px radius, `action` fill, plus icon 28px; it is the single primary action.

## Do's and Don'ts

### Do:
- **Do** express done state as a stamp in the owning person's ink, with a screen-reader label on every check.
- **Do** keep touch targets at 48dp.
- **Do** separate rows with a hairline rule in `rule`, and give control borders `faint` so they meet 3:1.
- **Do** show errors as ink text with an icon and an alert role.
- **Do** keep the partner's card read-only and in teal.
- **Do** honor reduce-motion for the stamp landing.

### Don't:
- **Don't** use red or any alarm hue for overdue, missed or unrecorded.
- **Don't** add progress rings, streak flames, confetti or rainbow habit cards.
- **Don't** put borders or fills around rows.
- **Don't** use violet or teal for controls, tabs, buttons, chips or the FAB.
