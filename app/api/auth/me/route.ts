import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ member: null, company: null }, { status: 200 });
  }
  return NextResponse.json({
    member: session.member,
    company: session.company,
    isImpersonating: session.isImpersonating,
  });
}
