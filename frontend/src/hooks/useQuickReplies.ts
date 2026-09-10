import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";

interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  variables: string[];
  is_global: boolean;
  created_at: string;
}

export function useQuickReplies(convJid?: string) {
  const [data, setData] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getQuickReplies(convJid).then(
      (res) => {
        if (!cancelled) {
          setData(res.data || []);
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
  }, [convJid]);

  const refetch = useCallback(() => {
    setLoading(true);
    return api.getQuickReplies(convJid).then(
      (res) => {
        setData(res.data || []);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao refetch quick replies:", err);
        setLoading(false);
      }
    );
  }, [convJid]);

  return { data, loading, refetch };
}