import { useState, useEffect, useRef } from 'react';
import { X, ArrowUpRight, ShieldCheck } from 'lucide-react';
export const words = (s) =>
  (s || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const date = (s) =>
  new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
export function Badge({ value }) {
  return <span className={`badge ${value?.toLowerCase()}`}>{words(value)}</span>;
}
export function Logo() {
  return (
    <span className="logo">
      <span className="logo-symbol">
        <ShieldCheck size={23} />
      </span>
      NEXUS<span className="logo-dot">.</span>
    </span>
  );
}
export function Empty({ text = 'No records yet. New activity will appear here.' }) {
  return (
    <div className="empty">
      <ShieldCheck size={30} />
      <p>{text}</p>
    </div>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Select({ label, values, ...props }) {
  return (
    <Field label={label}>
      <select {...props}>
        {values.map((v) => (
          <option
            key={typeof v === 'string' ? v : v.value}
            value={typeof v === 'string' ? v : v.value}
          >
            {typeof v === 'string' ? words(v) : v.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prior = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.body.style.overflow = old;
      prior?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Tab') {
            const list = [
              ...ref.current.querySelectorAll(
                'a[href],button:not([disabled]),input,select,textarea',
              ),
            ];
            const first = list[0],
              last = list.at(-1);
            if (
              e.shiftKey &&
              (document.activeElement === first || document.activeElement === ref.current)
            ) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Form({
  onSubmit,
  children,
  label = 'Save changes',
  busyLabel = 'Saving...',
  className = '',
  resetOnSuccess = false,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const submitting = useRef(false);
  return (
    <form
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting.current) return;
        if (!navigator.onLine) {
          setError('You are offline. Reconnect before submitting. Nothing has been sent.');
          return;
        }
        const form = e.currentTarget;
        submitting.current = true;
        setBusy(true);
        setError('');
        try {
          const saved = await onSubmit(Object.fromEntries(new FormData(form)));
          if (saved === true && resetOnSuccess) form.reset();
        } catch (e) {
          setError(e.response?.data?.message || e.message || 'Could not save. Please retry.');
        } finally {
          submitting.current = false;
          setBusy(false);
        }
      }}
    >
      {children}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? busyLabel : label}
        <ArrowUpRight size={16} />
      </button>
    </form>
  );
}
