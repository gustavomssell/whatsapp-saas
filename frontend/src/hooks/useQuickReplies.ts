import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";

interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  media_url: string;
  media_type: string;
  variables: string[];
  is_global: boolean;
  created_at: string;
}

export function useQuickReplies() {
  const [data, setData] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getQuickReplies().then(
      (res) => {
        if (!cancelled) {
          setData(Array.isArray(res) ? res : (res as any).data || []);
          setLoading(false);
        }
      },
      (err) => {
        if (!cancelled) {
          console.error("Erro ao buscar quick replies:", err);
          setLoading(false);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    return api.getQuickReplies().then(
      (res) => {
        setData(Array.isArray(res) ? res : (res as any).data || []);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao refetch quick replies:", err);
        setLoading(false);
      }
    );
  }, []);

  return { data, loading, refetch };
}
