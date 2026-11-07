# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Decided in replica/architecture.md (2026-11-07): editor in React + TypeScript + Vite served as static assets of a Cloudflare Worker, API in Hono on the same Worker, Neon PostgreSQL, Cloudflare R2 for images, Cloudflare Access for sign-in, public site generated statically on Cloudflare Pages, backups to Google Drive. Budget $0. UI base proposed: Tailwind v4 + React Aria Components + Lucide icons (not installed yet).

## Users

1. Now: the owner (Juan), the only editor, building and testing the CMS while learning. Uses it from the corporate PC, the personal PC and away from home (phone or laptop).
2. Later: the owner plus collaborators.
3. Eventually: clients of the owner, people with no technical background.

The interface must be usable by someone who knows nothing about CMSs, with at most a short introduction for simple tasks.

## Product Purpose

A personal content management system inspired by the capabilities of Sanity (structured content types, drafts and publishing, history, scheduling, images), rebuilt from scratch without copying its code, look or text. Right now it is a learning and experimentation project; the fictional real-estate portal (properties, agents, articles) exists to test that everything works end to end. Success: create content types and content, publish, and see the change on the public site, without needing a course.

## Positioning

Same structured-content power, but understandable at first sight. Sanity users' main complaint (replica/fixes.md, reviews.csv) is the learning curve and setup; this product answers that with an editor anyone can use, plus a $0 hosting model the owner controls.

## Operating Context

Editing sessions of variable length on desktop and on phone. Content is published to a static public site, so publishing triggers a site build and the editor must show whether the site is up to date. One editor today; roles and invitations come in later milestones (replica/architecture.md, M6).

## Capabilities and Constraints

- 79 active capabilities ordered M1–M6 in replica/features.csv; AI features deferred.
- Must not copy Sanity's code, logos, icons, illustrations, texts, fonts or signature look.
- Free-tier limits shape the UX: site builds are batched, images are resized in the browser before upload.
- Undecided: product name and brand (replica-brand later).

## Brand Commitments

Company brand: MSE (owner's company). Official logo files supplied by the owner on 2026-11-07, copied to replica/design/assets/ (logo-mse.svg for light grounds, logo-mse-blanco.svg for dark grounds, favicon.svg). Brand colors read from the logo: navy #10233d and blue #2f63f5 (lighter blue #5b8cff on the white version). Use the logo as supplied; do not redraw or recolor it. The CMS product itself has no separate name yet. Owner asked (2026-11-07) for an editor that feels current, technological and at the forefront of today's interfaces, without sacrificing intuitiveness.

## Evidence on Hand

Only fictional demo content (replica/demo-plan.md). No real customers, testimonials, metrics or production content exist; none may be invented.

## Product Principles

1. Intuitive before powerful: every screen must be understandable without training; advanced options appear when needed, not upfront.
2. Always say where things stand: draft, published, scheduled, and whether the public site reflects it.
3. Never lose work silently: conflicts, offline states and errors are visible and recoverable.
4. Works from anywhere: phone is a first-class editing device.
5. Fits in $0: features respect free-tier limits instead of hiding them.

## Accessibility & Inclusion

WCAG 2.2 AA contrast in light and dark modes, full keyboard operation, visible focus, reduced-motion support, 44px touch targets on mobile, Spanish interface.
