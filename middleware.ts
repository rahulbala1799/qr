import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';

export function middleware(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || nanoid();
  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
