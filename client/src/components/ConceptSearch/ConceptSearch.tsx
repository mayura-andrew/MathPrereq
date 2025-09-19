import React, { useState } from 'react';
import useConceptQuery from '../../hooks/useConceptQuery';

export default function ConceptSearch({ onSearch }: { onSearch?: (q: string) => void }) {
  const [input, setInput] = useState('');
  const { data, loading, error, run } = useConceptQuery();

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSearch?.(input);
    run(input.trim());
  };

  return (
    <div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input
          aria-label="concept"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search concept (e.g. derivatives)"
          style={{ flex: 1, padding: '8px 10px' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        {error && <div style={{ color: 'crimson' }}>Error: {error.message}</div>}
        {data && (
          <div>
            <h4>Result (summary)</h4>
            <div style={{ whiteSpace: 'pre-wrap' }}>{data.explanation ?? JSON.stringify(data, null, 2)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
