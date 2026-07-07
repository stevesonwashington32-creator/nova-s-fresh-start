import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const STATUSES = ["pending", "confirmed", "arrived", "late", "completed", "cancelled"] as const;

const ReservationInput = z.object({
  guest_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservation_time: z.string().min(1).max(10),
  party_size: z.string().min(1).max(8),
  occasion: z.string().max(80).optional().nullable(),
  special_requests: z.string().max(1000).optional().nullable(),
});

function makeRef() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `NOV-${n}`;
}

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReservationInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ref = makeRef();
    const { data: row, error } = await supabaseAdmin
      .from("reservations")
      .insert({ ...data, ref, status: "pending" })
      .select("ref")
      .single();
    if (error) throw new Error(error.message);
    return { ref: row.ref };
  });

// Public lookup by phone — uses admin client, returns minimal fields, no auth.
export const findReservationsByPhone = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ phone: z.string().trim().min(5).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data: rows, error } = await supabaseAdmin
      .from("reservations")
      .select("id, ref, reservation_date, reservation_time, status, guest_name")
      .eq("phone", data.phone)
      .gte("reservation_date", today)
      .order("reservation_date", { ascending: true });
    if (error) throw new Error(error.message);
    return { reservations: rows ?? [] };
  });

// Public cancel by id + phone — owner-only via phone match.
export const cancelReservationByPhone = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), phone: z.string().trim().min(5).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data: row, error: fErr } = await supabaseAdmin
      .from("reservations")
      .select("id, phone, reservation_date, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!row) throw new Error("Reservation not found");
    if (row.phone !== data.phone) throw new Error("Phone does not match this reservation");
    if (row.reservation_date < today) throw new Error("Cannot cancel past reservations");
    const { error } = await supabaseAdmin
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: staffCheck } = await context.supabase
      .rpc("has_role", { _user_id: context.userId, _role: "staff" });
    const { data: adminCheck } = await context.supabase
      .rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!staffCheck && !adminCheck) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("reservations")
      .select("*")
      .order("reservation_date", { ascending: false })
      .order("reservation_time", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return { reservations: data ?? [] };
  });

export const updateReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(STATUSES),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reservations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rescheduleReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reservation_time: z.string().min(1).max(10),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const today = new Date().toISOString().slice(0, 10);
    if (data.reservation_date < today) throw new Error("Cannot reschedule to a past date");
    const { error } = await context.supabase
      .from("reservations")
      .update({
        reservation_date: data.reservation_date,
        reservation_time: data.reservation_time,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reservations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r) => r.role) as string[] };
  });

export const listRestaurantTables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("restaurant_tables")
      .select("id, number, capacity")
      .order("number", { ascending: true });
    if (error) throw new Error(error.message);
    return { tables: data ?? [] };
  });

export const getAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("app_settings")
      .select("reservation_grace_minutes")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { reservation_grace_minutes: data?.reservation_grace_minutes ?? 45 };
  });

export const updateGracePeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reservation_grace_minutes: z.number().int().min(0).max(720) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("app_settings")
      .update({ reservation_grace_minutes: data.reservation_grace_minutes })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignReservationTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      table_id: z.string().uuid().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reservations")
      .update({ table_id: data.table_id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

