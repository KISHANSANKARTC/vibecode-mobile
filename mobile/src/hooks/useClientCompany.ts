import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ClientCompany {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  country: string;
  currency: string;
  account_type: 'individual' | 'organization';
  vat_number?: string;
  billing_address?: string;
  logo_url?: string;
  is_verified: boolean;
}

export function useClientCompany(userId: string | undefined) {
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchCompany = async () => {
      try {
        const { data, error: err } = await supabase
          .from('client_companies')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (err) throw err;
        setCompany(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch company'));
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [userId]);

  const updateCompany = async (updates: Partial<ClientCompany>) => {
    if (!userId) throw new Error('No user ID');
    try {
      const { data, error: err } = await supabase
        .from('client_companies')
        .upsert({ user_id: userId, ...updates })
        .select()
        .single();

      if (err) throw err;
      setCompany(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update company'));
      throw err;
    }
  };

  return { company, loading, error, updateCompany };
}
