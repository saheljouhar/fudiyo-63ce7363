export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          message: string
          restaurant_id: string | null
          sent_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          restaurant_id?: string | null
          sent_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          restaurant_id?: string | null
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_status"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "announcements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          date: string
          id: string
          staff_id: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          date?: string
          id?: string
          staff_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          date?: string
          id?: string
          staff_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_time: string
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          party_size: number
          restaurant_id: string | null
          source: string
          status: Database["public"]["Enums"]["booking_status"]
          table_id: string | null
        }
        Insert: {
          booking_time: string
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          party_size?: number
          restaurant_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["booking_status"]
          table_id?: string | null
        }
        Update: {
          booking_time?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          party_size?: number
          restaurant_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["booking_status"]
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_status"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "bookings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_availability_log: {
        Row: {
          dish_id: string
          dish_name: string
          id: string
          toggled_off_at: string
          toggled_on_at: string | null
        }
        Insert: {
          dish_id: string
          dish_name: string
          id?: string
          toggled_off_at?: string
          toggled_on_at?: string | null
        }
        Update: {
          dish_id?: string
          dish_name?: string
          id?: string
          toggled_off_at?: string
          toggled_on_at?: string | null
        }
        Relationships: []
      }
      dishes: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_archived: boolean
          is_available: boolean
          is_featured: boolean
          name: string
          photo_url: string | null
          price: number
          restaurant_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_archived?: boolean
          is_available?: boolean
          is_featured?: boolean
          name: string
          photo_url?: string | null
          price: number
          restaurant_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_archived?: boolean
          is_available?: boolean
          is_featured?: boolean
          name?: string
          photo_url?: string | null
          price?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_status"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          id: string
          low_stock_threshold: number
          name: string
          quantity: number
          restaurant_id: string | null
          supplier: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name: string
          quantity?: number
          restaurant_id?: string | null
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name?: string
          quantity?: number
          restaurant_id?: string | null
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          restaurant_id: string | null
          target_user_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          restaurant_id?: string | null
          target_user_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          restaurant_id?: string | null
          target_user_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_status"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          discount: number
          id: string
          items: Json
          note: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: string | null
          restaurant_id: string
          round: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_id: string | null
          tax: number
          total: number
          updated_at: string
          waiter_id: string | null
          waiter_name: string | null
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          items?: Json
          note?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: string | null
          restaurant_id: string
          round?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          items?: Json
          note?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: string | null
          restaurant_id?: string
          round?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_status"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          language_preference: string
          name: string
          restaurant_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          language_preference?: string
          name: string
          restaurant_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          language_preference?: string
          name?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_status"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accept_card: boolean
          accept_cash: boolean
          accept_upi: boolean
          address: string | null
          auto_print_bill: boolean
          auto_print_kot: boolean
          bill_footer: string | null
          bill_header: string | null
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          gst_number: string | null
          id: string
          name: string
          paper_size: string
          phone: string | null
          share_live_data: boolean
          show_upi_qr: boolean
          status: string
          tax_rate: number
          upi_id: string | null
        }
        Insert: {
          accept_card?: boolean
          accept_cash?: boolean
          accept_upi?: boolean
          address?: string | null
          auto_print_bill?: boolean
          auto_print_kot?: boolean
          bill_footer?: string | null
          bill_header?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          gst_number?: string | null
          id?: string
          name: string
          paper_size?: string
          phone?: string | null
          share_live_data?: boolean
          show_upi_qr?: boolean
          status?: string
          tax_rate?: number
          upi_id?: string | null
        }
        Update: {
          accept_card?: boolean
          accept_cash?: boolean
          accept_upi?: boolean
          address?: string | null
          auto_print_bill?: boolean
          auto_print_kot?: boolean
          bill_footer?: string | null
          bill_header?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          gst_number?: string | null
          id?: string
          name?: string
          paper_size?: string
          phone?: string | null
          share_live_data?: boolean
          show_upi_qr?: boolean
          status?: string
          tax_rate?: number
          upi_id?: string | null
        }
        Relationships: []
      }
      shift_log: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          id: string
          opened_at: string
          opened_by: string | null
          restaurant_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          restaurant_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_status"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "shift_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_by: string | null
          date: string
          end_time: string
          id: string
          staff_id: string
          start_time: string
        }
        Insert: {
          created_by?: string | null
          date: string
          end_time: string
          id?: string
          staff_id: string
          start_time: string
        }
        Update: {
          created_by?: string | null
          date?: string
          end_time?: string
          id?: string
          staff_id?: string
          start_time?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          assigned_waiter_id: string | null
          floor: string
          id: string
          number: string
          occupied_since: string | null
          restaurant_id: string
          seats: number
          status: Database["public"]["Enums"]["table_status"]
          updated_at: string
        }
        Insert: {
          assigned_waiter_id?: string | null
          floor?: string
          id?: string
          number: string
          occupied_since?: string | null
          restaurant_id: string
          seats?: number
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Update: {
          assigned_waiter_id?: string | null
          floor?: string
          id?: string
          number?: string
          occupied_since?: string | null
          restaurant_id?: string
          seats?: number
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_status"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      void_log: {
        Row: {
          created_at: string
          dish_name: string
          id: string
          order_id: string | null
          reason: string
          voided_by: string | null
        }
        Insert: {
          created_at?: string
          dish_name: string
          id?: string
          order_id?: string | null
          reason: string
          voided_by?: string | null
        }
        Update: {
          created_at?: string
          dish_name?: string
          id?: string
          order_id?: string | null
          reason?: string
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "void_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_log: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          item_name: string
          logged_by: string | null
          quantity: number
          reason: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name: string
          logged_by?: string | null
          quantity: number
          reason: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string
          logged_by?: string | null
          quantity?: number
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      restaurant_status: {
        Row: {
          available_tables: number | null
          dishes: Json | null
          estimated_wait_minutes: number | null
          last_updated: string | null
          occupied_tables: number | null
          restaurant_id: string | null
          restaurant_name: string | null
          total_tables: number | null
        }
        Insert: {
          available_tables?: never
          dishes?: never
          estimated_wait_minutes?: never
          last_updated?: never
          occupied_tables?: never
          restaurant_id?: string | null
          restaurant_name?: string | null
          total_tables?: never
        }
        Update: {
          available_tables?: never
          dishes?: never
          estimated_wait_minutes?: never
          last_updated?: never
          occupied_tables?: never
          restaurant_id?: string | null
          restaurant_name?: string | null
          total_tables?: never
        }
        Relationships: []
      }
    }
    Functions: {
      current_restaurant_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "waiter"
        | "kitchen"
        | "accountant"
        | "manager"
        | "super_admin"
        | "owner"
      attendance_status: "present" | "absent" | "late" | "on_leave"
      booking_status:
        | "confirmed"
        | "arrived"
        | "no_show"
        | "cancelled"
        | "pending"
      business_type: "restaurant" | "cafe" | "bar_pub" | "bakery" | "qsr"
      notification_type: "order_ready" | "bill_request" | "announcement"
      order_status:
        | "pending"
        | "cooking"
        | "ready"
        | "billed"
        | "cleared"
        | "voided"
      order_type: "dine_in" | "takeaway" | "delivery"
      table_status: "available" | "occupied" | "bill_requested"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "waiter",
        "kitchen",
        "accountant",
        "manager",
        "super_admin",
        "owner",
      ],
      attendance_status: ["present", "absent", "late", "on_leave"],
      booking_status: [
        "confirmed",
        "arrived",
        "no_show",
        "cancelled",
        "pending",
      ],
      business_type: ["restaurant", "cafe", "bar_pub", "bakery", "qsr"],
      notification_type: ["order_ready", "bill_request", "announcement"],
      order_status: [
        "pending",
        "cooking",
        "ready",
        "billed",
        "cleared",
        "voided",
      ],
      order_type: ["dine_in", "takeaway", "delivery"],
      table_status: ["available", "occupied", "bill_requested"],
    },
  },
} as const
