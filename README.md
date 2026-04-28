# holdup 🛑

Holdup. Did Claude actually check that?

Catches bugs Claude Code, Cursor, and Copilot ship to your PRs before your teammates do.

---

## Install

```bash
npx holdup-ai
```

## Usage

```bash
cd your-repo
npx holdup-ai
```

That's it. Reads your last 10 commits plus uncommitted changes. Tells you what's wrong.

---

## Example output

```
Holdup.

src/auth.ts:87 — calls verifyJwtToken(), no such method in this file. Did you mean verifyToken()?
src/db/queries.ts:23 — raw SQL string concat with user input. SQL injection. Use parameterized queries.
src/api/upload.ts:41 — imports sharp from 'sharp', not in package.json. Will explode in prod.

Holdup. Don't ship this.
```

---

## Requirements

Set your API key:

```bash
export ANTHROPIC_API_KEY=your_key_here
```

---

## What it catches

- Hallucinated APIs — function or method called that doesn't exist in the repo
- Made-up imports — library imported that isn't in package.json
- Type lies — `as any` hiding a real type mismatch
- Copy-paste smell — variable renamed but logic still refers to the wrong context
- Security tells — `eval()`, `exec()`, raw SQL concat, hardcoded secrets
- Inconsistency — pattern that contradicts the rest of the file
- Lying comments — comment says X, code does Y
- AI leftovers — TODO/FIXME the model left in

## What it ignores

- Style nitpicks
- Naming preferences
- "Consider adding..." suggestions

---

## License

MIT
