import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  orgName: z.string().optional(),
});

export const quickReplySchema = z.object({
  shortcut: z.string().min(1, "Atalho é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
});

export const tagColorSchema = z.object({
  tag: z.string().min(1, "Tag é obrigatória"),
  color: z.string().min(1, "Cor é obrigatória"),
});

export const noteSchema = z.object({
  content: z.string().min(1, "Nota é obrigatória"),
});

export const searchSchema = z.object({
  query: z.string().min(2, "Mínimo 2 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type QuickReplyFormData = z.infer<typeof quickReplySchema>;
export type TagColorFormData = z.infer<typeof tagColorSchema>;
export type NoteFormData = z.infer<typeof noteSchema>;
export type SearchFormData = z.infer<typeof searchSchema>;
