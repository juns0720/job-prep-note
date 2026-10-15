/**
 * Supabase 테이블 타입. supabase/schema.sql과 손으로 맞춰 관리한다.
 * (Supabase CLI의 `supabase gen types typescript`를 나중에 붙이면 자동 생성으로 바꿀 수 있다.)
 *
 * `Relationships: []`는 실제로 외래키가 없다는 뜻이 아니라, 이 프로젝트가
 * PostgREST의 중첩 select(`select("*, cover_questions(*)")`) 타입 추론을 쓰지
 * 않는다는 뜻이다 — lib/data/queries.ts는 테이블별로 따로 조회해서 자바스크립트에서
 * 묶는다. 그래서 조인 메타데이터를 정확히 채울 필요가 없다.
 */
export type Database = {
  public: {
    Tables: {
      periods: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          period: string;
          name: string;
          role: string;
          due: string | null;
          status: "draft" | "writing" | "applied" | "docs_passed" | "coding_test" | "assignment" | "aptitude" | "interview" | "passed" | "rejected";
          url: string;
          memo: string;
          created_at: string;
          updated_at: string;
          save_tab: string | null;
          save_seq: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          period: string;
          name: string;
          role: string;
          due?: string | null;
          status?: "draft" | "writing" | "applied" | "docs_passed" | "coding_test" | "assignment" | "aptitude" | "interview" | "passed" | "rejected";
          url?: string;
          memo?: string;
        };
        Update: {
          period?: string;
          name?: string;
          role?: string;
          due?: string | null;
          status?: "draft" | "writing" | "applied" | "docs_passed" | "coding_test" | "assignment" | "aptitude" | "interview" | "passed" | "rejected";
          url?: string;
          memo?: string;
          save_tab?: string | null;
          save_seq?: number;
        };
        Relationships: [];
      };
      cover_questions: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          body: string;
          char_limit: number;
          answer: string;
          sort_order: number;
          created_at: string;
          save_tab: string | null;
          save_seq: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          body?: string;
          char_limit?: number;
          answer?: string;
          sort_order?: number;
        };
        Update: {
          body?: string;
          char_limit?: number;
          answer?: string;
          sort_order?: number;
          save_tab?: string | null;
          save_seq?: number;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          save_tab: string | null;
          save_seq: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          name?: string;
          sort_order?: number;
          save_tab?: string | null;
          save_seq?: number;
        };
        Relationships: [];
      };
      job_postings: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          external_id: string | null;
          url: string;
          company: string;
          title: string;
          location: string;
          career: string;
          employment: string;
          sector: string;
          due_text: string;
          due: string | null;
          picked: boolean;
          dismissed: boolean;
          note: string;
          raw: unknown;
          collected_at: string;
          apply_url: string;
          process: unknown;
          questions: unknown;
          company_info: unknown;
          deleted: boolean;
          save_tab: string | null;
          save_seq: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          external_id?: string | null;
          url: string;
          company?: string;
          title?: string;
          location?: string;
          career?: string;
          employment?: string;
          sector?: string;
          due_text?: string;
          due?: string | null;
          picked?: boolean;
          dismissed?: boolean;
          note?: string;
          raw?: unknown;
          apply_url?: string;
          process?: unknown;
          questions?: unknown;
          company_info?: unknown;
          deleted?: boolean;
        };
        Update: {
          picked?: boolean;
          dismissed?: boolean;
          deleted?: boolean;
          note?: string;
          save_tab?: string | null;
          save_seq?: number;
        };
        Relationships: [];
      };
      material_groups: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          save_tab: string | null;
          save_seq: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          name?: string;
          sort_order?: number;
          save_tab?: string | null;
          save_seq?: number;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          title: string;
          body: string;
          final: boolean;
          sort_order: number;
          created_at: string;
          save_tab: string | null;
          save_seq: number;
          order_tab: string | null;
          order_seq: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id: string;
          title?: string;
          body?: string;
          final?: boolean;
          sort_order?: number;
        };
        Update: {
          title?: string;
          body?: string;
          final?: boolean;
          sort_order?: number;
          save_tab?: string | null;
          save_seq?: number;
          order_tab?: string | null;
          order_seq?: number;
        };
        Relationships: [];
      };
      company_events: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          kind: "docs_result" | "coding_test" | "assignment" | "aptitude" | "interview" | "other";
          date: string | null;
          memo: string;
          created_at: string;
          save_tab: string | null;
          save_seq: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          kind?: "docs_result" | "coding_test" | "assignment" | "aptitude" | "interview" | "other";
          date?: string | null;
          memo?: string;
        };
        Update: {
          kind?: "docs_result" | "coding_test" | "assignment" | "aptitude" | "interview" | "other";
          date?: string | null;
          memo?: string;
          save_tab?: string | null;
          save_seq?: number;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          keywords: string;
          sort_order: number;
          created_at: string;
          save_tab: string | null;
          save_seq: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          description?: string;
          keywords?: string;
          sort_order?: number;
        };
        Update: {
          name?: string;
          description?: string;
          keywords?: string;
          sort_order?: number;
          save_tab?: string | null;
          save_seq?: number;
        };
        Relationships: [];
      };
      job_rules: {
        Row: {
          user_id: string;
          roles: string[];
          careers: string[];
          stacks: string[];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          roles?: string[];
          careers?: string[];
          stacks?: string[];
          updated_at?: string;
        };
        Update: {
          roles?: string[];
          careers?: string[];
          stacks?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      interview_questions: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          body: string;
          keywords: string[];
          answer: string;
          sort_order: number;
          created_at: string;
          save_tab: string | null;
          save_seq: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          body?: string;
          keywords?: string[];
          answer?: string;
          sort_order?: number;
        };
        Update: {
          body?: string;
          keywords?: string[];
          answer?: string;
          sort_order?: number;
          save_tab?: string | null;
          save_seq?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
