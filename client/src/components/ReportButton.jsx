// SHARED: "Report" button for any content. Sends a report to F18 Content Moderation (Moontaha).
// <ReportButton targetType="quiz" targetId={quiz._id} />
// <ReportButton targetType="question" targetId={quiz._id} questionIndex={2} label="Flag wrong question" />
// targetType: 'quiz' | 'question' | 'user' | 'activity'
import { useState } from 'react';
import api, { getErrorMessage } from '../api/client';

const REASONS = ['Wrong answer', 'Offensive content', 'Spam', 'Cheating', 'Other'];

export default function ReportButton({ targetType, targetId, questionIndex, label = 'Report', size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async () => {
    try {
      await api.post('/moderation/reports', { targetType, targetId, questionIndex, reason, details });
      setMsg('Report sent. Thank you!');
      setTimeout(() => { setOpen(false); setMsg(''); setDetails(''); }, 1200);
    } catch (err) {
      setMsg(getErrorMessage(err));
    }
  };

  if (!open) {
    return <button type="button" className={`btn btn-${size} btn-outline-danger`} onClick={() => setOpen(true)}>{label}</button>;
  }

  return (
    <div className="border rounded p-2 bg-light" style={{ maxWidth: 320 }}>
      <select className="form-select form-select-sm mb-2" value={reason} onChange={(e) => setReason(e.target.value)}>
        {REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <textarea className="form-control form-control-sm mb-2" rows={2} placeholder="Details (optional)"
        value={details} onChange={(e) => setDetails(e.target.value)} />
      {msg && <div className="small mb-2">{msg}</div>}
      <div className="d-flex gap-2">
        <button type="button" className="btn btn-sm btn-danger" onClick={submit}>Send</button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
