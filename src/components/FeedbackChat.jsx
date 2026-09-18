import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { trainerAssignmentMap } from '../data/imdSeedData';

export default function FeedbackChat() {
  const { currentUser, profiles, feedbackMessages, setFeedbackMessages, onSendFeedbackMessage } = useApp();
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [readMap, setReadMap] = useState({});
  const threadRef = useRef(null);

  const myId = currentUser?.id;
  const isTrainer = currentUser?.role === 'Trainer';

  const contacts = isTrainer
    ? profiles.filter(p => p.role === 'Trainee' && p.approved_by_admin)
    : (() => {
        const assigned = trainerAssignmentMap[myId] || [];
        const allTrainers = profiles.filter(p => p.role === 'Trainer');
        return assigned.length > 0
          ? allTrainers.filter(t => assigned.includes(t.id))
          : allTrainers;
      })();

  useEffect(() => {
    if (!activeId && contacts.length > 0) setActiveId(contacts[0].id);
  }, [contacts.length]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    const channel = supabase
      .channel('imd-feedback-chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feedback_messages' },
        payload => {
          const row = payload.new;
          setFeedbackMessages(prev =>
            prev.some(m => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [setFeedbackMessages]);

  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [feedbackMessages.length, activeId]);

  useEffect(() => {
    if (!activeId || !myId) return;
    const theirs = feedbackMessages.filter(m => m.sender_id === activeId && m.receiver_id === myId).length;
    setReadMap(m => ({ ...m, [activeId]: theirs }));
  }, [activeId, feedbackMessages.length]);

  const activeProfile = contacts.find(c => c.id === activeId);

  const thread = activeProfile
    ? feedbackMessages.filter(m =>
        (m.sender_id === myId && m.receiver_id === activeProfile.id) ||
        (m.sender_id === activeProfile.id && m.receiver_id === myId))
    : [];

  function lastPreview(contact) {
    const pair = feedbackMessages.filter(m =>
      (m.sender_id === myId && m.receiver_id === contact.id) ||
      (m.sender_id === contact.id && m.receiver_id === myId));
    return pair.length > 0 ? pair[pair.length - 1] : null;
  }

  function unseenCount(contact) {
    if (contact.id === activeId) return 0;
    const theirs = feedbackMessages.filter(m => m.sender_id === contact.id && m.receiver_id === myId).length;
    return Math.max(0, theirs - (readMap[contact.id] || 0));
  }

  function send(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeProfile || !myId) return;
    onSendFeedbackMessage({
      sender_id: myId,
      sender_name: currentUser?.name || 'IMD Officer',
      receiver_id: activeProfile.id,
      content,
    });
    setDraft('');
  }

  return (
    <section className="fb-chat card">
      <div className="fb-chat-head">
        <span>💬 Trainee–Trainer Feedback Support</span>
        <span className="fb-chat-sub">
          {isTrainer ? 'Reply individually to each trainee under your wing.' : 'Private feedback thread with your assigned trainer.'}
        </span>
      </div>

      <div className="fb-chat-body">
        <div className="fb-roster">
          <div className="fb-roster-title">{isTrainer ? 'Trainees' : 'Trainers'}</div>
          {contacts.length === 0 && (
            <div className="fb-roster-empty">
              {isTrainer
                ? 'No approved trainees yet — they appear here once admin-approved.'
                : 'No trainer assigned yet.'}
            </div>
          )}
          {contacts.map(c => {
            const last = lastPreview(c);
            const unseen = unseenCount(c);
            return (
              <button
                key={c.id}
                className={`fb-contact ${c.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(c.id)}
              >
                <span className="fb-avatar">
                  {c.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </span>
                <span className="fb-contact-info">
                  <span className="fb-contact-name">
                    {c.name}
                    {unseen > 0 && <span className="fb-unread">{unseen}</span>}
                  </span>
                  <span className="fb-contact-preview">
                    {last && last.sender_id !== myId ? `${last.sender_name.split(' ').pop()}: ` : ''}
                    {last ? last.content : 'No messages yet — start the conversation.'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="fb-thread">
          {activeProfile ? (
            <>
              <div className="fb-thread-head">
                <span className="fb-avatar">{activeProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</span>
                <span className="fb-thread-meta">
                  <span className="fb-thread-name">{activeProfile.name}</span>
                  <span className="fb-thread-sub">{activeProfile.designation} · {activeProfile.station_location}</span>
                </span>
              </div>
              <div className="fb-thread-log" ref={threadRef}>
                {thread.length === 0 && (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <p>No messages yet in this thread. Send the first note.</p>
                  </div>
                )}
                {thread.map(msg => {
                  const mine = msg.sender_id === myId;
                  return (
                    <div key={msg.id} className={`fb-msg ${mine ? 'mine' : 'theirs'}`}>
                      <div className="fb-bubble">
                        <div className="fb-msg-text">{msg.content}</div>
                        <div className="fb-msg-time">{msg.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form className="fb-form" onSubmit={send}>
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder={`Message ${activeProfile.name.split(' ').pop()}…`}
                  maxLength={500}
                />
                <button type="submit" disabled={!draft.trim()}>Send ➤</button>
              </form>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>Select a contact to open the feedback thread.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}