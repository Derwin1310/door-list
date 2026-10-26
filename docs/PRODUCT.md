# Doorlist

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

An events and ticketing platform. The owner confirmed that it must support all types of events, beyond music and culture.

## Capabilities and Constraints

- Existing implementation: Next.js App Router, React, TypeScript, and Tailwind CSS 4.
- The public page presents a fixed event: Doorlist Sessions, Teatro ABC, Bogotá, November 21, 2026, at 7:00 p.m. Colombia time.
- `/organizador` supports Supabase email/password authentication and CRUD for each organizer's events and ticket types. Organizer accounts are provisioned through Supabase Auth. Every authenticated account can organize its own events; ownership is enforced by database RLS. Attendee registration is not implemented.
- Event fields: name, description, date/time, location, draft/published status, and optional total capacity. Ticket types have a name and a positive integer capacity, with unique names per event.
- Capacity policy (implementation decision delegated by the owner): reject ticket changes whose total exceeds the event limit, and reject reducing the limit below the assigned total. Empty event capacity means unlimited; existing events retain this behavior. Never silently resize ticket types. Database triggers serialize capacity changes per event in Supabase's default READ COMMITTED isolation. Limits do not represent bookings or remaining availability.
- Request approval before running database commands or installing dependencies, as specified in [AGENTS.md](../AGENTS.md).

## Brand Commitments

Name: Doorlist. The current interface is in Spanish. The owner requested a better design and a foundation that can grow with the project.

## Evidence on Hand

`app/page.tsx` and `README.md` describe the current state and event details. No prices, capacity, schedule, testimonials, or official photographs have been provided. Do not invent them.

## Open Decisions

Purchase or attendee registration flow, categories, additional roles, and specific accessibility needs will be confirmed as these features are developed. The public landing page remains independent of organizer-created events.
