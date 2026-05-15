import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface DeliverableItem {
  id: string;
  booking_id: string;
  name: string;
  description?: string;
  quantity: number;
  status: string;
  due_at?: string;
  created_at: string;
  updated_at: string;
}

export function useDeliverables(bookingId: string) {
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all deliverables for this booking
  const fetchDeliverables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('deliverable_items')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (err) throw err;
      setDeliverables(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch deliverables';
      setError(message);
      console.error('Error fetching deliverables:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Update deliverable status
  const updateDeliverableStatus = useCallback(
    async (id: string, status: string) => {
      try {
        setError(null);
        const { error: err } = await supabase
          .from('deliverable_items')
          .update({ status })
          .eq('id', id);

        if (err) throw err;

        setDeliverables((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status } : d))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update deliverable';
        setError(message);
        console.error('Error updating deliverable:', err);
      }
    },
    []
  );

  return {
    deliverables,
    loading,
    error,
    fetchDeliverables,
    updateDeliverableStatus,
  };
}
