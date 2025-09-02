'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function setDatabaseUrl(databaseUrl: string) {
  const cookieStore = await cookies();

  // Set the database URL in a secure session cookie
  cookieStore.set('database_url', databaseUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  redirect('/');
}
