import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useVisitorTracking() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        await supabase.from("visitor_logs").insert({
          user_id: user?.id || null,
          page_path: location.pathname,
          user_agent: navigator.userAgent,
          ip_address: null, // IP is captured server-side if needed
        });
      } catch (e) {
        // Silent fail for tracking
      }
    };

    trackVisit();
  }, [location.pathname, user?.id]);
}
