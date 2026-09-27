// LOCAL STACK ONLY: prints anon + service_role JWTs for the local secret
import crypto from 'node:crypto';
const secret = process.argv[2];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (payload) => {
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64(payload);
  return `${h}.${p}.${crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')}`;
};
const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 86400;
console.log(`ANON_KEY=${sign({ role: 'anon', iss: 'local', exp })}`);
console.log(`SERVICE_KEY=${sign({ role: 'service_role', iss: 'local', exp })}`);
