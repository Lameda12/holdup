#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { simpleGit } from 'simple-git';

const HOLDUP_VOICE = `You are HoldUp. Skeptical senior dev reading a sketchy PR. Dry, funny, mean to bad code, nice to humans.

WHAT TO CATCH (in order of importance):
1. Hallucinated APIs — function or method called that doesn't exist in the repo
2. Made-up imports — library imported that isn't in package.json
3. Type lies — "as any" or unsafe casts hiding a real type mismatch
4. Copy-paste smell — variable renamed but logic still refers to original context
5. LLM security tells — eval(), exec(), raw SQL string concat, hardcoded secrets/keys
6. Inconsistency — style or pattern that contradicts the rest of the file
7. Lying comments — comment says X, code does Y
8. TODO/FIXME left in by the AI

OUTPUT FORMAT:
- Start with "Holdup." on its own line
- List max 5 findings, ranked by severity
- Each finding is ONE line: "file:line — what's wrong. fix."
- Example: "src/auth.ts:42 — calls getUserById(), no such method. Use findUser()."
- Final line is the verdict: either "Looks fine." or "Holdup. Don't ship this."

SKIP:
- Style nitpicks
- "Consider adding..." suggestions
- Any explanation longer than the fix itself

If the diff looks human-written and genuinely fine, skip the findings list and say only:
"Looks fine. Real human wrote this."

No padding. No softening. No "great work!". Say what's wrong and stop.`;

async function getDiff(): Promise<string> {
  const git = simpleGit(process.cwd());

  const [historical, uncommitted] = await Promise.all([
    git.diff(['HEAD~10..HEAD']).catch(() => ''),
    git.diff().catch(() => ''),
  ]);

  return (historical + '\n' + uncommitted).trim();
}

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor(maxLen / 2);
  const head = str.slice(0, half);
  const tail = str.slice(str.length - half);
  return head + '\n\n... [TRUNCATED MIDDLE] ...\n\n' + tail;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('Error: ANTHROPIC_API_KEY not set in environment.'));
    process.exit(1);
  }

  let diff = await getDiff();

  if (!diff) {
    console.log('nothing to roast. commit something first.');
    process.exit(0);
  }

  diff = truncateMiddle(diff, 30000);

  const client = new Anthropic({ apiKey });

  const userMessage = `<diff>\n${diff}\n</diff>\n\nRoast this diff. Be specific and ruthless. End with "holdup." if there are real problems, or "looks fine." if it's actually fine.`;

  process.stdout.write(chalk.yellow('HoldUp: '));

  let fullResponse = '';

  const stream = await client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 1500,
    system: HOLDUP_VOICE,
    messages: [{ role: 'user', content: userMessage }],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      const text = event.delta.text;
      process.stdout.write(chalk.white(text));
      fullResponse += text;
    }
  }

  process.stdout.write('\n');

  const lower = fullResponse.toLowerCase();
  const clean = lower.includes('looks fine.');
  const dirty = lower.includes("don't ship this") || (lower.includes('holdup.') && !clean);

  process.exit(clean && !dirty ? 0 : 1);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(chalk.red(`Error: ${msg}`));
  process.exit(1);
});
