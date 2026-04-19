# Supabase Setup

1. Create a Supabase project.
2. In `Authentication > Providers`, enable:
   - `Anonymous` (for first-run auto login)
   - `Email` (for OTP login link)
3. Open SQL Editor and run [`supabase-schema.sql`](./supabase-schema.sql).
4. Add env vars in your local `.env`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

5. Start app:

```bash
npm run dev
```

The app will:
- auto-create an anonymous session on first run,
- sync profile/sessions/results/shares to `app_user_state`,
- support email OTP login from Settings.
