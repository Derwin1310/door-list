"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { useEffect, useId, useState, type FormEvent } from "react";
import { checkCapacity, earliestEventDateTime, eventValues, localDateTime, ticketValues } from "./validation";

const inputClass = "w-full min-h-11 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-base text-[var(--ink)] disabled:bg-[var(--paper)]";
const labelClass = "flex min-w-0 flex-col gap-1.5 text-sm";
const outlinedButton = "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = `${outlinedButton} text-[var(--accent)] hover:bg-[var(--accent-soft)]`;
const dangerButton = `${outlinedButton} text-[#8a2d16] hover:bg-[#fff1eb]`;
const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--paper)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50";
const helpClass = "text-sm leading-relaxed text-[var(--muted)]";
const errorClass = "rounded-md bg-[#fff1eb] p-3 text-sm leading-relaxed text-[#8a2d16]";
const noticeClass = "my-4 rounded-md bg-[var(--accent-soft)] p-4 text-sm leading-relaxed";

type Ticket = { id: string; name: string; capacity: number };
type Event = { id: string; title: string; description: string; starts_at: string; location: string;
  status: string; capacity: number | null; ticket_types: Ticket[] };

function errorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "23505") return "Ya existe un tipo de entrada con ese nombre en este evento.";
  if (code === "23514") return "No se pudo guardar: revisa los aforos. La suma de entradas no puede superar el límite del evento.";
  if (code === "42501" || code === "PGRST301") return "Tu sesión no permite esta acción. Vuelve a iniciar sesión.";
  if (error instanceof Error && !code) return error.message;
  return "No se pudo completar la operación. Revisa la conexión y la configuración de Supabase e inténtalo de nuevo.";
}

export default function Organizer() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (!url || !key) return;
    const supabase = createClient(url, key);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setClient(supabase);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => { subscription.unsubscribe(); };
  }, [url, key]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error } = await client.auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (error) setError("No pudimos iniciar sesión. Revisa el correo y la contraseña y confirma que tu cuenta esté habilitada.");
    } catch { setError("No se pudo conectar con Supabase. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!client) return;
    setBusy(true); setError("");
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
      setUser(null);
    } catch { setError("No se pudo cerrar la sesión. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }

  if (!url || !key) return <p className={noticeClass} role="status">El panel aún no está configurado. Configura la conexión con Supabase para habilitar el acceso de organizadores.</p>;
  if (loading) return <p className={noticeClass} role="status">Verificando tu sesión…</p>;
  return <>
    {error && <p className={errorClass} role="alert">{error}</p>}
    {user && client ? <>
      <div className="my-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]"><p>{user.email}</p><button className={secondaryButton} disabled={busy} onClick={signOut}>Cerrar sesión</button></div>
      <Dashboard key={user.id} client={client} ownerId={user.id} />
    </> : <section className="mt-8 max-w-sm space-y-4" aria-labelledby="login-title">
      <h2 id="login-title" className="text-2xl">Inicia sesión</h2>
      <p className={helpClass}>Gestiona tus eventos y sus tipos de entrada con tu cuenta de organizador.</p>
      <form onSubmit={signIn}>
        <fieldset className="grid min-w-0 gap-4" disabled={busy || !client}>
          <label className={labelClass}>Correo electrónico<input className={inputClass} name="email" type="email" autoComplete="username" required /></label>
          <label className={labelClass}>Contraseña<input className={inputClass} name="password" type="password" autoComplete="current-password" required /></label>
          <button className={primaryButton} type="submit">{busy ? "Entrando…" : "Entrar"}</button>
        </fieldset>
      </form>
      <p className={helpClass}>Usa una cuenta creada en Supabase Auth. Si no tienes acceso, contacta al administrador.</p>
    </section>}
  </>;
}

function Dashboard({ client, ownerId }: { client: SupabaseClient; ownerId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<string | null>(null);
  const [newFormKey, setNewFormKey] = useState(0);

  async function load() {
    const { data, error } = await client.from("events").select("id,title,description,starts_at,location,status,capacity,ticket_types(id,name,capacity)")
      .eq("owner_id", ownerId).order("starts_at");
    if (error) throw error;
    setEvents(data ?? []);
    setLoadError("");
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || user?.id !== ownerId) throw new Error("Tu sesión venció. Vuelve a iniciar sesión.");
        const { data, error: queryError } = await client.from("events")
          .select("id,title,description,starts_at,location,status,capacity,ticket_types(id,name,capacity)")
          .eq("owner_id", ownerId).order("starts_at");
        if (queryError) throw queryError;
        if (active) { setEvents(data ?? []); setLoadError(""); }
      } catch (error) { if (active) setLoadError(errorMessage(error)); }
      finally { if (active) setLoading(false); }
    }
    void initialize();
    return () => { active = false; };
  }, [client, ownerId]);

  useEffect(() => {
    if (editor) document.getElementById("editor-title")?.focus();
  }, [editor, newFormKey]);

  function closeEditor() {
    const trigger = editor === "new" ? "create-event" : `edit-${editor}`;
    setEditor(null);
    requestAnimationFrame(() => document.getElementById(trigger)?.focus());
  }

  async function mutate(action: () => Promise<void>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      await action();
      setMessage(success);
      try { await load(); } catch { setLoadError("El cambio se guardó, pero no pudimos actualizar la lista. Recarga antes de seguir editando."); }
    } finally { setBusy(false); }
  }

  async function saveEvent(form: FormData, existing?: Event) {
    const values = eventValues(form);
    checkCapacity(values.capacity, existing?.ticket_types.reduce((sum, ticket) => sum + ticket.capacity, 0) ?? 0);
    const query = existing ? client.from("events").update(values).eq("id", existing.id).eq("owner_id", ownerId)
      : client.from("events").insert({ ...values, owner_id: ownerId });
    const { data, error } = await query.select("id").single();
    if (error) throw error;
    return data.id;
  }

  const current = events.find(event => event.id === editor);
  return <>
    <div className="mb-5 mt-8 flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-xl">Mis eventos <span className="ml-1 text-base text-[var(--muted)]">({events.length})</span></h2>
        <p className={helpClass}>Revisa tus entradas o abre un evento para editarlo.</p></div>
      <button id="create-event" className={primaryButton} disabled={busy || loading || !!loadError} onClick={() => {
        setNewFormKey(key => key + 1); setEditor("new"); setError(""); setMessage("");
      }}>Crear evento</button>
    </div>
    {message && <p className={noticeClass} role="status">{message}</p>}
    {error && <p className={errorClass} role="alert">{error}</p>}
    {loading ? <p role="status" className={noticeClass}>Cargando eventos…</p> : loadError ? <div className={errorClass} role="alert"><p>{loadError}</p><button className={`${secondaryButton} mt-3`} onClick={() => window.location.reload()}>Recargar</button></div> : <>
      {!events.length && <p className={noticeClass}>Todavía no tienes eventos. Crea el primero para configurar sus entradas.</p>}
      {events.length > 0 && <table className="w-full table-fixed border-collapse text-left text-sm" aria-label="Mis eventos">
        <thead className="hidden border-b border-[var(--line)] text-xs text-[var(--muted)] md:table-header-group">
          <tr><th scope="col" className="w-[32%] px-3 py-3 font-normal">Evento</th><th scope="col" className="w-[14%] px-3 py-3 font-normal">Estado</th>
            <th scope="col" className="w-[25%] px-3 py-3 font-normal">Tipos de entrada</th><th scope="col" className="w-[17%] px-3 py-3 font-normal">Aforo asignado</th>
            <th scope="col" className="px-3 py-3 font-normal"><span className="sr-only">Acciones</span></th></tr>
        </thead>
        <tbody className="block md:table-row-group">{events.map(event => {
          const total = event.ticket_types.reduce((sum, ticket) => sum + ticket.capacity, 0);
          return <tr key={event.id} className={`grid grid-cols-[1fr_auto] gap-x-3 gap-y-3 border-b border-[var(--line)] px-3 py-4 md:table-row ${editor === event.id ? "bg-[var(--accent-soft)]" : ""}`}>
            <th scope="row" className="min-w-0 text-left font-normal md:px-3 md:py-4">
              <span className="block break-words text-base font-bold">{event.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">{new Date(event.starts_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</span>
              <span className="block break-words text-xs text-[var(--muted)]">{event.location}</span>
            </th>
            <td className="text-right align-top md:px-3 md:py-5 md:text-left"><span className={`inline-block rounded px-2 py-1 text-xs ${event.status === "published" ? "bg-[var(--lime)] text-[var(--ink)]" : "bg-white text-[var(--muted)]"}`}>{event.status === "published" ? "Publicado" : "Borrador"}</span></td>
            <td className="col-span-2 min-w-0 align-top leading-relaxed md:px-3 md:py-5">
              <span className="mb-1 block text-xs text-[var(--muted)] md:hidden">Tipos de entrada</span>
              {event.ticket_types.length ? <ul className="flex flex-wrap gap-2" aria-label="Entradas asignadas">
                {event.ticket_types.map(ticket => <li key={ticket.id} className="inline-flex max-w-full items-baseline gap-1.5 rounded border border-[var(--line)] bg-white px-2 py-1">
                  <span className="shrink-0 font-bold tabular-nums text-[var(--accent)]">{ticket.capacity.toLocaleString("es-CO")}</span>
                  <span className="min-w-0 wrap-anywhere">{ticket.name}</span>
                </li>)}
              </ul> : <span className="text-[var(--muted)]">Sin entradas</span>}
            </td>
            <td className="self-center align-top tabular-nums md:px-3 md:py-5"><span className="mb-1 block text-xs text-[var(--muted)] md:hidden">Aforo asignado</span>{total.toLocaleString("es-CO")} {event.capacity !== null ? `/ ${event.capacity.toLocaleString("es-CO")}` : "· Sin límite"}</td>
            <td className="self-center text-right align-top md:px-3 md:py-4"><button id={`edit-${event.id}`} className={secondaryButton} disabled={busy} aria-label={`Editar ${event.title}`} aria-expanded={editor === event.id} aria-controls={editor === event.id ? "event-editor" : undefined}
              onClick={() => { if (editor === event.id) closeEditor(); else { setEditor(event.id); setError(""); setMessage(""); } }}>{editor === event.id ? "Cerrar" : "Editar"}</button></td>
          </tr>;
        })}</tbody>
      </table>}
      {(editor === "new" || current) && <section id="event-editor" className="mt-8 border-t border-[var(--line)] pt-6" aria-labelledby="editor-title" key={current?.id ?? `new-${newFormKey}`}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="editor-title" tabIndex={-1} className="text-2xl outline-none">{current ? current.title : "Nuevo evento"}</h2>
            <p className={helpClass}>{current ? "Actualiza los datos del evento y organiza sus entradas." : "Guarda los datos del evento para empezar a agregar entradas."}</p></div>
          <button className={secondaryButton} disabled={busy} onClick={closeEditor}>Cerrar editor</button>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
          <section aria-labelledby="event-data-title" className="min-w-0">
            <h3 id="event-data-title" className="mb-4 text-base font-bold">Datos del evento</h3>
            <EventForm event={current} busy={busy} onSave={async form => {
              const continueToTickets = !current && String(form.get("capacity") ?? "").trim() !== "";
              let savedId = "";
              await mutate(async () => { savedId = await saveEvent(form, current); }, current ? "Cambios del evento guardados." : continueToTickets ? "Evento creado. Puedes agregar sus entradas ahora o cerrar el editor y hacerlo después." : "Evento creado. Abre Editar para agregar sus tipos de entrada.");
              if (continueToTickets) setEditor(savedId);
              else closeEditor();
            }} />
          </section>
          {current ? <TicketEditor event={current} busy={busy} onSave={(form, ticket) => mutate(async () => {
            const values = ticketValues(form);
            checkCapacity(current.capacity, current.ticket_types.filter(item => item.id !== ticket?.id).reduce((sum, item) => sum + item.capacity, 0) + values.capacity);
            const query = ticket ? client.from("ticket_types").update(values).eq("id", ticket.id).eq("event_id", current.id)
              : client.from("ticket_types").insert({ ...values, event_id: current.id });
            const { error } = await query.select("id").single();
            if (error) throw error;
          }, "")} onDelete={async ticket => {
            if (!window.confirm(`¿Eliminar el tipo de entrada “${ticket.name}”?`)) return false;
            await mutate(async () => {
              const { error } = await client.from("ticket_types").delete().eq("id", ticket.id).eq("event_id", current.id).select("id").single();
              if (error) throw error;
            }, "");
            return true;
          }} /> : <section className="min-w-0 border-t border-[var(--line)] pt-5 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0" aria-labelledby="tickets-title">
            <h3 id="tickets-title" className="mb-2 text-base font-bold">Tipos de entrada</h3>
            <p className={helpClass}>Primero guarda el evento. Después podrás crear y asignar el aforo de cada tipo de entrada.</p>
          </section>}
        </div>
        {current && <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <p className={helpClass}>Eliminar el evento también elimina sus tipos de entrada.</p>
          <button className={dangerButton} disabled={busy} onClick={() => {
            if (!window.confirm(`¿Eliminar “${current.title}” y todos sus tipos de entrada? Esta acción no se puede deshacer.`)) return;
            void mutate(async () => {
              const { error } = await client.from("events").delete().eq("id", current.id).eq("owner_id", ownerId).select("id").single();
              if (error) throw error;
              setEditor(null);
              requestAnimationFrame(() => document.getElementById("create-event")?.focus());
            }, "Evento eliminado.").catch(error => setError(errorMessage(error)));
          }}>Eliminar evento</button>
        </div>}
      </section>}
    </>}
  </>;
}

function EventForm({ event, busy, onSave }: { event?: Event; busy: boolean; onSave: (form: FormData) => Promise<void> }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dateHintId = useId();
  return <form className="grid gap-4" onChange={() => setError("")} onSubmit={async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(""); setSubmitting(true);
    try { await onSave(form); } catch (error) { setError(errorMessage(error)); }
    finally { setSubmitting(false); }
  }}>
    <fieldset className="grid min-w-0 gap-4" disabled={busy}>
      <label className={labelClass}>Nombre del evento<input className={inputClass} name="title" defaultValue={event?.title} required /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5 sm:col-span-2">
          <label className={labelClass}>Fecha y hora del evento
            <input className={inputClass} type="datetime-local" name="starts_at" min={earliestEventDateTime()} defaultValue={event ? localDateTime(event.starts_at) : ""} required aria-describedby={dateHintId}
              onFocus={e => { e.currentTarget.min = earliestEventDateTime(); e.currentTarget.setCustomValidity(""); }}
              onInput={e => e.currentTarget.setCustomValidity("")}
              onInvalid={e => { if (e.currentTarget.validity.rangeUnderflow) e.currentTarget.setCustomValidity("Elige hoy o una fecha posterior para el evento."); }} />
          </label>
          <p id={dateHintId} className={helpClass}>Elige hoy o un día posterior. Se usa la zona horaria de tu dispositivo.</p>
        </div>
        <label className={labelClass}>Lugar<input className={inputClass} name="location" defaultValue={event?.location} required /></label>
        <label className={labelClass}>Aforo total (opcional)<input className={inputClass} type="number" name="capacity" min="1" max="2147483647" step="1" defaultValue={event?.capacity ?? ""} /><span className={helpClass}>Vacío: sin límite total.</span></label>
        <label className={labelClass}>Estado<select className={inputClass} name="status" defaultValue={event?.status ?? "draft"}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
      </div>
      <label className={labelClass}>Descripción<textarea className={`${inputClass} resize-y`} name="description" defaultValue={event?.description} rows={2} /></label>
      <p className={helpClass}>Los eventos publicados y sus entradas se pueden consultar públicamente.</p>
      {error && <p className={errorClass} role="alert">{error}</p>}
      <button type="submit" className={`${primaryButton} justify-self-start`}>{submitting ? "Guardando…" : event ? "Guardar cambios" : "Crear evento"}</button>
    </fieldset>
  </form>;
}

function TicketEditor({ event, busy, onSave, onDelete }: { event: Event; busy: boolean;
  onSave: (form: FormData, ticket?: Ticket) => Promise<void>; onDelete: (ticket: Ticket) => Promise<boolean> }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const assigned = event.ticket_types.reduce((sum, ticket) => sum + ticket.capacity, 0);
  const remaining = event.capacity === null ? null : Math.max(0, event.capacity - assigned);

  async function save(form: FormData, ticket?: Ticket) {
    setMessage(""); setError("");
    await onSave(form, ticket);
    setMessage(ticket ? "Cambios guardados en la entrada." : "Tipo de entrada agregado.");
    if (ticket) {
      setEditing(null);
      requestAnimationFrame(() => document.getElementById(`edit-ticket-${ticket.id}`)?.focus());
    }
  }

  return <section className="min-w-0 border-t border-[var(--line)] pt-5 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0" aria-labelledby="tickets-title">
    <h3 id="tickets-title" className="mb-3 text-base font-bold">Tipos de entrada</h3>
    <div className="mb-4 rounded-md bg-[var(--accent-soft)] px-3 py-3 text-sm leading-relaxed tabular-nums">
      <p><strong>{assigned.toLocaleString("es-CO")}</strong> {assigned === 1 ? "cupo asignado" : "cupos asignados"}{event.capacity !== null ? ` de ${event.capacity.toLocaleString("es-CO")}` : " · Sin límite total"}</p>
      {remaining !== null && <p className="text-[var(--accent)]">{remaining.toLocaleString("es-CO")} {remaining === 1 ? "cupo" : "cupos"} por asignar</p>}
    </div>
    {message && <p className="mb-3 text-sm text-[var(--accent)]" role="status">{message}</p>}
    {error && <p className={`${errorClass} mb-3`} role="alert">{error}</p>}
    {event.ticket_types.length === 0 ? <p className={`${helpClass} mb-4`}>Aún no hay entradas. Agrega el primer tipo a continuación.</p> : <ul className="mb-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {event.ticket_types.map(ticket => <li key={ticket.id} className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{ticket.name}</p><p className={helpClass}>{ticket.capacity.toLocaleString("es-CO")} {ticket.capacity === 1 ? "cupo" : "cupos"}</p></div>
          <div className="flex gap-2">
            <button id={`edit-ticket-${ticket.id}`} className={secondaryButton} disabled={busy} aria-label={`Editar entrada ${ticket.name}`} aria-expanded={editing === ticket.id} onClick={() => { setEditing(editing === ticket.id ? null : ticket.id); setMessage(""); setError(""); }}>{editing === ticket.id ? "Cancelar" : "Editar"}</button>
            <button className={dangerButton} disabled={busy} aria-label={`Eliminar entrada ${ticket.name}`} onClick={async () => {
              setError(""); setMessage("");
              try { if (await onDelete(ticket)) setMessage("Tipo de entrada eliminado."); } catch (error) { setError(errorMessage(error)); }
            }}>Eliminar</button>
          </div>
        </div>
        {editing === ticket.id && <div className="mt-3"><TicketForm key={`${ticket.id}:${ticket.name}:${ticket.capacity}`} ticket={ticket} busy={busy} remaining={remaining === null ? null : remaining + ticket.capacity} onSave={form => save(form, ticket)} /></div>}
      </li>)}
    </ul>}
    <h4 className="mb-3 text-sm font-bold">Agregar tipo de entrada</h4>
    {remaining === 0 ? <p className={errorClass} role="status">El aforo del evento está completamente asignado. Reduce los cupos de otra entrada o aumenta y guarda el aforo total antes de agregar una nueva.</p> : <TicketForm busy={busy} remaining={remaining} onSave={save} />}
  </section>;
}

function TicketForm({ ticket, busy, remaining, onSave }: { ticket?: Ticket; busy: boolean; remaining: number | null;
  onSave: (form: FormData) => Promise<void> }) {
  const [capacity, setCapacity] = useState(String(ticket?.capacity ?? ""));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const id = useId();
  const excess = remaining === null ? 0 : Math.max(0, Number(capacity) - remaining);
  const overLimit = excess > 0;
  return <form aria-label={ticket ? `Editar ${ticket.name}` : "Crear tipo de entrada"} onChange={() => setError("")} onSubmit={async e => {
    e.preventDefault();
    if (overLimit) return;
    const element = e.currentTarget;
    const form = new FormData(element);
    setError(""); setSubmitting(true);
    try {
      await onSave(form);
      if (!ticket) {
        element.reset(); setCapacity("");
        requestAnimationFrame(() => element.querySelector<HTMLInputElement>('input[name="name"]')?.focus());
      }
    } catch (error) { setError(errorMessage(error)); }
    finally { setSubmitting(false); }
  }}><fieldset className="grid min-w-0 gap-3" disabled={busy}>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,7rem)] gap-3">
      <label className={labelClass}>Nombre de la entrada<input className={inputClass} name="name" defaultValue={ticket?.name} required /></label>
      <label className={labelClass}>Aforo<input className={`${inputClass} aria-invalid:border-[#8a2d16]`} name="capacity" type="number" min="1" max={remaining ?? 2147483647} step="1" value={capacity} onChange={e => setCapacity(e.target.value)} required aria-invalid={overLimit} aria-describedby={`${id}-capacity-hint${overLimit ? ` ${id}-capacity-error` : ""}`} /></label>
    </div>
    <p id={`${id}-capacity-hint`} className={helpClass}>{remaining === null ? "Usa un número entero mayor que cero." : `Puedes asignar hasta ${remaining.toLocaleString("es-CO")} cupos a esta entrada.`}</p>
    {overLimit && <p id={`${id}-capacity-error`} className={errorClass} role="alert">El aforo ingresado supera en {excess.toLocaleString("es-CO")} {excess === 1 ? "cupo" : "cupos"} el límite del evento. Reduce la cantidad o aumenta y guarda el aforo total.</p>}
    {error && <p className={errorClass} role="alert">{error}</p>}
    <button type="submit" className={`${secondaryButton} justify-self-start`} disabled={overLimit}>{submitting ? "Guardando…" : ticket ? "Guardar entrada" : "Agregar entrada"}</button>
  </fieldset></form>;
}
