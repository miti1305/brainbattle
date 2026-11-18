// F8: Quiz Authoring & Publishing Workflow (Owner: Farin, Medium)
// /my-quizzes            -> my quizzes + browse published quizzes
// /my-quizzes/new        -> create
// /my-quizzes/:id/edit   -> editor (questions, CSV import, publish)
// /my-quizzes/view/:id   -> public view (report a wrong question, practise)
import { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  browseQuizzes, createQuiz, deleteQuiz, getMyQuizzes, getQuiz, importCsv, publishQuiz, unpublishQuiz, updateQuiz,
} from '../../api/quizApi';
import { getCategories } from '../../api/categoryApi'; // shared (Abrar)
import { getErrorMessage } from '../../api/client';
import ReportButton from '../../components/ReportButton';

export default function QuizAuthoring() {
  return (
    <Routes>
      <Route index element={<QuizHome />} />
      <Route path="new" element={<QuizEditor />} />
      <Route path=":id/edit" element={<QuizEditor />} />
      <Route path="view/:id" element={<QuizView />} />
    </Routes>
  );
}

function QuizHome() {
  const [tab, setTab] = useState('mine');
  const [mine, setMine] = useState([]);
  const [published, setPublished] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ q: '', category: '', difficulty: '' });

  useEffect(() => {
    getMyQuizzes().then(setMine).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
  }, []);
  useEffect(() => {
    if (tab !== 'browse') return undefined;
    const t = setTimeout(() => browseQuizzes(filters).then(setPublished).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [tab, filters]);

  const remove = async (id) => {
    if (!window.confirm('Delete this quiz?')) return;
    await deleteQuiz(id);
    setMine((list) => list.filter((q) => q._id !== id));
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Quizzes</h2>
        <Link className="btn btn-primary" to="/my-quizzes/new">Create quiz</Link>
      </div>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My quizzes</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Browse</button></li>
      </ul>

      {tab === 'mine' && (
        <table className="table align-middle">
          <thead><tr><th>Title</th><th>Category</th><th>Questions</th><th>Status</th><th /></tr></thead>
          <tbody>
            {mine.length === 0 && <tr><td colSpan={5} className="text-muted">You have not created any quizzes yet.</td></tr>}
            {mine.map((q) => (
              <tr key={q._id}>
                <td>{q.title}</td>
                <td>{q.category?.name}</td>
                <td>{q.questionCount}</td>
                <td>
                  <span className={`badge bg-${q.status === 'published' ? 'success' : 'secondary'}`}>{q.status}</span>
                  {q.isOfficial && <span className="badge bg-primary ms-1">official</span>}
                </td>
                <td className="text-end">
                  <Link className="btn btn-sm btn-outline-primary me-1" to={`/my-quizzes/${q._id}/edit`}>Edit</Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => remove(q._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'browse' && (
        <>
          <div className="row g-2 mb-3">
            <div className="col-md-6"><input className="form-control" placeholder="Search by title" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></div>
            <div className="col-md-3">
              <select className="form-select" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}>
                <option value="">Any difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div className="list-group">
            {published.map((q) => (
              <Link key={q._id} to={`/my-quizzes/view/${q._id}`} className="list-group-item list-group-item-action">
                <div className="d-flex justify-content-between">
                  <strong>{q.title}</strong>
                  <span>
                    {q.isFeatured && <span className="badge bg-warning text-dark me-1">featured</span>}
                    {q.isOfficial && <span className="badge bg-primary me-1">official</span>}
                    <span className="badge bg-light text-dark">{q.difficulty}</span>
                  </span>
                </div>
                <small className="text-muted">{q.category?.name} · {q.questionCount} questions · by {q.author?.username} · played {q.playCount}×</small>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const emptyQuestion = () => ({ text: '', type: 'mcq', options: ['', '', '', ''], correctIndex: 0, explanation: '', imageUrl: '' });
const CSV_TEMPLATE = 'text,type,optionA,optionB,optionC,optionD,correct,explanation,imageUrl\n"What is 2 + 2?",mcq,3,4,5,6,B,"2 + 2 = 4",\n"The sun is a star",truefalse,,,,,True,,\n';

function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [quiz, setQuiz] = useState({ title: '', description: '', category: '', difficulty: 'medium', status: 'draft', questions: [] });
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState(null);
  const [csvMode, setCsvMode] = useState('append');

  const load = useCallback(async () => {
    if (!id) return;
    const { quiz: q } = await getQuiz(id);
    setQuiz({ ...q, category: q.category?._id || q.category });
  }, [id]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    load().catch((err) => setMessage({ type: 'danger', text: getErrorMessage(err) }));
  }, [load]);

  const showError = (err) => {
    setErrors(err?.response?.data?.errors || []);
    setMessage({ type: 'danger', text: getErrorMessage(err) });
  };

  const setQ = (i, patch) => setQuiz((q) => ({ ...q, questions: q.questions.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const save = async () => {
    setErrors([]);
    try {
      const body = { title: quiz.title, description: quiz.description, category: quiz.category, difficulty: quiz.difficulty, questions: quiz.questions };
      if (id) {
        await updateQuiz(id, body);
        setMessage({ type: 'success', text: 'Saved' });
      } else {
        const created = await createQuiz(body);
        navigate(`/my-quizzes/${created._id}/edit`, { replace: true });
      }
    } catch (err) {
      showError(err);
    }
  };

  const publish = async () => {
    setErrors([]);
    try {
      await save();
      const q = await publishQuiz(id);
      setQuiz((old) => ({ ...old, status: q.status }));
      setMessage({ type: 'success', text: 'Published! Players can now find this quiz.' });
    } catch (err) {
      showError(err);
    }
  };

  const unpublish = async () => {
    const q = await unpublishQuiz(id);
    setQuiz((old) => ({ ...old, status: q.status, isOfficial: q.isOfficial }));
    setMessage({ type: 'info', text: 'Moved back to draft' });
  };

  const onCsv = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setErrors([]);
      try {
        const res = await importCsv(id, reader.result, csvMode);
        setMessage({ type: 'success', text: `Imported ${res.imported} question(s)` });
        await load();
      } catch (err) {
        const rows = err?.response?.data?.errors || [];
        setErrors(rows.map((r) => (typeof r === 'string' ? r : `Row ${r.row}: ${r.message}`)));
        setMessage({ type: 'danger', text: getErrorMessage(err) });
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <Link to="/my-quizzes">← My quizzes</Link>
      <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
        <h2 className="mb-0">{id ? 'Edit quiz' : 'New quiz'} {id && <span className={`badge bg-${quiz.status === 'published' ? 'success' : 'secondary'} fs-6`}>{quiz.status}</span>}</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={save}>Save {id ? '' : 'draft'}</button>
          {id && quiz.status !== 'published' && <button className="btn btn-success" onClick={publish}>Publish</button>}
          {id && quiz.status === 'published' && <button className="btn btn-outline-secondary" onClick={unpublish}>Unpublish</button>}
        </div>
      </div>
      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {errors.length > 0 && <ul className="alert alert-warning ps-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}

      <div className="card card-body mb-3">
        <div className="row g-2">
          <div className="col-md-6"><input className="form-control" placeholder="Title" value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} /></div>
          <div className="col-md-3">
            <select className="form-select" value={quiz.category} onChange={(e) => setQuiz({ ...quiz, category: e.target.value })}>
              <option value="">Category...</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select" value={quiz.difficulty} onChange={(e) => setQuiz({ ...quiz, difficulty: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="col-12"><textarea className="form-control" placeholder="Description" value={quiz.description} onChange={(e) => setQuiz({ ...quiz, description: e.target.value })} /></div>
        </div>
      </div>

      {id && (
        <div className="card card-body mb-3">
          <h6>Import questions from CSV</h6>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <input type="file" accept=".csv,text/csv" className="form-control" style={{ maxWidth: 320 }} onChange={onCsv} />
            <select className="form-select" style={{ maxWidth: 200 }} value={csvMode} onChange={(e) => setCsvMode(e.target.value)}>
              <option value="append">Add to existing</option>
              <option value="replace">Replace all questions</option>
            </select>
            <a className="small" download="brainbattle-questions-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}>Download template</a>
          </div>
        </div>
      )}

      {quiz.questions.map((q, i) => (
        <div key={i} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <strong>Question {i + 1}</strong>
              <button className="btn btn-sm btn-link text-danger" onClick={() => setQuiz({ ...quiz, questions: quiz.questions.filter((_, j) => j !== i) })}>Remove</button>
            </div>
            <div className="row g-2">
              <div className="col-md-9"><input className="form-control" placeholder="Question text" value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} /></div>
              <div className="col-md-3">
                <select className="form-select" value={q.type} onChange={(e) => setQ(i, e.target.value === 'truefalse' ? { type: 'truefalse', options: ['True', 'False'], correctIndex: 0 } : { type: e.target.value, options: q.options.length < 2 ? ['', ''] : q.options })}>
                  <option value="mcq">Multiple choice</option>
                  <option value="truefalse">True / False</option>
                  <option value="image">Image question</option>
                </select>
              </div>
              {q.type === 'image' && <div className="col-12"><input className="form-control" placeholder="Image URL (https://...)" value={q.imageUrl} onChange={(e) => setQ(i, { imageUrl: e.target.value })} /></div>}
              {q.options.map((opt, j) => (
                <div key={j} className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">
                      <input type="radio" className="form-check-input mt-0" name={`correct-${i}`} checked={q.correctIndex === j} onChange={() => setQ(i, { correctIndex: j })} title="Correct answer" />
                    </span>
                    <input className="form-control" placeholder={`Option ${String.fromCharCode(65 + j)}`} value={opt} readOnly={q.type === 'truefalse'}
                      onChange={(e) => setQ(i, { options: q.options.map((o, k) => (k === j ? e.target.value : o)) })} />
                    {q.type !== 'truefalse' && q.options.length > 2 && (
                      <button className="btn btn-outline-secondary" onClick={() => setQ(i, { options: q.options.filter((_, k) => k !== j), correctIndex: q.correctIndex >= j && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex })}>×</button>
                    )}
                  </div>
                </div>
              ))}
              {q.type !== 'truefalse' && q.options.length < 6 && (
                <div className="col-12"><button className="btn btn-sm btn-link" onClick={() => setQ(i, { options: [...q.options, ''] })}>+ Add option</button></div>
              )}
              <div className="col-12"><input className="form-control" placeholder="Explanation shown after answering (optional)" value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} /></div>
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline-success" onClick={() => setQuiz({ ...quiz, questions: [...quiz.questions, emptyQuestion()] })}>+ Add question</button>
    </div>
  );
}

function QuizView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getQuiz(id).then(setData).catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  if (error) return <div className="container py-4"><div className="alert alert-danger">{error}</div></div>;
  if (!data) return <div className="container py-5 text-center">Loading...</div>;
  const { quiz, canEdit } = data;

  return (
    <div className="container py-4" style={{ maxWidth: 800 }}>
      <Link to="/my-quizzes">← Quizzes</Link>
      <div className="d-flex justify-content-between align-items-start mt-2">
        <div>
          <h2 className="mb-0">{quiz.title}</h2>
          <p className="text-muted">{quiz.category?.name} · {quiz.difficulty} · by {quiz.author?.username}</p>
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-success" to={`/practice?quiz=${quiz._id}`}>Practise this quiz</Link>
          {canEdit && <Link className="btn btn-outline-primary" to={`/my-quizzes/${quiz._id}/edit`}>Edit</Link>}
          <ReportButton targetType="quiz" targetId={quiz._id} />
        </div>
      </div>
      {quiz.description && <p>{quiz.description}</p>}
      {quiz.questions.map((q, i) => (
        <div key={i} className="card mb-2">
          <div className="card-body py-2 d-flex justify-content-between align-items-start gap-2">
            <div>
              <strong>Q{i + 1}.</strong> {q.text}
              <div className="small text-muted">{q.options.join(' · ')}</div>
            </div>
            <ReportButton targetType="question" targetId={quiz._id} questionIndex={i} label="Flag" />
          </div>
        </div>
      ))}
    </div>
  );
}
