<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase local auth email templates

When changing `supabase/config.toml` auth email template settings or any file in `supabase/templates/`, restart the local Supabase stack before asking the user to test. Use `npm run supabase:stop` followed by `npm run supabase:start`, then mention the local Mailpit URL from `supabase status`.
