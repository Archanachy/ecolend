// Contact page (v2). Client-side only for now — it validates and acknowledges
// the message; wiring it to a support inbox is a follow-up.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const TOPICS = ['A booking or payment', 'My account', 'Reporting a listing or user', 'Something else'];

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', topic: TOPICS[0], message: '' });
  const [sent, setSent] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in your name, email and message.');
      return;
    }
    setSent(true);
    toast.success('Thanks — your message has been received.');
  }

  return (
    <div className="container-md">
      <div className="page-header">
        <div>
          <span className="eyebrow">Support</span>
          <h1>Contact us</h1>
          <p>Tell us what is going on and we will get back to you.</p>
        </div>
      </div>

      {sent ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden="true">✅</div>
          <h2>Message received</h2>
          <p className="muted">We aim to reply within one working day.</p>
          <div className="form-actions" style={{ justifyContent: 'center' }}>
            <Link to="/faq" className="btn btn-outline">Read the FAQ</Link>
            <Link to="/browse" className="btn">Back to browsing</Link>
          </div>
        </div>
      ) : (
        <form className="card" onSubmit={onSubmit} noValidate>
          <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--space-4)' }}>
            <div className="field" style={{ flex: '1 1 200px' }}>
              <label htmlFor="c-name">Your name</label>
              <input id="c-name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="field" style={{ flex: '1 1 200px' }}>
              <label htmlFor="c-email">Email</label>
              <input id="c-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="c-topic">What is it about?</label>
            <select id="c-topic" value={form.topic} onChange={(e) => set('topic', e.target.value)}>
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-message">Message</label>
            <textarea id="c-message" value={form.message} onChange={(e) => set('message', e.target.value)} required />
          </div>
          <div className="form-actions">
            <button type="submit">Send message</button>
            <Link to="/faq" className="btn btn-ghost">Check the FAQ first</Link>
          </div>
        </form>
      )}
    </div>
  );
}
