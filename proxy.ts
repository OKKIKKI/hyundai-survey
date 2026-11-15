import { NextResponse } from 'next/server';
import { adminLoginRequired, authenticateVercelAdmin } from './lib/vercel-admin-auth';

export function proxy(request: Request) {
  if (!authenticateVercelAdmin(request)) return adminLoginRequired();
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: '/admin.html' };
