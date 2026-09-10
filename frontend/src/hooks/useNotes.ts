import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";

interface Note {
  id: string;
  conversation_id: string;
  org_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export function useNotes(convJid: string) {
  const [data, setData] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getNotes(convJid).then(
      (res) => {
        if (!cancelled) {
          setData(res.data || []);
          setLoading(false);
        }
      },
      (err) => {
        if (!cancelled) {
          console.error("Erro ao buscar notas:", err);
          setLoading(false);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [convJid]);

  const addNote = useCallback(async (userName: string, content: string) => {
    setLoading(true);
    try {
      const note = await api.createNote(convJid, userName, content);
      setData((prev) => [note, ...prev]);
      setLoading(false);
      return note;
    } catch (err) {
      console.error("Erro ao criar nota:", err);
      setLoading(false);
      throw err;
    }
  }, [convJid]);

  return { data, loading, addNote };
}