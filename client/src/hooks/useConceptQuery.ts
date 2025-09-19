import { useState, useCallback } from 'react';
import type { ConceptQueryResponse } from '../types/api';

const DEFAULT_BASE = 'http://localhost:8080/api/v1';

export default function useConceptQuery() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConceptQueryResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const base = (import.meta.env.VITE_API_BASE_URL as string) || DEFAULT_BASE;

  const run = useCallback(async (conceptName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/concept-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_name: conceptName }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        const err = new Error(json.error ?? `HTTP ${res.status}`);
        setError(err);
        setData(null);
      } else {
        setData(json as ConceptQueryResponse);
      }
    } catch (err: any) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [base]);

  return { loading, data, error, run };
}
