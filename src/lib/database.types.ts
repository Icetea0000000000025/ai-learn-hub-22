export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      ai_logs: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          feature: string;
          id: string;
          prompt: string | null;
          response_status: number | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          feature: string;
          id?: string;
          prompt?: string | null;
          response_status?: number | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          feature?: string;
          id?: string;
          prompt?: string | null;
          response_status?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      certificates: {
        Row: {
          certificate_url: string;
          course_id: string | null;
          id: string;
          issued_at: string | null;
          recipient_name: string | null;
          user_id: string | null;
        };
        Insert: {
          certificate_url: string;
          course_id?: string | null;
          id?: string;
          issued_at?: string | null;
          recipient_name?: string | null;
          user_id?: string | null;
        };
        Update: {
          certificate_url?: string;
          course_id?: string | null;
          id?: string;
          issued_at?: string | null;
          recipient_name?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string | null;
          discount_amount: number;
          discount_type: string | null;
          expires_at: string | null;
          id: string;
          usage_limit: number | null;
          used_count: number | null;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          discount_amount: number;
          discount_type?: string | null;
          expires_at?: string | null;
          id?: string;
          usage_limit?: number | null;
          used_count?: number | null;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          discount_amount?: number;
          discount_type?: string | null;
          expires_at?: string | null;
          id?: string;
          usage_limit?: number | null;
          used_count?: number | null;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          category: string | null;
          created_at: string | null;
          creator_id: string | null;
          description: string | null;
          discount_price: number | null;
          id: string;
          image_url: string | null;
          is_featured: boolean | null;
          is_on_sale: boolean | null;
          level: string | null;
          price: number | null;
          promo_video_url: string | null;
          rating: number | null;
          reviews: number | null;
          sale_expires_at: string | null;
          sale_price: number | null;
          status: string | null;
          students: number | null;
          title: string;
          ad_type: string | null;
          ad_expires_at: string | null;
          is_campaign_active: boolean | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          discount_price?: number | null;
          id?: string;
          image_url?: string | null;
          is_featured?: boolean | null;
          is_on_sale?: boolean | null;
          level?: string | null;
          price?: number | null;
          promo_video_url?: string | null;
          rating?: number | null;
          reviews?: number | null;
          sale_expires_at?: string | null;
          sale_price?: number | null;
          status?: string | null;
          students?: number | null;
          title: string;
          ad_type?: string | null;
          ad_expires_at?: string | null;
          is_campaign_active?: boolean | null;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          discount_price?: number | null;
          id?: string;
          image_url?: string | null;
          is_featured?: boolean | null;
          is_on_sale?: boolean | null;
          level?: string | null;
          price?: number | null;
          promo_video_url?: string | null;
          rating?: number | null;
          reviews?: number | null;
          sale_expires_at?: string | null;
          sale_price?: number | null;
          status?: string | null;
          students?: number | null;
          title?: string;
          ad_type?: string | null;
          ad_expires_at?: string | null;
          is_campaign_active?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "courses_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          course_id: string | null;
          enrolled_at: string | null;
          id: string;
          last_lesson_id: string | null;
          user_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          course_id?: string | null;
          enrolled_at?: string | null;
          id?: string;
          last_lesson_id?: string | null;
          user_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          course_id?: string | null;
          enrolled_at?: string | null;
          id?: string;
          last_lesson_id?: string | null;
          user_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_last_lesson_id_fkey";
            columns: ["last_lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_progress: {
        Row: {
          completed_at: string | null;
          course_id: string | null;
          id: string;
          last_watched_seconds: number | null;
          lesson_id: string | null;
          user_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          course_id?: string | null;
          id?: string;
          last_watched_seconds?: number | null;
          lesson_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string | null;
          id?: string;
          last_watched_seconds?: number | null;
          lesson_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          attachment_url: string | null;
          body_text: string | null;
          content_type: string | null;
          course_id: string | null;
          id: string;
          module_id: string | null;
          order_index: number;
          title: string;
          video_url: string | null;
        };
        Insert: {
          attachment_url?: string | null;
          body_text?: string | null;
          content_type?: string | null;
          course_id?: string | null;
          id?: string;
          module_id?: string | null;
          order_index: number;
          title: string;
          video_url?: string | null;
        };
        Update: {
          attachment_url?: string | null;
          body_text?: string | null;
          content_type?: string | null;
          course_id?: string | null;
          id?: string;
          module_id?: string | null;
          order_index?: number;
          title?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          course_id: string | null;
          created_at: string | null;
          id: string;
          order_index: number;
          title: string;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string | null;
          id?: string;
          order_index?: number;
          title: string;
        };
        Update: {
          course_id?: string | null;
          created_at?: string | null;
          id?: string;
          order_index?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          currency: string;
          coupon_id: string | null;
          course_id: string | null;
          created_at: string | null;
          id: string;
          payment_method: string | null;
          status: string;
          transaction_id: string | null;
          user_id: string | null;
          platform_fee_percent: number | null;
          subscription_tier: string | null;
        };
        Insert: {
          amount: number;
          currency?: string;
          coupon_id?: string | null;
          course_id?: string | null;
          created_at?: string | null;
          id?: string;
          payment_method?: string | null;
          status?: string;
          transaction_id?: string | null;
          user_id?: string | null;
          platform_fee_percent?: number | null;
          subscription_tier?: string | null;
        };
        Update: {
          amount?: number;
          currency?: string;
          coupon_id?: string | null;
          course_id?: string | null;
          created_at?: string | null;
          id?: string;
          payment_method?: string | null;
          status?: string;
          transaction_id?: string | null;
          user_id?: string | null;
          platform_fee_percent?: number | null;
          subscription_tier?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          email: string | null;
          id: string;
          name: string | null;
          role: string | null;
          status: string | null;
          has_selected_role: boolean | null;
          subscription_tier: string | null;
          subscription_expires_at: string | null;
          ai_course_creation_count: number | null;
          last_ai_reset_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          email?: string | null;
          id: string;
          name?: string | null;
          role?: string | null;
          status?: string | null;
          has_selected_role?: boolean | null;
          subscription_tier?: string | null;
          subscription_expires_at?: string | null;
          ai_course_creation_count?: number | null;
          last_ai_reset_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          email?: string | null;
          id?: string;
          name?: string | null;
          role?: string | null;
          status?: string | null;
          has_selected_role?: boolean | null;
          subscription_tier?: string | null;
          subscription_expires_at?: string | null;
          ai_course_creation_count?: number | null;
          last_ai_reset_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          completed_at: string | null;
          id: string;
          passed: boolean;
          quiz_id: string;
          score: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          id?: string;
          passed: boolean;
          quiz_id: string;
          score: number;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          id?: string;
          passed?: boolean;
          quiz_id?: string;
          score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_options: {
        Row: {
          id: string;
          is_correct: boolean | null;
          option_text: string;
          order_index: number;
          question_id: string;
        };
        Insert: {
          id?: string;
          is_correct?: boolean | null;
          option_text: string;
          order_index: number;
          question_id: string;
        };
        Update: {
          id?: string;
          is_correct?: boolean | null;
          option_text?: string;
          order_index?: number;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          id: string;
          order_index: number;
          question_text: string;
          question_type: string | null;
          quiz_id: string;
        };
        Insert: {
          id?: string;
          order_index: number;
          question_text: string;
          question_type?: string | null;
          quiz_id: string;
        };
        Update: {
          id?: string;
          order_index?: number;
          question_text?: string;
          question_type?: string | null;
          quiz_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          attempt_limit: number | null;
          created_at: string | null;
          id: string;
          lesson_id: string;
          passing_score: number | null;
          shuffle_questions: boolean | null;
          time_limit: number | null;
          title: string;
        };
        Insert: {
          attempt_limit?: number | null;
          created_at?: string | null;
          id?: string;
          lesson_id: string;
          passing_score?: number | null;
          shuffle_questions?: boolean | null;
          time_limit?: number | null;
          title: string;
        };
        Update: {
          attempt_limit?: number | null;
          created_at?: string | null;
          id?: string;
          lesson_id?: string;
          passing_score?: number | null;
          shuffle_questions?: boolean | null;
          time_limit?: number | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          course_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          reason: string;
          reporter_id: string;
          status: string | null;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          reason: string;
          reporter_id: string;
          status?: string | null;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reports_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          comment: string | null;
          course_id: string | null;
          created_at: string | null;
          id: string;
          rating: number;
          user_id: string | null;
        };
        Insert: {
          comment?: string | null;
          course_id?: string | null;
          created_at?: string | null;
          id?: string;
          rating: number;
          user_id?: string | null;
        };
        Update: {
          comment?: string | null;
          course_id?: string | null;
          created_at?: string | null;
          id?: string;
          rating?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      support_messages: {
        Row: {
          created_at: string | null;
          id: string;
          message: string;
          sender_id: string | null;
          thread_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          message: string;
          sender_id?: string | null;
          thread_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          message?: string;
          sender_id?: string | null;
          thread_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "support_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      support_threads: {
        Row: {
          created_at: string | null;
          id: string;
          status: string | null;
          subject: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          status?: string | null;
          subject: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          status?: string | null;
          subject?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "support_threads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings: {
        Row: {
          key: string;
          updated_at: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string | null;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      system_notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          type: string | null;
          target_role: string | null;
          created_at: string | null;
          expires_at: string | null;
          is_active: boolean | null;
          link_url: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          type?: string | null;
          target_role?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean | null;
          link_url?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          type?: string | null;
          target_role?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean | null;
          link_url?: string | null;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          created_at: string | null;
          owner_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          created_at?: string | null;
          owner_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          created_at?: string | null;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string | null;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: string | null;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: string | null;
          joined_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_packages: {
        Row: {
          id: string;
          organization_id: string;
          course_id: string;
          max_seats: number | null;
          used_seats: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          course_id: string;
          max_seats?: number | null;
          used_seats?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          course_id?: string;
          max_seats?: number | null;
          used_seats?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_packages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_packages_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

// Helper Types
export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];

export type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
export type ModuleInsert = Database["public"]["Tables"]["modules"]["Insert"];
export type ModuleUpdate = Database["public"]["Tables"]["modules"]["Update"];

export type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
export type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];
export type LessonUpdate = Database["public"]["Tables"]["lessons"]["Update"];

export type EnrollmentRow = Database["public"]["Tables"]["enrollments"]["Row"];
export type EnrollmentInsert = Database["public"]["Tables"]["enrollments"]["Insert"];
export type EnrollmentUpdate = Database["public"]["Tables"]["enrollments"]["Update"];

export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type CertificateRow = Database["public"]["Tables"]["certificates"]["Row"];
export type CertificateInsert = Database["public"]["Tables"]["certificates"]["Insert"];
export type CertificateUpdate = Database["public"]["Tables"]["certificates"]["Update"];

export type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
export type QuizInsert = Database["public"]["Tables"]["quizzes"]["Insert"];
export type QuizUpdate = Database["public"]["Tables"]["quizzes"]["Update"];

export type QuizQuestionRow = Database["public"]["Tables"]["quiz_questions"]["Row"];
export type QuizQuestionInsert = Database["public"]["Tables"]["quiz_questions"]["Insert"];
export type QuizQuestionUpdate = Database["public"]["Tables"]["quiz_questions"]["Update"];

export type QuizOptionRow = Database["public"]["Tables"]["quiz_options"]["Row"];
export type QuizOptionInsert = Database["public"]["Tables"]["quiz_options"]["Insert"];
export type QuizOptionUpdate = Database["public"]["Tables"]["quiz_options"]["Update"];

export type QuizAttemptRow = Database["public"]["Tables"]["quiz_attempts"]["Row"];
export type QuizAttemptInsert = Database["public"]["Tables"]["quiz_attempts"]["Insert"];
export type QuizAttemptUpdate = Database["public"]["Tables"]["quiz_attempts"]["Update"];

export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];
export type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"];

export type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];
export type CouponInsert = Database["public"]["Tables"]["coupons"]["Insert"];
export type CouponUpdate = Database["public"]["Tables"]["coupons"]["Update"];

export type LessonProgressRow = Database["public"]["Tables"]["lesson_progress"]["Row"];
export type LessonProgressInsert = Database["public"]["Tables"]["lesson_progress"]["Insert"];
export type LessonProgressUpdate = Database["public"]["Tables"]["lesson_progress"]["Update"];

export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

export type SupportThreadRow = Database["public"]["Tables"]["support_threads"]["Row"];
export type SupportThreadInsert = Database["public"]["Tables"]["support_threads"]["Insert"];
export type SupportThreadUpdate = Database["public"]["Tables"]["support_threads"]["Update"];

export type SupportMessageRow = Database["public"]["Tables"]["support_messages"]["Row"];
export type SupportMessageInsert = Database["public"]["Tables"]["support_messages"]["Insert"];
export type SupportMessageUpdate = Database["public"]["Tables"]["support_messages"]["Update"];

export type AILogRow = Database["public"]["Tables"]["ai_logs"]["Row"];
export type AILogInsert = Database["public"]["Tables"]["ai_logs"]["Insert"];
export type AILogUpdate = Database["public"]["Tables"]["ai_logs"]["Update"];

export type SystemSettingRow = Database["public"]["Tables"]["system_settings"]["Row"];
export type SystemSettingInsert = Database["public"]["Tables"]["system_settings"]["Insert"];
export type SystemSettingUpdate = Database["public"]["Tables"]["system_settings"]["Update"];
