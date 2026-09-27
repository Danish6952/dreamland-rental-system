// Creates a login on the LOCAL stack only (npm run stack:up first).
//   npm run user:create -- <email> <password> "<Full name>" [owner|staff]
// On a fresh stack the first user becomes owner automatically.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const [email, password, name = 'User', role] = process.argv.slice(2);
if (!email || !password) {
  console.log('Usage: npm run user:create -- <email> <password> "<Full name>" [owner|staff]');
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
if (!env.LOCAL_SERVICE_KEY) {
  console.error('.env.local has no LOCAL_SERVICE_KEY — run "npm run stack:up" first (local stack only).');
  process.exit(1);
}
const res = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: env.LOCAL_SERVICE_KEY, authorization: `Bearer ${env.LOCAL_SERVICE_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: name } }),
});
const body = await res.json();
if (!res.ok) {
  console.error('Could not create user:', body.msg ?? body.message ?? JSON.stringify(body));
  process.exit(1);
}
if (role === 'owner' || role === 'staff') {
  execSync(`docker exec dl-db psql -U postgres -qc "update public.profiles set role='${role}' where id='${body.id}'"`);
}
const r = execSync(`docker exec dl-db psql -U postgres -tAc "select role from public.profiles where id='${body.id}'"`).toString().trim();
console.log(`✓ ${email} created as ${r}. Sign in at http://localhost:5173`);
