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
