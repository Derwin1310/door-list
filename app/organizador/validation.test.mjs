import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCapacity, eventValues, localDateTime, positiveInteger, ticketValues } from "./validation.ts";

test("capacities are positive PostgreSQL integers; only event limits may be empty", () => {
  assert.equal(positiveInteger("", true), null);
  assert.equal(positiveInteger("10"), 10);
  for (const value of ["", "0", "-1", "1.5", "NaN", "Infinity", "2147483648", "1e2"]) {
    assert.throws(() => positiveInteger(value));
  }
});

test("capacity permits equality and unlimited events, rejects over-allocation", () => {
  assert.doesNotThrow(() => checkCapacity(null, 1000));
  assert.doesNotThrow(() => checkCapacity(100, 100));
  assert.throws(() => checkCapacity(100, 101));
  assert.throws(() => checkCapacity(99, 100));
});

test("event and ticket payloads trim names and validate required fields", () => {
  const form = new FormData();
  form.set("title", " Event "); form.set("location", " Bogotá ");
  form.set("starts_at", "2030-01-01T19:00"); form.set("status", "draft");
  assert.equal(eventValues(form).title, "Event");
  assert.equal(eventValues(form).capacity, null);
  form.set("status", "invalid"); assert.throws(() => eventValues(form));
  form.set("status", "draft"); form.set("starts_at", ""); assert.throws(() => eventValues(form));
  form.set("name", " General "); form.set("capacity", "25");
  assert.deepEqual(ticketValues(form), { name: "General", capacity: 25 });
  form.set("name", " "); assert.throws(() => ticketValues(form));
});

test("date editing preserves the instant at minute precision in the device timezone", () => {
  const instant = "2030-01-01T19:00:00.000Z";
  assert.equal(new Date(localDateTime(instant)).toISOString(), instant);
});
