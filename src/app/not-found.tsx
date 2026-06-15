export default function NotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
      <h1 style={{ fontSize: 28, color: 'var(--ink)', margin: 0 }}>Page introuvable</h1>
      <p style={{ margin: 0 }}>Cette page n’existe pas ou n’est pas encore publiée.</p>
    </div>
  );
}
