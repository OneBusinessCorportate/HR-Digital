export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          candidate_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          candidate_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          candidate_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
          summary?: string | null
        }
        Relationships: []
      }
      candidate_contacts: {
        Row: {
          agreed_to_continue: boolean | null
          candidate_id: string
          channel: Database["public"]["Enums"]["contact_channel"]
          contact_at: string
          created_at: string
          created_by: string | null
          id: string
          next_action: string | null
          next_action_date: string | null
          note: string | null
          replied: boolean | null
          result: Database["public"]["Enums"]["contact_result"] | null
        }
        Insert: {
          agreed_to_continue?: boolean | null
          candidate_id: string
          channel?: Database["public"]["Enums"]["contact_channel"]
          contact_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          note?: string | null
          replied?: boolean | null
          result?: Database["public"]["Enums"]["contact_result"] | null
        }
        Update: Partial<Database["public"]["Tables"]["candidate_contacts"]["Insert"]>
        Relationships: []
      }
      candidate_evaluations: {
        Row: {
          candidate_id: string
          comment: string | null
          communication_score: number
          created_at: string
          culture_fit_score: number
          evaluated_by: string | null
          id: string
          interview_id: string | null
          motivation_score: number
          overall_score: number
          professional_score: number
          recommendation: Database["public"]["Enums"]["evaluation_recommendation"]
          scale_max: number
          skills_score: number
        }
        Insert: {
          candidate_id: string
          comment?: string | null
          communication_score: number
          created_at?: string
          culture_fit_score: number
          evaluated_by?: string | null
          id?: string
          interview_id?: string | null
          motivation_score: number
          overall_score: number
          professional_score: number
          recommendation: Database["public"]["Enums"]["evaluation_recommendation"]
          scale_max?: number
          skills_score: number
        }
        Update: Partial<Database["public"]["Tables"]["candidate_evaluations"]["Insert"]>
        Relationships: []
      }
      candidate_files: {
        Row: {
          candidate_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["candidate_files"]["Insert"]>
        Relationships: []
      }
      candidate_notes: {
        Row: {
          body: string
          candidate_id: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          body: string
          candidate_id: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: Partial<Database["public"]["Tables"]["candidate_notes"]["Insert"]>
        Relationships: []
      }
      candidate_stage_history: {
        Row: {
          candidate_id: string
          changed_by: string | null
          created_at: string
          from_stage: Database["public"]["Enums"]["recruitment_stage"] | null
          id: string
          is_manual_override: boolean
          note: string | null
          to_stage: Database["public"]["Enums"]["recruitment_stage"]
        }
        Insert: {
          candidate_id: string
          changed_by?: string | null
          created_at?: string
          from_stage?: Database["public"]["Enums"]["recruitment_stage"] | null
          id?: string
          is_manual_override?: boolean
          note?: string | null
          to_stage: Database["public"]["Enums"]["recruitment_stage"]
        }
        Update: Partial<Database["public"]["Tables"]["candidate_stage_history"]["Insert"]>
        Relationships: []
      }
      candidate_tests: {
        Row: {
          candidate_id: string
          comment: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          id: string
          is_manual_override: boolean
          max_score: number | null
          passed: boolean | null
          score: number | null
          score_percent: number | null
          sent_date: string | null
          test_link: string | null
          threshold_used: number | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          comment?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_manual_override?: boolean
          max_score?: number | null
          passed?: boolean | null
          score?: number | null
          score_percent?: number | null
          sent_date?: string | null
          test_link?: string | null
          threshold_used?: number | null
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["candidate_tests"]["Insert"]>
        Relationships: []
      }
      candidates: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          email_normalized: string | null
          first_contact_comment: string | null
          first_contact_date: string | null
          full_name: string
          id: string
          last_activity_at: string
          next_action: string | null
          next_action_date: string | null
          phone: string | null
          phone_normalized: string | null
          position: string | null
          rejection_comment: string | null
          rejection_date: string | null
          rejection_reason: string | null
          rejection_stage: Database["public"]["Enums"]["recruitment_stage"] | null
          responsible_user_id: string | null
          resume_file_path: string | null
          resume_url: string | null
          source: Database["public"]["Enums"]["candidate_source"]
          stage: Database["public"]["Enums"]["recruitment_stage"]
          telegram: string | null
          telegram_normalized: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          email_normalized?: string | null
          first_contact_comment?: string | null
          first_contact_date?: string | null
          full_name: string
          id?: string
          last_activity_at?: string
          next_action?: string | null
          next_action_date?: string | null
          phone?: string | null
          phone_normalized?: string | null
          position?: string | null
          rejection_comment?: string | null
          rejection_date?: string | null
          rejection_reason?: string | null
          rejection_stage?: Database["public"]["Enums"]["recruitment_stage"] | null
          responsible_user_id?: string | null
          resume_file_path?: string | null
          resume_url?: string | null
          source?: Database["public"]["Enums"]["candidate_source"]
          stage?: Database["public"]["Enums"]["recruitment_stage"]
          telegram?: string | null
          telegram_normalized?: string | null
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["candidates"]["Insert"]>
        Relationships: []
      }
      hr_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["hr_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["hr_role"]
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["hr_profiles"]["Insert"]>
        Relationships: []
      }
      interview_participants: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          name?: string | null
          user_id?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["interview_participants"]["Insert"]>
        Relationships: []
      }
      interviews: {
        Row: {
          actual_start: string | null
          availability: string | null
          candidate_id: string
          concerns: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          expected_salary: string | null
          format: Database["public"]["Enums"]["interview_format"]
          id: string
          language_level: string | null
          meet_link: string | null
          notes_after: string | null
          notes_before: string | null
          recommendation: string | null
          recording_url: string | null
          reminder_sent: boolean
          scheduled_start: string
          status: Database["public"]["Enums"]["interview_status"]
          strengths: string | null
          summary: string | null
          timezone: string
          transcript_text: string | null
          transcript_url: string | null
          updated_at: string
        }
        Insert: {
          actual_start?: string | null
          availability?: string | null
          candidate_id: string
          concerns?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          expected_salary?: string | null
          format?: Database["public"]["Enums"]["interview_format"]
          id?: string
          language_level?: string | null
          meet_link?: string | null
          notes_after?: string | null
          notes_before?: string | null
          recommendation?: string | null
          recording_url?: string | null
          reminder_sent?: boolean
          scheduled_start: string
          status?: Database["public"]["Enums"]["interview_status"]
          strengths?: string | null
          summary?: string | null
          timezone?: string
          transcript_text?: string | null
          transcript_url?: string | null
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["interviews"]["Insert"]>
        Relationships: []
      }
      offers: {
        Row: {
          candidate_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          decision: Database["public"]["Enums"]["offer_decision"] | null
          decision_by: string | null
          decision_date: string | null
          expected_start_date: string | null
          id: string
          position: string | null
          salary: string | null
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          candidate_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          decision?: Database["public"]["Enums"]["offer_decision"] | null
          decision_by?: string | null
          decision_date?: string | null
          expected_start_date?: string | null
          id?: string
          position?: string | null
          salary?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["offers"]["Insert"]>
        Relationships: []
      }
      probation_periods: {
        Row: {
          actual_end_date: string | null
          candidate_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          final_decision: string | null
          first_month_retained: boolean | null
          id: string
          manager_id: string | null
          planned_end_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["probation_status"]
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          candidate_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          final_decision?: string | null
          first_month_retained?: boolean | null
          id?: string
          manager_id?: string | null
          planned_end_date?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["probation_status"]
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["probation_periods"]["Insert"]>
        Relationships: []
      }
      recruitment_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: Partial<Database["public"]["Tables"]["recruitment_settings"]["Insert"]>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      hr_can_edit: { Args: Record<string, never>; Returns: boolean }
      hr_is_staff: { Args: Record<string, never>; Returns: boolean }
      hr_role: { Args: Record<string, never>; Returns: string }
    }
    Enums: {
      candidate_source:
        | "application"
        | "target"
        | "recommendation"
        | "linkedin"
        | "telegram"
        | "job_platform"
        | "other"
      contact_channel: "phone" | "telegram" | "whatsapp" | "email" | "other"
      contact_result:
        | "contacted"
        | "no_answer"
        | "interested"
        | "not_interested"
        | "follow_up"
        | "moved_to_test"
      evaluation_recommendation: "strong" | "proceed" | "needs_check" | "reject"
      hr_role: "admin" | "hr" | "manager"
      interview_format: "google_meet" | "office" | "phone" | "other"
      interview_status:
        | "scheduled"
        | "completed"
        | "no_show"
        | "cancelled"
        | "rescheduled"
      offer_decision: "approved" | "rejected"
      offer_status: "not_prepared" | "sent" | "accepted" | "declined" | "withdrawn"
      probation_status:
        | "not_started"
        | "in_progress"
        | "passed"
        | "failed"
        | "resigned"
        | "terminated"
      recruitment_stage:
        | "first_contact"
        | "test"
        | "screening"
        | "interview"
        | "experience_eval"
        | "offer"
        | "probation"
        | "hired"
        | "rejected"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T]
