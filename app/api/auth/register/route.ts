import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { companyToDb } from '@/lib/supabase/mappers';
import { withRoute } from '@/lib/api/with-route';
import type { Company } from '@/lib/types';

const RegisterSchema = z.object({
  name: z.string().min(1).max(200),
  contactEmail: z.string().email().max(320),
  password: z.string().min(8).max(200),
  contactName: z.string().max(200).optional().default(''),
  industry: z.string().max(100).optional().default(''),
  location: z.string().max(200).optional().default(''),
  logo: z.string().max(2_000_000).optional(), // data URL
  privacyUrl: z.string().url().max(2000).optional(),
  imprintUrl: z.string().url().max(2000).optional(),
  // CorporateDesign shape is broad; validate at the boundary (presence + type),
  // not field-by-field. Stored as-is for now.
  corporateDesign: z.record(z.string(), z.unknown()).optional(),
  wunschJobQuests: z.coerce.number().int().min(0).max(10_000).optional(),
  wunschBerufschecks: z.coerce.number().int().min(0).max(10_000).optional(),
  wunschFormulare: z.coerce.number().int().min(0).max(10_000).optional(),
  wunschNotes: z.string().max(2000).optional(),
});

export const POST = withRoute({
  body: RegisterSchema,
  handler: async ({ body }) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[register] Missing Supabase env vars');
      return NextResponse.json(
        { error: 'Serverkonfiguration unvollständig.', code: 'env_missing' },
        { status: 500 },
      );
    }

    const contactEmail = body.contactEmail.toLowerCase().trim();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('companies')
      .select('id')
      .eq('contact_email', contactEmail)
      .single();
    if (existing) {
      return NextResponse.json(
        { error: 'E-Mail bereits registriert.', code: 'email_taken' },
        { status: 409 },
      );
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: contactEmail,
      password: body.password,
      email_confirm: true,
    });
    if (authError || !authData.user) {
      const msg = authError?.message ?? 'Auth user creation failed';
      console.error('[register] auth createUser', msg);
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
        return NextResponse.json(
          { error: 'E-Mail bereits registriert.', code: 'email_taken' },
          { status: 409 },
        );
      }
      // Generic message — never echo upstream Supabase error to the client.
      return NextResponse.json(
        { error: 'Registrierung fehlgeschlagen.', code: 'register_failed' },
        { status: 500 },
      );
    }

    const userId = authData.user.id;
    const companyId = crypto.randomUUID();
    const now = new Date().toISOString();

    const company: Company = {
      id: companyId,
      name: body.name,
      industry: body.industry || '',
      location: body.location || '',
      logo: body.logo,
      privacyUrl: body.privacyUrl,
      imprintUrl: body.imprintUrl,
      contactName: body.contactName || '',
      contactEmail,
      createdAt: now,
      // Cast intentional: CorporateDesign is a structured type owned by the
      // client. Validation at this boundary only enforces "object", and we
      // store it verbatim. Tightening the schema is tracked in PR7.
      corporateDesign: body.corporateDesign as Company['corporateDesign'],
    };

    const { error: companyError } = await admin
      .from('companies')
      .insert(companyToDb(company));
    if (companyError) {
      await admin.auth.admin.deleteUser(userId);
      console.error('[register] company insert', companyError);
      return NextResponse.json(
        { error: 'Registrierung fehlgeschlagen.', code: 'register_failed' },
        { status: 500 },
      );
    }

    const { error: memberError } = await admin
      .from('workspace_members')
      .insert({
        id: userId,
        company_id: companyId,
        name: body.contactName || body.name,
        email: contactEmail,
        role: 'admin',
        status: 'pending',
        created_at: now,
      });
    if (memberError) {
      await admin.auth.admin.deleteUser(userId);
      await admin.from('companies').delete().eq('id', companyId);
      console.error('[register] member insert', memberError);
      return NextResponse.json(
        { error: 'Registrierung fehlgeschlagen.', code: 'register_failed' },
        { status: 500 },
      );
    }

    const wunschJobQuests = body.wunschJobQuests ?? 0;
    const wunschBerufschecks = body.wunschBerufschecks ?? 0;
    const wunschFormulare = body.wunschFormulare ?? 0;
    if (wunschJobQuests || wunschBerufschecks || wunschFormulare) {
      await admin.from('quota_requests').insert({
        id: crypto.randomUUID(),
        company_id: companyId,
        company_name: body.name,
        contact_name: body.contactName || body.name,
        contact_email: contactEmail,
        requested_job_quests: wunschJobQuests,
        requested_berufschecks: wunschBerufschecks,
        requested_formulare: wunschFormulare,
        notes: body.wunschNotes || null,
        status: 'pending',
      });
    }

    return NextResponse.json({ pending: true });
  },
});
