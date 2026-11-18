// F10: Category & Official Question Bank Management (Owner: Farin, Easy, admin only)
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminApprove, adminCreateCategory, adminDeleteCategory, adminFeature, adminGetQuiz,
  adminListCategories, adminListQuizzes, adminRevoke, adminUpdateCategory,
} from '../../api/adminContentApi';
import { getErrorMessage } from '../../api/client';

export default function AdminContent() {
  const [tab, setTab] = useState('bank');
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center">
        <h2>Content management</h2>
        <Link to="/admin">Admin dashboard →</Link>
      </div>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'bank' ? 'active' : ''}`} onClick={() => setTab('bank')}>Question bank</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>Categories</button></li>
      </ul>
      {tab === 'bank' ? <QuestionBank /> : <Categories />}
    </div>
  );
}

function Categories() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', icon: '', order: 0 });
  const [error, setError] = useState('');

  const load = useCallback(() => adminListCategories().then(setItems).catch((err) => setError(getErrorMessage(err))), []);
  useEffect(() => {
    load();
  }, [load]);

  const run = (fn) => async () => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      {error && <div className="alert alert-danger">{error}</div>}
      <form className="row g-2 mb-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await adminCreateCategory(form); setForm({ name: '', icon: '', order: 0 }); })(); }}>
        <div className="col-md-5"><input className="form-control" placeholder="New category name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="col-md-3"><input className="form-control" placeholder="Icon (emoji)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
        <div className="col-md-2"><input type="number" className="form-control" title="Order" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></div>
        <div className="col-md-2"><button className="btn btn-primary w-100">Add</button></div>
      </form>
      <table className="table align-middle">
        <thead><tr><th>Order</th><th>Icon</th><th>Name</th><th>Quizzes</th><th /></tr></thead>
        <tbody>
          {items.map((c) => (
            <tr key={c._id}>
              <td style={{ width: 90 }}><input type="number" className="form-control form-control-sm" defaultValue={c.order} onBlur={(e) => run(() => adminUpdateCategory(c._id, { order: e.target.value }))()} /></td>
              <td style={{ width: 90 }}><input className="form-control form-control-sm" defaultValue={c.icon} onBlur={(e) => run(() => adminUpdateCategory(c._id, { icon: e.target.value }))()} /></td>
              <td><input className="form-control form-control-sm" defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && run(() => adminUpdateCategory(c._id, { name: e.target.value }))()} /></td>
              <td>{c.quizCount}</td>
              <td><button className="btn btn-sm btn-outline-danger" disabled={c.quizCount > 0} onClick={run(() => adminDeleteCategory(c._id))}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small text-muted">Changes save when you leave a field. Categories that contain quizzes cannot be deleted.</p>
    </>
  );
}

function QuestionBank() {
  const [filter, setFilter] = useState('pending');
  const [q, setQ] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => adminListQuizzes(filter, q).then(setQuizzes).catch((err) => setError(getErrorMessage(err))), [filter, q]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const open = async (id) => {
    setError('');
    try {
      setReview(await adminGetQuiz(id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const run = (fn) => async () => {
    setError('');
    try {
      await fn();
      await load();
      if (review) setReview(await adminGetQuiz(review.quiz._id));
    } catch (err) {
      const extra = err?.response?.data?.errors;
      setError(`${getErrorMessage(err)}${extra ? `: ${extra.join('; ')}` : ''}`);
    }
  };

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <div className="d-flex gap-2 mb-2">
          <select className="form-select" style={{ maxWidth: 220 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">Waiting for approval</option>
            <option value="official">Official bank</option>
            <option value="featured">Featured</option>
            <option value="all">All published</option>
          </select>
          <input className="form-control" placeholder="Search title" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="list-group">
          {quizzes.length === 0 && <div className="list-group-item text-muted">Nothing here.</div>}
          {quizzes.map((x) => (
            <button key={x._id} className={`list-group-item list-group-item-action ${review && review.quiz._id === x._id ? 'active' : ''}`} onClick={() => open(x._id)}>
              <div className="d-flex justify-content-between">
                <strong>{x.title}</strong>
                <span>{x.isOfficial && '✔ official '}{x.isFeatured && '★'}</span>
              </div>
              <small>{x.category?.name} · {x.questionCount} questions · by {x.author?.username}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="col-lg-6">
        {!review ? (
          <p className="text-muted">Select a quiz to review it.</p>
        ) : (
          <div className="card">
            <div className="card-body">
              <h5>{review.quiz.title}</h5>
              <p className="small text-muted">{review.quiz.category?.name} · {review.quiz.difficulty} · by {review.quiz.author?.username}</p>
              {review.problems.length > 0 && <ul className="alert alert-warning small ps-4">{review.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
              <div className="d-flex gap-2 mb-3 flex-wrap">
                {!review.quiz.isOfficial
                  ? <button className="btn btn-success btn-sm" onClick={run(() => adminApprove(review.quiz._id))}>Approve into official bank</button>
                  : <button className="btn btn-outline-danger btn-sm" onClick={run(() => adminRevoke(review.quiz._id))}>Remove from official bank</button>}
                <button className="btn btn-outline-warning btn-sm" onClick={run(() => adminFeature(review.quiz._id, !review.quiz.isFeatured))}>{review.quiz.isFeatured ? 'Unfeature' : 'Feature'}</button>
              </div>
              <ol className="small ps-3">
                {review.quiz.questions.map((qq, i) => (
                  <li key={i} className="mb-2">
                    {qq.text}
                    <div>{qq.options.map((o, j) => <span key={j} className={j === qq.correctIndex ? 'fw-bold text-success me-2' : 'me-2'}>{String.fromCharCode(65 + j)}. {o}</span>)}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
