/**
 * Database types.
 *
 * HAND-WRITTEN PLACEHOLDER. Replace with generated output once the project
 * exists — the generated file is authoritative and will catch drift this one
 * cannot:
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public \
 *     > lib/supabase/types.ts
 *
 * Until then this covers the tables, views and functions the application
 * actually touches, in the shape @supabase/supabase-js expects.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "super_admin" | "admin" | "editor" | "healer" | "customer";
export type ProfileStatus = "active" | "suspended" | "archived";
export type AuthProvider = "email" | "google" | "apple" | "phone";
export type RecordStatus = "draft" | "active" | "inactive" | "archived";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type ArticleKind = "article" | "guide" | "story";
export type SessionKind = "chat" | "audio" | "video";
export type BookingStatus =
  | "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show" | "expired";
export type BookingPaymentStatus =
  | "unpaid" | "processing" | "paid" | "failed" | "refunded" | "partially_refunded";
export type PaymentState =
  | "created" | "authorized" | "captured" | "failed" | "refunded" | "partially_refunded";
export type RefundState = "pending" | "processed" | "failed";
export type AvailabilityExceptionKind = "unavailable" | "extra";
export type ApplicationStatus = "new" | "reviewing" | "accepted" | "rejected";
export type DeviceType = "desktop" | "tablet" | "mobile" | "unknown";

/** Convenience: a table definition where Insert/Update are derived from Row. */
type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  timezone: string;
  marketing_opt_in: boolean;
  status: ProfileStatus;
  auth_provider: AuthProvider;
  provider_account_id: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type UserRoleRow = {
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  granted_at: string;
};

export type HealerRow = {
  id: string;
  user_id: string | null;
  slug: string;
  name: string;
  headline: string;
  bio: string;
  gender: string | null;
  years: number;
  rating: number | null;
  reviews_count: number;
  price_paise: number;
  currency: string;
  verified_identity: boolean;
  verified_credentials: boolean;
  verified_interviewed: boolean;
  avatar_url: string | null;
  avatar_alt: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  timezone: string;
  featured: boolean;
  display_order: number;
  status: RecordStatus;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

/** Shape returned by the public.healer_cards view — what the website renders. */
export type HealerCardRow = {
  id: string;
  slug: string;
  name: string;
  headline: string;
  bio: string;
  gender: string | null;
  years: number;
  rating: number | null;
  reviews_count: number;
  price_paise: number;
  currency: string;
  avatar_url: string | null;
  avatar_alt: string | null;
  cover_url: string | null;
  featured: boolean;
  display_order: number;
  status: RecordStatus;
  timezone: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  verified: { identity: boolean; credentials: boolean; interviewed: boolean };
  modalities: string[];
  languages: string[];
  session_types: SessionKind[];
};

export type SessionOfferingRow = {
  id: string;
  healer_id: string;
  kind: SessionKind;
  duration_minutes: number;
  price_paise: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AvailabilityRuleRow = {
  id: string;
  healer_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityExceptionRow = {
  id: string;
  healer_id: string;
  kind: AvailabilityExceptionKind;
  on_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
};

export type HealerBreakRow = {
  id: string;
  healer_id: string;
  label: string | null;
  weekday: number | null;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type BookingSettingsRow = {
  healer_id: string;
  timezone: string;
  slot_interval_minutes: number;
  buffer_minutes: number;
  min_notice_minutes: number;
  max_advance_days: number;
  max_sessions_per_day: number;
  accepting_bookings: boolean;
  created_at: string;
  updated_at: string;
};

export type BookingRow = {
  id: string;
  reference: string;
  customer_id: string | null;
  healer_id: string;
  offering_id: string | null;
  session_kind: SessionKind;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  blocks_until: string;
  amount_paise: number;
  currency: string;
  status: BookingStatus;
  payment_status: BookingPaymentStatus;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  customer_note: string | null;
  healer_note: string | null;
  hold_expires_at: string | null;
  source_path: string | null;
  source_route: string | null;
  analytics_session_id: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  booking_id: string | null;
  provider: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount_paise: number;
  amount_refunded_paise: number;
  currency: string;
  status: PaymentState;
  method: string | null;
  fee_paise: number | null;
  tax_paise: number | null;
  error_code: string | null;
  error_description: string | null;
  verified_via: "handler" | "webhook" | "reconciliation" | "manual" | null;
  verified_at: string | null;
  captured_at: string | null;
  notes: Json;
  created_at: string;
  updated_at: string;
};

export type RefundRow = {
  id: string;
  payment_id: string;
  razorpay_refund_id: string | null;
  amount_paise: number;
  currency: string;
  status: RefundState;
  reason: string | null;
  initiated_by: string | null;
  created_at: string;
  processed_at: string | null;
};

export type WebhookEventRow = {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  signature_valid: boolean;
  payload: Json;
  received_at: string;
  processed_at: string | null;
  processing_error: string | null;
};

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  kind: ArticleKind;
  category_slug: string | null;
  pathway: string | null;
  tags: string[];
  read_minutes: number;
  excerpt: string;
  body_blocks: string[];
  body_markdown: string;
  cover_url: string | null;
  cover_alt: string | null;
  author_name: string;
  author_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export type PracticeRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  pathway: string | null;
  chakra_slug: string | null;
  minutes: number;
  audio_url: string | null;
  cover_url: string | null;
  steps: Json;
  status: ContentStatus;
  featured: boolean;
  display_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  /** Added in migration 0014. */
  category: string | null;
  after_note: string;
};

export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: AppRole | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  summary: string | null;
  before_data: Json | null;
  after_data: Json | null;
  user_agent: string | null;
  created_at: string;
};

export type PageViewRow = {
  id: number;
  session_id: string | null;
  visitor_id: string;
  user_id: string | null;
  path: string;
  route: string;
  title: string | null;
  referrer_host: string | null;
  entered_at: string;
  exited_at: string | null;
  engagement_ms: number;
  max_scroll_pct: number;
  device_type: DeviceType | null;
  country: string | null;
  is_bot: boolean;
};

export type AnalyticsEventRow = {
  id: number;
  session_id: string | null;
  visitor_id: string;
  user_id: string | null;
  name: string;
  path: string | null;
  route: string | null;
  properties: Json;
  healer_id: string | null;
  article_id: string | null;
  booking_id: string | null;
  occurred_at: string;
  is_bot: boolean;
};

export type TeamMemberRow = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string | null;
  photo_alt: string | null;
  linkedin_url: string | null;
  display_order: number;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type PageEngagementRow = {
  route: string;
  views: number;
  visitors: number;
  sessions: number;
  avg_engagement_ms: number;
  avg_scroll_pct: number;
  cta_clicks: number;
  booking_starts: number;
  bookings_attributed: number;
  revenue_paise: number;
  conversion_rate: number;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id" | "email">;
      user_roles: Table<UserRoleRow, "user_id" | "role">;
      healers: Table<HealerRow, "slug" | "name">;
      healer_modalities: Table<
        { healer_id: string; modality_slug: string; display_order: number },
        "healer_id" | "modality_slug"
      >;
      healer_languages: Table<
        { healer_id: string; language_code: string; display_order: number },
        "healer_id" | "language_code"
      >;
      healer_credentials: Table<
        {
          id: string; healer_id: string; title: string; issuer: string | null;
          issued_year: number | null; document_url: string | null; verified: boolean;
          verified_by: string | null; verified_at: string | null;
          display_order: number; created_at: string;
        },
        "healer_id" | "title"
      >;
      session_offerings: Table<SessionOfferingRow, "healer_id" | "kind" | "duration_minutes" | "price_paise">;
      healer_availability_rules: Table<AvailabilityRuleRow, "healer_id" | "weekday" | "start_time" | "end_time">;
      availability_exceptions: Table<AvailabilityExceptionRow, "healer_id" | "kind" | "on_date">;
      healer_breaks: Table<HealerBreakRow, "healer_id" | "start_time" | "end_time">;
      healer_booking_settings: Table<BookingSettingsRow, "healer_id">;
      bookings: Table<BookingRow, "healer_id" | "session_kind" | "duration_minutes" | "starts_at" | "ends_at" | "blocks_until" | "amount_paise">;
      booking_events: Table<
        { id: number; booking_id: string; from_status: BookingStatus | null; to_status: BookingStatus; actor_id: string | null; note: string | null; created_at: string },
        "booking_id" | "to_status"
      >;
      payments: Table<PaymentRow, "razorpay_order_id" | "amount_paise">;
      refunds: Table<RefundRow, "payment_id" | "amount_paise">;
      webhook_events: Table<WebhookEventRow, "event_id" | "event_type" | "signature_valid" | "payload">;
      articles: Table<ArticleRow, "slug" | "title">;
      article_categories: Table<
        { slug: string; name: string; description: string | null; display_order: number; status: RecordStatus },
        "slug" | "name"
      >;
      modalities: Table<
        {
          slug: string; name: string; essence: string | null; what: string | null;
          session_note: string | null; is_not: string | null; path_slugs: string[];
          display_order: number; status: RecordStatus; created_at: string; updated_at: string;
        },
        "slug" | "name"
      >;
      languages: Table<{ code: string; name: string; display_order: number }, "code" | "name">;
      practices: Table<PracticeRow, "slug" | "title">;
      testimonials: Table<
        {
          id: string; display_name: string; anonymous: boolean; path_slug: string | null;
          quote: string; healer_id: string | null; status: ContentStatus; featured: boolean;
          display_order: number; created_at: string; updated_at: string;
        },
        "display_name" | "quote"
      >;
      site_content: Table<
        { key: string; label: string; description: string | null; value: Json; updated_at: string; updated_by: string | null },
        "key" | "label"
      >;
      media_assets: Table<
        {
          id: string; provider: string; public_id: string; secure_url: string;
          width: number | null; height: number | null; bytes: number | null;
          format: string | null; alt_text: string | null; folder: string | null;
          uploaded_by: string | null; created_at: string;
        },
        "public_id" | "secure_url"
      >;
      healer_invitations: Table<
        {
          id: string; healer_id: string; email: string; invited_by: string | null;
          invited_at: string; accepted_at: string | null; revoked_at: string | null; expires_at: string;
        },
        "healer_id" | "email"
      >;
      healer_applications: Table<
        {
          id: string; name: string; email: string; phone: string | null; modalities: string;
          years: number | null; languages: string | null; about: string;
          status: ApplicationStatus; reviewed_by: string | null; reviewed_at: string | null;
          review_note: string | null; created_healer_id: string | null; created_at: string;
        },
        "name" | "email" | "modalities" | "about"
      >;
      contact_messages: Table<
        {
          id: string; name: string; email: string; topic: string; message: string;
          handled_by: string | null; handled_at: string | null; created_at: string;
        },
        "name" | "email" | "topic" | "message"
      >;
      team_members: Table<TeamMemberRow, "name" | "role">;
      admin_audit_logs: Table<AuditLogRow, "action" | "resource_type">;
      app_settings: Table<
        { key: string; value: Json; label: string | null; description: string | null; category: string; updated_at: string; updated_by: string | null },
        "key"
      >;
      notifications: Table<
        { id: string; user_id: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string },
        "user_id" | "kind" | "title"
      >;
      export_jobs: Table<
        {
          id: string; requested_by: string | null; dataset: string; format: string;
          filters: Json; row_count: number | null; status: string; error: string | null;
          created_at: string; completed_at: string | null;
        },
        "dataset" | "format"
      >;
      import_batches: Table<
        {
          id: string; target: string; filename: string | null; row_count: number;
          valid_count: number; error_count: number; status: string;
          uploaded_by: string | null; created_at: string; committed_at: string | null;
        },
        "target"
      >;
      import_rows: Table<
        {
          id: number; batch_id: string; row_number: number; raw: Json; normalised: Json | null;
          errors: Json; valid: boolean; committed_record_id: string | null;
        },
        "batch_id" | "row_number" | "raw"
      >;
      analytics_sessions: Table<
        {
          id: string; visitor_id: string; user_id: string | null; started_at: string;
          last_event_at: string; ended_at: string | null; entry_path: string | null;
          entry_route: string | null; exit_path: string | null; page_view_count: number;
          event_count: number; engagement_ms: number; referrer_host: string | null;
          utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
          utm_content: string | null; utm_term: string | null; device_type: DeviceType | null;
          browser: string | null; os: string | null; country: string | null; is_bot: boolean;
        },
        "visitor_id"
      >;
      page_views: Table<PageViewRow, "visitor_id" | "path" | "route">;
      analytics_events: Table<AnalyticsEventRow, "visitor_id" | "name">;
    };
    Views: {
      healer_cards: { Row: HealerCardRow; Relationships: [] };
      published_articles: { Row: ArticleRow; Relationships: [] };
      published_practices: { Row: PracticeRow; Relationships: [] };
    };
    Functions: {
      get_day_slots: {
        Args: { p_healer_slug: string; p_date: string; p_duration_minutes?: number };
        Returns: { starts_at: string; ends_at: string; status: string }[];
      };
      get_available_slots: {
        Args: { p_healer_slug: string; p_date: string; p_duration_minutes?: number };
        Returns: { starts_at: string; ends_at: string }[];
      };
      create_booking_hold: {
        Args: {
          p_healer_slug: string;
          p_session_kind: SessionKind;
          p_starts_at: string;
          p_duration_minutes: number;
          p_guest_name?: string | null;
          p_guest_email?: string | null;
          p_guest_phone?: string | null;
          p_customer_note?: string | null;
          p_source_path?: string | null;
          p_source_route?: string | null;
          p_hold_minutes?: number;
        };
        Returns: Json;
      };
      page_engagement_report: {
        Args: { range_start: string; range_end: string; device?: string | null };
        Returns: PageEngagementRow[];
      };
      admin_dashboard_summary: {
        Args: { range_start: string; range_end: string };
        Returns: Json;
      };
      admin_daily_series: {
        Args: { range_start: string; range_end: string };
        Returns: {
          day: string;
          revenue_paise: number;
          bookings: number;
          visitors: number;
          page_views: number;
        }[];
      };
      admin_top_healers: {
        Args: { range_start: string; range_end: string; row_limit?: number };
        Returns: {
          healer_id: string; slug: string; name: string; avatar_url: string | null;
          bookings: number; revenue_paise: number; profile_views: number;
        }[];
      };
      admin_top_articles: {
        Args: { range_start: string; range_end: string; row_limit?: number };
        Returns: { article_id: string; slug: string; title: string; views: number; visitors: number }[];
      };
      admin_page_detail: {
        Args: { p_route: string; range_start: string; range_end: string };
        Returns: Json;
      };
      admin_event_totals: {
        Args: { range_start: string; range_end: string };
        Returns: { name: string; total: number; visitors: number }[];
      };
      healer_next_available: {
        Args: { p_healer_slug: string; p_days_ahead?: number; p_duration_minutes?: number };
        Returns: string | null;
      };
      healers_next_available: {
        Args: { p_slugs: string[]; p_days_ahead?: number };
        Returns: { slug: string; next_available: string | null }[];
      };
      expire_stale_booking_holds: { Args: Record<string, never>; Returns: number };
      refresh_analytics_rollups: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: {
      app_role: AppRole;
      booking_status: BookingStatus;
      booking_payment_status: BookingPaymentStatus;
      session_kind: SessionKind;
      content_status: ContentStatus;
      record_status: RecordStatus;
      article_kind: ArticleKind;
      payment_state: PaymentState;
      refund_state: RefundState;
      profile_status: ProfileStatus;
      auth_provider: AuthProvider;
      availability_exception_kind: AvailabilityExceptionKind;
      application_status: ApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
