import React, { useState } from 'react';
import ConceptSearch from '../components/ConceptSearch/ConceptSearch';

export default function Home() {
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  return (
    <section>
      <ConceptSearch onSearch={(q) => setLastQuery(q)} />
      {lastQuery ? (
        <div style={{ marginTop: 18 }}>
          <h3>Last search:</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{lastQuery}</pre>
        </div>
      ) : null}
    </section>
  );
}
