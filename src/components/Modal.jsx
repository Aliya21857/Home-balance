import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, fields, initial = {}, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const fn = e => e.key === 'Escape' && onClose(); addEventListener('keydown', fn); return () => removeEventListener('keydown', fn); }, [onClose]);
  const submit = async e => { e.preventDefault(); setSaving(true); setError(''); try { await onSave(form); onClose(); } catch (err) { setError('Не удалось сохранить. ' + err.message); setSaving(false); } };
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <form className="modal" onSubmit={submit}>
      <div className="modal-head"><h2>{title}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть"><X /></button></div>
      <div className="form-grid">{fields.map(f => <label key={f.name} className={f.wide ? 'wide' : ''}><span>{f.label}</span>{f.type === 'textarea' ? <textarea value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })} required={f.required} /> : f.type === 'select' ? <select value={form[f.name] || f.options[0]} onChange={e => setForm({ ...form, [f.name]: e.target.value })}>{f.options.map(x => <option key={x}>{x}</option>)}</select> : <input type={f.type || 'text'} value={form[f.name] ?? ''} onChange={e => setForm({ ...form, [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value })} required={f.required} />}</label>)}</div>
      {error && <p className="error">{error}</p>}
      <div className="modal-actions"><button type="button" className="btn ghost" onClick={onClose}>Отмена</button><button className="btn" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></div>
    </form>
  </div>;
}
