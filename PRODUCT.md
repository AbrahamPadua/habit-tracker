# Product

<!-- impeccable:product-schema 1 -->

> Written overnight without an interview (the owner was asleep). Facts come from the owner's ChatGPT design conversation ("Habit tracker idea") and their request. Lines marked *(assumed)* are inferences to confirm.

## Platform

android

iOS is planned later from the same Expo codebase.

## Stack

delegated: Expo (React Native, TypeScript, Expo Router) with Firebase Auth and Firestore. One codebase for Android now and iPhone later; real-time sync between two phones on Firebase's free tier.

## Users

Two partners (the owner and their partner), each on their own phone. Both are students/researchers juggling academic, research and personal commitments *(assumed from examples like "SONA Thesis" and "Prepare for graduate school")*. They check in quickly during the day and glance at what the other is working toward.

## Product Purpose

A shared window into each other's daily commitments. Each person tracks goals, habits and tasks; the other sees them read-only. Accountability comes from passive awareness and natural conversation, not reports or reminders sent to each other. Success: daily tracking under 15 seconds, weekly review under a minute, zero mandatory reflections, and both people still using it after the novelty fades.

## Positioning

Not a productivity platform and not social media. Two linked lists in one space, where a blank checkbox means "not recorded", never "failed".

## Operating Context

- One-handed phone use, short sessions: open, tap a few checks, close.
- Planned 14-day pilot by the two of them before adding features.
- Partners usually discuss progress in person, so the app has no messaging.

## Capabilities and Constraints

- Item types: goals (with milestones), habits (daily, N times weekly, flexible), tasks (dated, undated, pinned). Habits and tasks may link to a goal or stand alone.
- Today screen shows only what is relevant today; Goals screen holds the rest.
- Backfill, reschedule, defer, drop, pause and target adjustment are one or two taps and never require a reason.
- Partner view is read-only; each item can be private; sharing can be turned off.
- Out of scope for V1: reactions, widgets, shared goals, reflections, AI coach, leaderboards, points, messaging, analytics dashboards.

## Brand Commitments

Working name "Our Space", taken from the mock header in the design conversation *(assumed; the owner has not named the app)*.

Voice (confirmed by the owner): funny and a little crude, something the two of them laugh at together. Reminders can say "damn" or "cute butt". They tease, but they never guilt-trip, shame, or call a skipped day a failure.

Mascot (confirmed): a cute cat that gives the app some life without pulling attention from checking in.

## Evidence on Hand

None. No users, testimonials, or metrics exist yet; do not invent any.

## Product Principles

1. Unchecked is not failed. No red, no streak loss, no guilt copy.
2. Less to manage than to do. Any action that takes more than one or two taps needs a reason to exist.
3. Seeing, not monitoring. Partners see each other's lists; neither can edit, nudge or judge the other's.
4. Commitments bend. Pausing and lowering a target are normal, visible-to-partner outcomes, with private reasons.
5. Built for two first. Real use by the two of them decides what comes next.

## Accessibility & Inclusion

48dp touch targets, text that follows the system font size, and screen-reader labels on every check control *(assumed baseline; no specific needs stated)*.
