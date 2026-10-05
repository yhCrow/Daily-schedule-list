// Proves the planner is owner-only, against your real Supabase project.
//
//   npm run check-rls
//
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.local (or the
// environment). Checks that a logged-out visitor can read and write nothing.
// If TEST_EMAIL / TEST_PASSWORD are set (a second, non-owner account you
// created temporarily), it also checks that account can read and write nothing.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {
  /* no .env.local; rely on the environment */
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.')
  process.exit(1)
}

const TABLES = ['learning_items', 'revisions', 'todos', 'settings', 'app_owner']
let failures = 0
const pass = (msg) => console.log(`  PASS  ${msg}`)
const fail = (msg) => {
  failures++
  console.log(`  FAIL  ${msg}`)
}

async function expectLockedOut(db, who) {
  for (const table of TABLES) {
    const { data, error } = await db.from(table).select('*').limit(1)
    if (error || data.length === 0) pass(`${who} cannot read ${table}`)
    else fail(`${who} could read ${table}!`)
  }

  const inserts = {
    learning_items: { title: 'rls-probe', learned_on: '2026-01-01' },
    todos: { title: 'rls-probe', due_on: '2026-01-01' },
    settings: { long_term_review: true },
  }
  for (const [table, row] of Object.entries(inserts)) {
    const { error } = await db.from(table).insert(row)
    if (error) pass(`${who} cannot insert into ${table}`)
    else fail(`${who} inserted into ${table}! Delete the "rls-probe" row.`)
  }

  const { data: updated } = await db.from('todos').update({ title: 'hacked' }).neq('title', '').select('id')
  if (!updated || updated.length === 0) pass(`${who} cannot update todos`)
  else fail(`${who} updated ${updated.length} todos!`)

  const { data: deleted } = await db.from('learning_items').delete().neq('title', '').select('id')
  if (!deleted || deleted.length === 0) pass(`${who} cannot delete learning items`)
  else fail(`${who} deleted ${deleted.length} learning items!`)

  const { error: rpcError } = await db.rpc('add_learning_item', {
    p_item: { id: crypto.randomUUID(), title: 'rls-probe', learned_on: '2026-01-01' },
    p_revisions: [],
  })
  if (rpcError) pass(`${who} cannot call add_learning_item`)
  else fail(`${who} called add_learning_item!`)
}

console.log('Logged-out visitor:')
await expectLockedOut(createClient(url, key, { auth: { persistSession: false } }), 'anon')

if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
  console.log(`\nSecond account (${process.env.TEST_EMAIL}):`)
  const db = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await db.auth.signInWithPassword({
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD,
  })
  if (error) fail(`could not sign in test account: ${error.message}`)
  else await expectLockedOut(db, 'non-owner')
} else {
  console.log('\n(Set TEST_EMAIL and TEST_PASSWORD to also test a second, non-owner account.)')
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed: only the owner has access.')
process.exit(failures ? 1 : 0)
