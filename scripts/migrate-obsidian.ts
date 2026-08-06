/**
 * One-shot import of an Obsidian Kanban board. Not app code — it writes to the
 * boards collection directly, by design.
 *
 *   MONGODB_URI=... npx tsx scripts/migrate-obsidian.ts [file] [--name "Board"] [--dry-run]
 *
 * Locally, `npm run dev:api` prints the URI it is using; pass that.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';
import type { Board, Card, List } from '../shared/types.js';
import type { BoardDoc } from '../api/_lib/db.js';

const SETTINGS_BLOCK = '%% kanban:settings';

export function parseKanban(markdown: string, name: string): Board {
  const lists: List[] = [];

  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith(SETTINGS_BLOCK)) break;

    const heading = /^##\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      lists.push({ id: randomUUID(), name: heading[1]!, cards: [] });
      continue;
    }

    // Both states are imported as plain cards; this app has no checkbox.
    const card = /^-\s+\[[ xX]\]\s+(.*\S)\s*$/.exec(line);
    if (card && lists.length > 0) {
      const entry: Card = { id: randomUUID(), title: card[1]! };
      lists[lists.length - 1]!.cards.push(entry);
    }
  }

  return { id: randomUUID(), name, lists };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const nameFlag = args.indexOf('--name');
  const name = nameFlag === -1 ? 'Personal' : (args[nameFlag + 1] ?? 'Personal');
  const file = args.find((arg, index) => !arg.startsWith('--') && index !== nameFlag + 1);

  const board = parseKanban(readFileSync(file ?? 'existing-tasks.md', 'utf8'), name);
  const cards = board.lists.reduce((total, list) => total + list.cards.length, 0);

  console.log(`parsed "${board.name}": ${board.lists.length} lists, ${cards} cards`);
  for (const list of board.lists) console.log(`  ${list.name}: ${list.cards.length}`);

  if (dryRun) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  const client = await new MongoClient(uri).connect();
  try {
    const { id, ...rest } = board;
    await client
      .db(process.env.MONGODB_DB ?? 'todo')
      .collection<BoardDoc>('boards')
      .insertOne({ _id: id, ...rest });
    console.log(`inserted board ${id}`);
  } finally {
    await client.close();
  }
}

// Importing this file for its parser must not run the import.
if (process.argv[1]?.endsWith('migrate-obsidian.ts')) {
  void main();
}
