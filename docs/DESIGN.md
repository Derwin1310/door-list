# Doorlist Design

See [RULES.md](../RULES.md) for documentation rules and [PRODUCT.md](PRODUCT.md) for product context.

## Scope

Doorlist is a web application for all types of events. The owner chose to build the design directly in React. The current screen presents Doorlist Sessions; preserve its name, date, and venue. Registration is not connected yet: do not show completed bookings or invent availability, prices, or capacity.

## Identity

An open door to the next experience. Keep the original interface's violet on a warm paper background, with lime as a poster accent. Use arches and doors as a distinctive graphic motif. Future event photographs can replace this session's abstract poster.

## Tokens and Typography

Shared values live in `app/theme.css`, under `:root`: surfaces, primary and secondary text, accent, hover, borders, and font families. `app/globals.css` imports Tailwind; the layout imports the theme afterward. Use Space Grotesk 700 for headings and branding, and DM Sans for body text. Fonts are served locally from `public/fonts`, with their licenses and no external requests when the application loads.

## Composition

Maximum width: 1184 px. On desktop, place the poster on the left and event details on the right; use a single column on mobile. The event name is the only h1. Group the date, time, and time zone together; group the venue and city together. Reserve the solid button for the primary action. Avoid filling every section with cards, labels, or effects.

## Interaction and Accessibility

Use controls at least 44 px tall, visible focus indicators, a skip-to-content link, decorative icons hidden from screen readers, and readable contrast. The only animation is the subtle door opening; respect `prefers-reduced-motion`. Registration uses a native disclosure that works with a keyboard and communicates its actual status. Downloading the calendar file does not save user data or create a booking.

## As the Project Grows

Reuse the tokens and event-details, button, and link patterns. Extract components when a second screen needs them. Keep `public/events/doorlist-sessions.ics` synchronized with the event details; when real events are connected, generate calendar files from the same data source. Do not make this session's poster a constraint for every event type.

## Organizer Workspace

The public header includes a visible “Organizadores” link on desktop and mobile. The organizer is an operational surface: use compact headings, clear actions, and the existing color and font tokens. Implement its layout and controls with Tailwind utilities rather than a separate organizer stylesheet.

Show owned events as read-only rows with event details, status, each ticket type's capacity followed by its name (for example, “20 VIP · 20 General”), assigned capacity, and an explicit “Editar” action. On mobile, stack each row's information and keep the ticket capacities and names visible. Empty ticket collections read “Sin entradas”.

Open only one event editor at a time. Keep editors closed initially and after saving an existing event. Creating an event without a total capacity also closes its editor. When creating an event with a total capacity, keep its saved editor open and reveal ticket creation so the organizer can continue immediately or close it without adding tickets. On desktop, place event details and ticket management side by side; stack them on smaller screens. Existing ticket types are read-only rows until explicitly edited, with at most one ticket edit form open. Keep creation controls separate from existing records.

New event forms always start blank. Clear a ticket creation form after a successful write, and preserve entered values on failure. Show capacity feedback beside the relevant form, including assigned and unassigned counts, an inline over-limit message, and recovery instructions when the event is fully allocated. Use live announcements for outcomes and return keyboard focus to a useful control after saving or closing an editor. Keep controls at least 44 px tall.

In event rows, display each ticket type as a separate compact label with its count emphasized and its name allowed to wrap. Give the date/time input a full row within the event form, with a separate accessible hint. Event dates must be today or later in the device's timezone; the current day's earlier times are allowed. Enforce the day boundary in both the native selector and form payload validation.
