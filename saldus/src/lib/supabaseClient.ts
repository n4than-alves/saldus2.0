import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// URL e chave pública (anon) do Supabase
const supabaseUrl = "https://iztkqabewhgvsjqwenpl.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dGtxYWJld2hndnNqcXdlbnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NDkzMDEsImV4cCI6MjA2MjMyNTMwMX0.ggBRU3pHwywE1huBwAFIT_DuSymcmj0h8g6UMPCg1EM";

// Cria o cliente Supabase com configuração persistente de autenticação
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Função auxiliar para limpar o estado de autenticação manualmente
export const cleanupAuthState = () => {
  // Limpa o localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
      localStorage.removeItem(key);
    }
  });

  // Limpa o sessionStorage (caso esteja em uso)
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
      sessionStorage.removeItem(key);
    }
  });
};
