<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase local auth email templates

When changing `supabase/config.toml` auth email template settings or any file in `supabase/templates/`, restart the local Supabase stack before asking the user to test. Use `npm run supabase:stop` followed by `npm run supabase:start`, then mention the local Mailpit URL from `supabase status`.

## Supabase production migrations

Never apply migrations or schema changes to the production Supabase project. Prepare and verify migration files locally, but leave production application to the user unless they explicitly instruct otherwise in the same turn.

## Git main branch

Never push to `main`. Commit locally or push to a non-main branch if requested, but leave `main` pushes to the user unless they explicitly instruct otherwise in the same turn.

## Worktrees

Work directly on `main` (the primary checkout) by default. Do not create git worktrees or switch to alternate branches unless the user explicitly asks for it in the same turn. If worktrees were created in earlier turns, clean them up and continue on `main`.
