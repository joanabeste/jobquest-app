// Auto-generated types placeholder.
// After applying the SQL schema to Supabase, regenerate with:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          industry: string;
          location: string;
          logo: string | null;
          privacy_url: string | null;
          imprint_url: string | null;
          contact_name: string;
          contact_email: string;
          password: string;
          corporate_design: Json;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      workspace_members: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          email: string;
          password: string;
          role: string;
          invited_by: string | null;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['workspace_members']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['workspace_members']['Insert']>;
      };
      job_quests: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          slug: string;
          status: string;
          modules: Json;
          lead_config: Json | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['job_quests']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['job_quests']['Insert']>;
      };
      leads: {
        Row: {
          id: string;
          job_quest_id: string;
          company_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          gdpr_consent: boolean;
          custom_fields: Json;
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'submitted_at'> & {
          id?: string;
          submitted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };
      analytics_events: {
        Row: {
          id: string;
          job_quest_id: string;
          type: string;
          session_id: string;
          duration: number | null;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['analytics_events']['Row'], 'id' | 'timestamp'> & {
          id?: string;
          timestamp?: string;
        };
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>;
      };
      career_checks: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          slug: string;
          status: string;
          blocks: Json;
          dimensions: Json;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['career_checks']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['career_checks']['Insert']>;
      };
      career_check_leads: {
        Row: {
          id: string;
          career_check_id: string;
          company_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          gdpr_consent: boolean;
          scores: Json;
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['career_check_leads']['Row'], 'id' | 'submitted_at'> & {
          id?: string;
          submitted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['career_check_leads']['Insert']>;
      };
      form_pages: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          slug: string;
          status: string;
          content_blocks: Json;
          form_steps: Json;
          form_config: Json;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['form_pages']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['form_pages']['Insert']>;
      };
      form_submissions: {
        Row: {
          id: string;
          form_page_id: string;
          company_id: string;
          answers: Json;
          gdpr_consent: boolean;
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['form_submissions']['Row'], 'id' | 'submitted_at'> & {
          id?: string;
          submitted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['form_submissions']['Insert']>;
      };
      funnel_docs: {
        Row: {
          id: string;
          content_id: string;
          content_type: string;
          pages: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['funnel_docs']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['funnel_docs']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
