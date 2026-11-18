import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <h2 className="mb-4">Create account</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit}>
        <input className="form-control mb-3" placeholder="Username" required minLength={3} value={form.username} onChange={set('username')} />
        <input className="form-control mb-3" type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
        <input className="form-control mb-3" type="password" placeholder="Password (min 6 characters)" required minLength={6}
          value={form.password} onChange={set('password')} />
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Creating...' : 'Sign up'}</button>
      </form>
      <p className="mt-3 text-center">Already registered? <Link to="/login">Log in</Link></p>
    </div>
  );
}
