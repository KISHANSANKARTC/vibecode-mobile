import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseAISupportChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isEscalated: boolean;
  sendMessage: (content: string) => Promise<void>;
  escalateToHuman: () => Promise<void>;
  clearMessages: () => void;
}

export const useAISupportChat = (): UseAISupportChatReturn => {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user?.id || !content.trim()) return;

      if (isEscalated) {
        // Human mode
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
          await supabase.from('support_messages').insert({
            user_id: user.id,
            user_email: user.email || null,
            user_name: null,
            message: content,
            status: 'pending',
            is_ai_response: false,
            escalated_to_human: true,
          });

          const confirmMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              'Your message has been sent to our support team. We\'ll get back to you as soon as possible.',
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, confirmMessage]);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
          console.error('Error sending message to support:', errorMsg);
        } finally {
          setIsLoading(false);
        }
      } else {
        // AI mode
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        const assistantMessageId = crypto.randomUUID();
        let assistantContent = '';

        try {
          abortControllerRef.current = new AbortController();

          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

          const conversationHistory = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));
          conversationHistory.push({ role: 'user', content });

          const response = await fetch(
            `${supabaseUrl}/functions/v1/ai-support`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${anonKey}`,
              },
              body: JSON.stringify({ messages: conversationHistory }),
              signal: abortControllerRef.current.signal,
            }
          );

          if (!response.ok) {
            throw new Error('Failed to get response from AI');
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') break;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  assistantContent += content;

                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (
                      lastMsg &&
                      lastMsg.id === assistantMessageId &&
                      lastMsg.role === 'assistant'
                    ) {
                      lastMsg.content = assistantContent;
                    } else {
                      updated.push({
                        id: assistantMessageId,
                        role: 'assistant',
                        content: assistantContent,
                        timestamp: new Date(),
                      });
                    }
                    return updated;
                  });
                } catch (e) {
                  // Not JSON, ignore
                }
              }
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Request aborted');
          } else {
            const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
            console.error('Error in AI support:', errorMsg);
            const errorMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content:
                "I'm having trouble responding right now. Please click 'Talk to Human' to connect with our support team.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
          }
        } finally {
          setIsLoading(false);
        }
      }
    },
    [user?.id, messages, isEscalated]
  );

  const escalateToHuman = useCallback(async () => {
    if (!user?.id) return;

    setIsEscalated(true);
    setIsLoading(true);

    try {
      const conversationSummary = messages
        .map(
          (m) =>
            `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`
        )
        .join('\n\n');

      await supabase.from('support_messages').insert({
        user_id: user.id,
        user_email: user.email || null,
        user_name: null,
        message: `[AI Conversation History]\n\n${conversationSummary}\n\n---\n[User escalated to human support]`,
        status: 'pending',
        is_ai_response: false,
        escalated_to_human: true,
      });

      const escalationMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          "You're now connected to our human support team. Please describe your issue and we'll respond as soon as possible. Our team typically responds within a few hours during business hours.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, escalationMessage]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('Error escalating to human:', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, messages]);

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      abortControllerRef.current = null;
    }
    setMessages([]);
    setIsEscalated(false);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    isEscalated,
    sendMessage,
    escalateToHuman,
    clearMessages,
  };
};
