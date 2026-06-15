'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Concierge IA du site hébergé (SSR, 2.13) — bulle de chat flottante. Miroir du concierge de la
 * page publique SPA : RAG côté serveur (POST /concierge), org résolue par la clé booking engine du
 * site. Affiché seulement si l'org a activé l'IA conversationnelle (GET /concierge/status). Hérite
 * des variables CSS de thème (--accent, --card…) du wrapper de site (buildThemeVars).
 */

const WIDGET_BASE = process.env.NEXT_PUBLIC_WIDGET_BASE_URL ?? 'https://app.clenzy.fr';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const ICON_CHAT = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const ICON_CLOSE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ICON_SEND = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export default function SiteConcierge({ apiKey }: { apiKey: string }) {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${WIDGET_BASE}/api/public/booking/widget/concierge/status`, { headers: { 'X-Booking-Key': apiKey } })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((d) => {
        if (alive) setAvailable(Boolean(d?.available));
      })
      .catch(() => {
        /* concierge indisponible : on n'affiche rien */
      });
    return () => {
      alive = false;
    };
  }, [apiKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${WIDGET_BASE}/api/public/booking/widget/concierge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Booking-Key': apiKey },
        body: JSON.stringify({ question, history }),
      });
      const data = res.ok ? await res.json() : null;
      const answer = data?.answer || "Désolé, je n'ai pas pu répondre. Réessayez ou contactez l'hôte.";
      setMessages((m) => [...m, { role: 'assistant', content: answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Désolé, une erreur est survenue. Réessayez plus tard.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!available) return null;

  if (!open) {
    return (
      <button type="button" className="bkly-concierge__bubble" aria-label="Ouvrir le concierge" onClick={() => setOpen(true)}>
        {ICON_CHAT}
      </button>
    );
  }

  return (
    <div className="bkly-concierge" role="dialog" aria-label="Concierge">
      <div className="bkly-concierge__head">
        {ICON_CHAT}
        <span className="bkly-concierge__title">Concierge</span>
        <button type="button" className="bkly-concierge__close" aria-label="Fermer" onClick={() => setOpen(false)}>
          {ICON_CLOSE}
        </button>
      </div>

      <div className="bkly-concierge__body" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="bkly-concierge__empty">
            Bonjour ! Une question sur les logements, l&apos;arrivée, les équipements ? Je suis là pour vous aider.
          </div>
        ) : null}
        {messages.map((m, i) => (
          <div key={i} className={`bkly-concierge__msg bkly-concierge__msg--${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading ? <div className="bkly-concierge__msg bkly-concierge__msg--assistant bkly-concierge__typing">…</div> : null}
      </div>

      <div className="bkly-concierge__input-row">
        <input
          className="bkly-concierge__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          placeholder="Posez votre question…"
          aria-label="Votre question"
        />
        <button type="button" className="bkly-concierge__send" onClick={send} disabled={loading || !input.trim()} aria-label="Envoyer">
          {ICON_SEND}
        </button>
      </div>
    </div>
  );
}
