import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, unauthorized } from '@/lib/api-auth';
import { companyFromDb, companyToDb } from '@/lib/supabase/mappers';
import type { Company } from '@/lib/types';

// Validates the editable surface of the Company object. `id`, `createdAt`,
// and `plan` are intentionally not editable via this route — they would let
// a workspace admin grant themselves more quota or hijack another company.
const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(100).regex(/^[a-z0-9-]*$/i, 'invalid slug').optional(),
  description: z.string().max(8000).optional(),
  industry: z.string().max(100),
  location: z.string().max(200),
  logo: z.string().max(2_000_000).optional(),
  privacyUrl: z.string().url().max(2000).optional().or(z.literal('')),
  imprintUrl: z.string().url().max(2000).optional().or(z.literal('')),
  careerPageUrl: z.string().url().max(2000).optional().or(z.literal('')),
  contactName: z.string().max(200),
  contactEmail: z.string().email().max(320),
  corporateDesign: z.record(z.string(), z.unknown()).optional(),
  successPage: z.record(z.string(), z.unknown()).optional(),
  showcase: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  return NextResponse.json(session.company);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = UpdateCompanySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }
  // Drop client-supplied id/plan/createdAt; the session is the source of truth.
  const company = parsed.data as unknown as Company;
  const supabase = createAdminClient();
  const dbData = companyToDb({ ...company, id: session.company.id });
  const { id: _id, ...updateData } = dbData;

  // If a slug is being set, verify it's not already taken by another company.
  if (updateData.slug) {
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', updateData.slug)
      .neq('id', session.company.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: 'Dieser Link ist bereits vergeben. Bitte wähle einen anderen.', code: 'slug_taken' },
        { status: 409 },
      );
    }
  }

  const { data, error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', session.company.id)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Dieser Link ist bereits vergeben. Bitte wähle einen anderen.', code: 'slug_taken' },
        { status: 409 },
      );
    }
    console.error('[companies/me PUT] update failed', error);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  return NextResponse.json(companyFromDb(data!));
}
