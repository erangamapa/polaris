import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export default function CasinoConcierge() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const controller = useRef(null);
  const log = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages, busy]);

  async function send(question) {
    const text = question.trim();
    if (!text || busy) return;
    setInput(''); setBusy(true);
    setMessages(previous => [...previous.slice(-18), { role: 'user', text }]);
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    try {
      const response = await fetch('/api/concierge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: text }), signal: request.signal });
      const data = await response.json();
      setMessages(previous => [...previous, { role: 'assistant', text: response.ok ? data.message : data.error, games: response.ok ? data.games : [] }]);
    } catch {
      if (controller.current === request) setMessages(previous => [...previous, { role: 'assistant', text: 'Game finder is unavailable. Please use catalogue search or the Help guide.' }]);
    } finally { clearTimeout(timeout); setBusy(false); }
  }

  return <>
    <Button onClick={() => setOpen(true)} aria-label="Open Tribet AI game finder" className="fixed bottom-24 right-4 z-40 gap-2 rounded-full shadow-lg sm:bottom-6 sm:right-6"><MessageCircle className="size-5" />Ask Tribet <span className="text-xs">AI</span></Button>
    <Modal open={open} onOpenChange={setOpen}>
      <ModalContent size="sm" className="top-4 h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] p-5 sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 sm:h-[580px] sm:max-h-[85dvh] sm:w-[380px]">
        <ModalHeader><ModalTitle>Ask Tribet <span className="text-sm text-muted-foreground">AI</span></ModalTitle><ModalDescription>Find games by name or category. Not human support.</ModalDescription></ModalHeader>
        <div ref={log} role="log" aria-live="polite" aria-label="Game finder conversation" className="min-h-0 flex-1 space-y-4 overflow-y-auto text-sm">
          <p>What would you like to explore? This early version searches game titles and categories.</p>
          {messages.map((message, index) => <div key={index} className="rounded-lg bg-background p-3"><p className="mb-1 text-xs text-muted-foreground">{message.role === 'user' ? 'You' : 'Tribet AI'}</p><p>{message.text}</p>
            {message.games?.map(game => <a key={game.id} href={game.href} className="mt-3 flex items-center gap-3 rounded-lg border p-2 hover:bg-secondary">{game.image && <img src={game.image} alt="" className="h-12 w-10 rounded object-cover" />}<span>{game.title}<span className="block text-xs text-muted-foreground">View game →</span></span></a>)}
          </div>)}
          {busy && <p role="status">Finding matches…</p>}
        </div>
        <div className="flex flex-wrap gap-2">{['Find roulette games', 'Show scratch games', 'Find slots'].map(prompt => <button key={prompt} disabled={busy} onClick={() => send(prompt)} className="rounded-full border px-3 py-2 text-xs disabled:opacity-50">{prompt}</button>)}</div>
        <form className="flex gap-2" onSubmit={event => { event.preventDefault(); send(input); }}>
          <input aria-label="Your game search" maxLength={500} value={input} onChange={event => setInput(event.target.value)} placeholder="Find a game…" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
          <Button type="submit" disabled={busy || !input.trim()} aria-label="Send message"><Send className="size-4" /></Button>
        </form>
        <p className="text-xs text-muted-foreground">Don’t share personal details or wallet secrets. Each search is independent. <a href="/help.html" className="underline">Help guide</a></p>
      </ModalContent>
    </Modal>
  </>;
}
