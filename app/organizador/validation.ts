export function positiveInteger(value: FormDataEntryValue | null, optional = false): number | null {
  const text = String(value ?? "").trim();
  if (optional && !text) return null;
  const number = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(number) || number < 1 || number > 2147483647) {
    throw new Error("El aforo debe ser un número entero entre 1 y 2147483647.");
  }
  return number;
}

export function eventValues(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  const startsAt = new Date(String(form.get("starts_at") ?? ""));
  const status = String(form.get("status"));
  if (!title || !location || !Number.isFinite(startsAt.getTime()) || !["draft", "published"].includes(status)) {
    throw new Error("Completa el nombre, el lugar, la fecha y el estado del evento.");
  }
  if (startsAt < new Date(earliestEventDateTime())) {
    throw new Error("La fecha del evento no puede ser anterior a hoy. Elige hoy o un día posterior.");
  }
  return { title, location, description: String(form.get("description") ?? "").trim(),
    starts_at: startsAt.toISOString(), status, capacity: positiveInteger(form.get("capacity"), true) };
}

export function ticketValues(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  if (!name) throw new Error("Escribe el nombre del tipo de entrada.");
  return { name, capacity: positiveInteger(form.get("capacity"))! };
}

export function checkCapacity(limit: number | null, total: number) {
  if (limit !== null && total > limit) {
    throw new Error(`Los tipos de entrada suman ${total} cupos y superan el aforo total de ${limit}. Reduce los cupos o aumenta el aforo del evento.`);
  }
}

export function localDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function earliestEventDateTime() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return localDateTime(today.toISOString());
}
