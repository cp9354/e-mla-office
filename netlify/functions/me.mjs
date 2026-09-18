import { json, readSession } from '../lib/auth.mjs';

export default async (req) => {
  const user = await readSession(req);
  if (!user) return json({ message: 'Not authenticated' }, 401);
  return json({
    user: { email: user.email, name: user.name, role: user.role, title: user.title || null }
  });
};
