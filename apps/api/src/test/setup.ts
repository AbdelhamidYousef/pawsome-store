import { sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { closeDb, db } from '../db/client.ts';
import { clearBadgeCache } from '../modules/catalog/badge-index.ts';
import { clearTopicCache } from '../modules/reviews/service.ts';

import { settlePending } from './pending.ts';

// Every table, children before the tables they reference, so deleting in this order never trips
// a foreign key.
let tables: string[] = [];

beforeAll(async () => {
  // Safety net: emptying tables is destructive, so check we are really on a *_test database even
  // if someone ran with NODE_ENV=test and no DATABASE_URL_TEST (which would fall back to dev).
  const [row] = await db.execute<{ name: string }>(sql`select current_database() as name`);
  if (!/_test(_[a-z0-9]+)?$/.test(row?.name ?? '')) {
    throw new Error(
      `refusing to empty "${row?.name}": the test database name must end in _test or _test_<lane>`,
    );
  }
  // Read the tables and their foreign keys from the database instead of hard-coding them, so a
  // table added in a later phase is cleaned automatically. The migration journal lives in another
  // schema and is untouched.
  const rows = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const fks = await db.execute<{ child: string; parent: string }>(sql`
    select c.relname as child, p.relname as parent
    from pg_constraint k
    join pg_class c on c.oid = k.conrelid
    join pg_class p on p.oid = k.confrelid
    where k.contype = 'f' and k.connamespace = 'public'::regnamespace and k.conrelid <> k.confrelid
  `);
  tables = childrenFirst(
    rows.map((r) => r.tablename),
    fks,
  );
});

// Topological order: a table comes after every table that references it.
function childrenFirst(names: string[], fks: { child: string; parent: string }[]): string[] {
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (table: string) => {
    const seen = state.get(table);
    if (seen === 'done') return;
    if (seen === 'visiting') throw new Error(`foreign-key cycle through "${table}"`);
    state.set(table, 'visiting');
    for (const fk of fks) if (fk.parent === table) visit(fk.child);
    state.set(table, 'done');
    order.push(table);
  };
  names.forEach(visit);
  // `visit` pushes a table after its children, so `order` is already children first.
  return order;
}

// Every test starts from an empty database. DELETE, not TRUNCATE: TRUNCATE rebuilds every index of
// every table it names and Postgres 16 fsyncs each rebuilt index, which cost ~0.7 s per table on a
// slow disk and pushed whole files past their timeouts. A test leaves a few hundred rows at most,
// which DELETE clears in milliseconds. Only the tables that hold rows are touched (one probe query).
// No table uses a serial column; the order-number sequence is reset by hand.
beforeEach(async () => {
  const probe = tables.map((t) => `select '${t}' as t where exists (select 1 from "${t}")`);
  const dirty = new Set(
    (await db.execute<{ t: string }>(sql.raw(probe.join(' union all ')))).map((r) => r.t),
  );
  for (const t of tables) if (dirty.has(t)) await db.execute(sql.raw(`delete from "${t}"`));
  await db.execute(sql`alter sequence order_number_seq restart with 1`);
  // The badge index is cached for a minute in production; a new test must not see the last one's.
  clearBadgeCache();
  clearTopicCache();
});

// Before the next test's truncate, not after it: see pending.ts.
afterEach(settlePending);

afterAll(async () => {
  await closeDb();
});
