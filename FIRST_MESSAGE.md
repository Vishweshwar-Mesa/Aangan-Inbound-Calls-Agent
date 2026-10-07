# First message to send in Claude Code

Copy everything below the line into Claude Code as your first message.

---

Before building anything, run a setup check and report back as a table.

1. Tools. Run each command and show the version, or "missing":
   - node -v        (need 20 or newer)
   - npm -v
   - git --version
   - gh --version, then gh auth status (logged in?)
   - openssl version
   - npx supabase --version   (optional, fine if missing)
   - npx vercel --version     (optional, fine if missing)
   For anything missing or too old, give me the exact install command for my
   operating system. Do not install anything yourself.

2. Kit files. Confirm these exist in this folder:
   CLAUDE.md, BUILD_PROMPT.md, CHANGELOG.md, rubric.txt, vani_agent_prompt.md,
   docs/CONTEXT.md, docs/DECISIONS.md, seed/test-set.json,
   seed/dummy-calls.md, seed/payloads/sample-call-ended.json, and
   seed/transcripts/T01.txt to T20.txt (all 20).
   List anything missing.

3. Git. Is this folder a Git repo yet? If not, tell me. Don't run git init yet.

4. Accounts I'll need for Phase 1. Ask me to confirm each one:
   - a Supabase project, with its URL, anon key and service role key ready
     (or say I'm on Neon)
   - a GitHub account, logged in through gh
   - a Vercel account
   Never ask me to paste key values into this chat. They go in .env.local only.

5. Then read CLAUDE.md, docs/CONTEXT.md and docs/DECISIONS.md and tell me in
   three lines where the project stands.

Stop there. Wait for me to say "start Phase 1" before writing any code.
