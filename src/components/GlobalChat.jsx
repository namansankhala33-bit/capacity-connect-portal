import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export default function GlobalChat() {
  const { currentUser, globalChatMessages, setGlobalChatMessages, onTransmitPeerMessage } = useApp();
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [draft, setDraft] = useState('');
  const viewportRef = useRef(null);

  const ownId = currentUser?.id;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    const channel = supabase
      .channel('imd-global-chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'global_chat_messages' },
        payload => {
          const row = payload.new;
          setGlobalChatMessages(prev =>
            prev.some(m => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [setGlobalChatMessages]);

  useEffect(() => {
    const node = viewportRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [globalChatMessages.length]);

  function transmit(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onTransmitPeerMessage({
      sender_id: ownId || 'imd-trainee',
      display_name: currentUser?.name || 'IMD Trainee',
      content,
      is_anonymous: isAnonymous,
    });
    setDraft('');
  }

  return (
    <section className="global-chat">
      <div className="global-chat-banner">
        <div className="global-chat-banner-title">📡 Peer-to-Peer Global Operational Channel</div>
        <div className="global-chat-banner-sub">Secure information sharing node for active IMD trainees.</div>
      </div>

      <div className="global-chat-toolbar">
        <label className="anonymous-switch">
          <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
          <span className="anonymous-track"><span className="anonymous-knob" /></span>
          <span className="anonymous-label">🔒 Mask Identity (Anonymous Mode)</span>
        </label>
        <span className={isAnonymous ? 'anonymous-state on' : 'anonymous-state'}>
          {isAnonymous ? 'Identity Masked' : 'Identity Visible'}
        </span>
      </div>

      <div className="global-chat-viewport" ref={viewportRef}>
        {globalChatMessages.map(msg => {
          const isMine = msg.sender_id && msg.sender_id === ownId;
          const anonymous = msg.is_anonymous === true;
          const identity = anonymous
            ? { name: '🎭 Anonymous Meteorologist', meta: 'identity scrubbed' }
            : { name: msg.display_name, meta: `${msg.sender_id || ''}${msg.sender_id && msg.sender_id.startsWith('prof') ? ' · ' + msg.sender_id : ''}` };
          return (
            <div key={msg.id} className={`global-chat-row ${isMine ? 'mine' : 'theirs'}`}>
              <div className={`global-chat-bubble ${anonymous ? 'anon' : ''}`}>
                <div className="global-chat-sender">
                  <span className={anonymous ? 'global-chat-name anon' : 'global-chat-name'}>{identity.name}</span>
                  <span className="global-chat-time">{msg.timestamp}</span>
                </div>
                <div className="global-chat-text">{msg.content}</div>
                {!anonymous && identity.meta && <div className="global-chat-meta">{identity.meta}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <form className="global-chat-input-bar" onSubmit={transmit}>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={isAnonymous ? 'Transmit as 🎭 Anonymous Meteorologist…' : 'Type an operational note for the channel…'}
          maxLength={500}
        />
        <button type="submit" disabled={!draft.trim()}>Transmit</button>
      </form>
    </section>
  );
}