import { createFileRoute } from "@tanstack/react-router";

// One-shot idempotent bootstrap for the single receptionist account.
// Safe to keep: after the first successful call it refuses to run again.
export const Route = createFileRoute("/api/public/bootstrap-receptionist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          password?: string;
        };
        const email = body.email?.trim().toLowerCase();
        const password = body.password;
        if (!email || !password || password.length < 8) {
          return Response.json({ error: "email + password (>=8) required" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Guard: refuse if any staff/admin already exists
        const { data: existing } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .in("role", ["staff", "admin"])
          .limit(1);
        if (existing && existing.length > 0) {
          return Response.json({ error: "receptionist already bootstrapped" }, { status: 409 });
        }

        const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (cErr || !created.user) {
          return Response.json({ error: cErr?.message ?? "create failed" }, { status: 500 });
        }

        const { error: rErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: created.user.id, role: "staff" });
        if (rErr) {
          return Response.json({ error: rErr.message }, { status: 500 });
        }

        return Response.json({ ok: true, user_id: created.user.id, email });
      },
    },
  },
});
