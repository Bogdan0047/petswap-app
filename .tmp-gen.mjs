import { createClient } from '@supabase/supabase-js';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.generateLink({
  type: 'recovery',
  email: 'simion.bogdan1991@gmail.com',
  options: { redirectTo: 'https://ac8593d5-a3e9-4ab1-84a1-934b5a06cc67.lovableproject.com/reset-password' },
});
if (error) { console.error(error); process.exit(1); }
console.log(data.properties.action_link);
