"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";
import { checkCapacity, eventValues, localDateTime, ticketValues } from "./validation";

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

  if (!url || !key) return <p className="notice" role="status">El panel aún no está configurado. Configura la conexión con Supabase para habilitar el acceso de organizadores.</p>;
  if (loading) return <p className="notice" role="status">Verificando tu sesión…</p>;
  return <>
    {error && <p className="notice error" role="alert">{error}</p>}
    {user && client ? <>
      <div className="organizer-toolbar"><p>{user.email}</p><button className="secondary" disabled={busy} onClick={signOut}>Cerrar sesión</button></div>
      <Dashboard key={user.id} client={client} ownerId={user.id} />
    </> : <section className="login-panel" aria-labelledby="login-title">
      <h2 id="login-title">Inicia sesión</h2>
      <p>Gestiona tus eventos y sus tipos de entrada con tu cuenta de organizador.</p>
      <form onSubmit={signIn}>
        <fieldset disabled={busy || !client}>
          <label>Correo electrónico<input name="email" type="email" autoComplete="username" required /></label>
          <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button button-primary" type="submit">{busy ? "Entrando…" : "Entrar"}</button>
        </fieldset>
      </form>
      <p className="help">Usa una cuenta creada en Supabase Auth. Si no tienes acceso, contacta al administrador.</p>
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
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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

  async function mutate(action: () => Promise<void>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      await action();
      setMessage(success);
      try { await load(); } catch { setLoadError("El cambio se guardó, pero no pudimos actualizar la lista. Recarga antes de seguir editando."); }
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function saveEvent(form: FormData, existing?: Event) {
    const values = eventValues(form);
    checkCapacity(values.capacity, existing?.ticket_types.reduce((sum, ticket) => sum + ticket.capacity, 0) ?? 0);
    const query = existing ? client.from("events").update(values).eq("id", existing.id).eq("owner_id", ownerId)
      : client.from("events").insert({ ...values, owner_id: ownerId });
    const { data, error } = await query.select("id").single();
    if (error) throw error;
    setSelected(data.id); setCreating(false);
  }

  const current = events.find(event => event.id === selected);
  return <>
    <div className="organizer-toolbar"><h2>Mis eventos</h2>
      <button className="button button-primary" disabled={busy || loading || !!loadError} onClick={() => { setCreating(true); setSelected(null); setError(""); setMessage(""); }}>Crear evento</button>
    </div>
    {message && <p className="notice" role="status">{message}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {loading ? <p role="status">Cargando eventos…</p> : loadError ? <div className="notice error" role="alert"><p>{loadError}</p><button className="secondary" onClick={() => window.location.reload()}>Recargar</button></div> : <>
      {!events.length && !creating && <p className="notice">Todavía no tienes eventos. Crea el primero para configurar sus entradas.</p>}
      <div className="event-list">
        {events.map(event => <button key={event.id} className="event-row" disabled={busy} aria-pressed={selected === event.id}
          onClick={() => { setSelected(event.id); setCreating(false); setError(""); setMessage(""); }}>
          <strong>{event.title}</strong>
          <span>{new Date(event.starts_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })} · {event.location}</span>
          <span>{event.status === "published" ? "Publicado" : "Borrador"} · {event.ticket_types.reduce((sum, ticket) => sum + ticket.capacity, 0)} cupos asignados{event.capacity !== null ? ` / ${event.capacity}` : " · Sin límite total"}</span>
        </button>)}
      </div>
      {(creating || current) && <section className="editor" aria-labelledby="editor-title" key={current?.id ?? "new"}>
        <div className="organizer-toolbar"><h2 id="editor-title">{current ? "Editar evento" : "Nuevo evento"}</h2>
          <button className="secondary" disabled={busy} onClick={() => { setCreating(false); setSelected(null); }}>Cerrar editor</button></div>
        <EventForm event={current} busy={busy} onSave={form => mutate(() => saveEvent(form, current), "Evento guardado.")} />
        {current && <>
          <TicketEditor event={current} busy={busy} onSave={(form, ticket) => mutate(async () => {
            const values = ticketValues(form);
            checkCapacity(current.capacity, current.ticket_types.filter(item => item.id !== ticket?.id).reduce((sum, item) => sum + item.capacity, 0) + values.capacity);
            const query = ticket ? client.from("ticket_types").update(values).eq("id", ticket.id).eq("event_id", current.id)
              : client.from("ticket_types").insert({ ...values, event_id: current.id });
            const { error } = await query.select("id").single();
            if (error) throw error;
          }, "Tipo de entrada guardado.")} onDelete={ticket => {
            if (!window.confirm(`¿Eliminar el tipo de entrada “${ticket.name}”?`)) return;
            void mutate(async () => {
              const { error } = await client.from("ticket_types").delete().eq("id", ticket.id).eq("event_id", current.id).select("id").single();
              if (error) throw error;
            }, "Tipo de entrada eliminado.");
          }} />
          <div className="delete-event"><p>Eliminar el evento también elimina todos sus tipos de entrada.</p>
            <button className="secondary danger" disabled={busy} onClick={() => {
              if (!window.confirm(`¿Eliminar “${current.title}” y todos sus tipos de entrada? Esta acción no se puede deshacer.`)) return;
              void mutate(async () => {
                const { error } = await client.from("events").delete().eq("id", current.id).eq("owner_id", ownerId).select("id").single();
                if (error) throw error;
                setSelected(null);
              }, "Evento eliminado.");
            }}>Eliminar evento</button></div>
        </>}
      </section>}
    </>}
  </>;
}

function EventForm({ event, busy, onSave }: { event?: Event; busy: boolean; onSave: (form: FormData) => Promise<void> }) {
  return <form onSubmit={e => { e.preventDefault(); void onSave(new FormData(e.currentTarget)); }}>
    <fieldset disabled={busy}>
      <label>Nombre del evento<input name="title" defaultValue={event?.title} required /></label>
      <label>Descripción<textarea name="description" defaultValue={event?.description} rows={3} /></label>
      <div className="form-grid">
        <label>Fecha y hora<input type="datetime-local" name="starts_at" defaultValue={event ? localDateTime(event.starts_at) : ""} required /><span className="help">Zona horaria de tu dispositivo.</span></label>
        <label>Lugar<input name="location" defaultValue={event?.location} required /></label>
        <label>Aforo total (opcional)<input type="number" name="capacity" min="1" max="2147483647" step="1" defaultValue={event?.capacity ?? ""} /><span className="help">Vacío: sin límite total. Las entradas nunca pueden superar este aforo.</span></label>
        <label>Estado<select name="status" defaultValue={event?.status ?? "draft"}><option value="draft">Borrador</option><option value="published">Publicado</option></select><span className="help">Publicar permite la lectura pública del evento y sus tipos de entrada.</span></label>
      </div>
      <button type="submit" className="button button-primary">{busy ? "Guardando…" : "Guardar evento"}</button>
    </fieldset>
  </form>;
}

function TicketEditor({ event, busy, onSave, onDelete }: { event: Event; busy: boolean;
  onSave: (form: FormData, ticket?: Ticket) => Promise<void>; onDelete: (ticket: Ticket) => void }) {
  return <section className="ticket-editor" aria-labelledby="tickets-title">
    <h2 id="tickets-title">Tipos de entrada</h2>
    <p className="help">{event.ticket_types.reduce((sum, ticket) => sum + ticket.capacity, 0)} cupos asignados{event.capacity !== null ? ` de ${event.capacity}` : " · Sin límite total"}. Cada tipo debe tener al menos un cupo.</p>
    {event.ticket_types.length === 0 && <p>No hay tipos de entrada todavía.</p>}
    {event.ticket_types.map(ticket => <TicketForm key={`${ticket.id}:${ticket.name}:${ticket.capacity}`} ticket={ticket} busy={busy} onSave={form => onSave(form, ticket)} onDelete={() => onDelete(ticket)} />)}
    <h3>Nuevo tipo de entrada</h3>
    <TicketForm busy={busy} onSave={onSave} />
  </section>;
}

function TicketForm({ ticket, busy, onSave, onDelete }: { ticket?: Ticket; busy: boolean;
  onSave: (form: FormData) => Promise<void>; onDelete?: () => void }) {
  return <form className="ticket-form" aria-label={ticket ? `Editar ${ticket.name}` : "Crear tipo de entrada"} onSubmit={e => {
    e.preventDefault(); void onSave(new FormData(e.currentTarget));
  }}><fieldset disabled={busy}>
    <label>Nombre de la entrada<input name="name" defaultValue={ticket?.name} required /></label>
    <label>Aforo<input name="capacity" type="number" min="1" max="2147483647" step="1" defaultValue={ticket?.capacity} required /></label>
    <button type="submit" className="secondary">{ticket ? "Guardar entrada" : "Agregar entrada"}</button>
    {ticket && <button type="button" className="secondary danger" onClick={onDelete} aria-label={`Eliminar ${ticket.name}`}>Eliminar</button>}
  </fieldset></form>;
}
