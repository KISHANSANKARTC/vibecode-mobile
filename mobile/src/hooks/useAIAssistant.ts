import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type AIMode = 'general' | 'brief' | 'compare';

/**
 * useAIAssistant
 *
 * Calls the `ai-assistant` edge function (verify_jwt=true). Supports three
 * modes that match the web:
 *   - general: free-form chat
 *   - brief:   help draft a job brief (objective, duration, deliverables)
 *   - compare: compare a list of talents
 *
 * The edge function returns a non-streaming JSON response in mobile mode
 * (web uses SSE, but RN's fetch streaming is unreliable across versions —
 * we accept higher latency in exchange for portability).
 *
 * Web parity: lovable-web/src/hooks/useAIAssistant.ts.
 */
export function useAIAssistant() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string, mode: AIMode = 'general', context?: Record<string, unknown>) => {
      const userMsg: AIMessage = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: invokeErr } = await supabase.functions.invoke('ai-assistant', {
          body: {
            mode,
            messages: [...messages, userMsg],
            context: context || {},
          },
        });

        if (invokeErr) throw new Error(invokeErr.message || 'AI request failed');

        const reply: string =
          (data as any)?.reply ||
          (data as any)?.message?.content ||
          (data as any)?.content ||
          '';

        if (!reply) throw new Error('Empty response from assistant');

        const assistantMsg: AIMessage = { role: 'assistant', content: reply };
        setMessages((prev) => [...prev, assistantMsg]);
        return { ok: true, reply };
      } catch (err) {
        const msg = extractErrorMessage(err);
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, send, reset };
}
