// F1: Real-Time Multiplayer Quiz Battle (Owner: Abrar, Hard)
// /battle            -> my active matches + how to start one
// /battle/:matchId   -> live battle screen
import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { getActiveMatches } from '../../api/battleApi';
import { getSocket } from '../../socket/socket';
import { useAuth } from '../../context/AuthContext';
import QuestionCard from '../../components/QuestionCard';
import Timer from '../../components/Timer';
import Scoreboard from '../../components/Battle/Scoreboard';

export default function Battle() {
  return (
    <Routes>
      <Route index element={<BattleHome />} />
      <Route path=":matchId" element={<BattlePlay />} />
    </Routes>
  );
}

function BattleHome() {
  const [matches, setMatches] = useState([]);
  useEffect(() => {
    getActiveMatches().then(setMatches).catch(() => {});
  }, []);

  return (
    <div className="container py-4">
      <h2>Quiz Battle</h2>
      <p className="text-muted">Answer the same questions as your opponents in real time. Faster correct answers earn bonus points.</p>
      <div className="d-flex gap-2 mb-4">
        <Link className="btn btn-primary" to="/ranked">Find a ranked opponent</Link>
        <Link className="btn btn-outline-primary" to="/rooms">Play with friends (private room)</Link>
      </div>
      <h5>Your active matches</h5>
      {matches.length === 0 ? (
        <p className="text-muted">No active matches.</p>
      ) : (
        <ul className="list-group">
          {matches.map((m) => (
            <li key={m._id} className="list-group-item d-flex justify-content-between">
              <span>{m.mode} · {m.players.map((p) => p.username).join(' vs ')} · {m.status}</span>
              <Link to={`/battle/${m._id}`}>Open</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BattlePlay() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [question, setQuestion] = useState(null); // { index, total, question, timeLimit, startedAt }
  const [selected, setSelected] = useState(null);
  const [reveal, setReveal] = useState(null); // { index, correctIndex, explanation }
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const offsetRef = useRef(0); // server clock - client clock

  useEffect(() => {
    const socket = getSocket();
    const syncClock = (serverTime) => {
      if (serverTime) offsetRef.current = serverTime - Date.now();
    };

    const onState = (s) => {
      syncClock(s.serverTime);
      setState(s);
      if (s.status === 'active' && s.question) {
        setQuestion({ index: s.currentIndex, total: s.totalQuestions, question: s.question, timeLimit: s.questionTime, startedAt: s.questionStartedAt });
      }
    };
    const onStarting = ({ inMs }) => setCountdown(Math.round(inMs / 1000));
    const onQuestion = (q) => {
      syncClock(q.serverTime);
      setCountdown(null);
      setReveal(null);
      setSelected(null);
      setQuestion(q);
      setState((s) => (s ? { ...s, status: 'active', currentIndex: q.index, players: s.players.map((p) => ({ ...p, answeredCurrent: false })) } : s));
    };
    const onAnswered = ({ userId }) =>
      setState((s) => (s ? { ...s, players: s.players.map((p) => (String(p.user) === String(userId) ? { ...p, answeredCurrent: true } : p)) } : s));
    const onReveal = (r) => {
      setReveal(r);
      setState((s) => (s ? { ...s, players: r.players } : s));
    };
    const onFinished = (s) => {
      setState(s);
      setQuestion(null);
    };
    const onLeft = () => setNotice('A player left the match.');
    const onCancelled = ({ reason }) => setError(`Match cancelled: ${reason}`);

    socket.on('battle:state', onState);
    socket.on('battle:starting', onStarting);
    socket.on('battle:question', onQuestion);
    socket.on('battle:answered', onAnswered);
    socket.on('battle:reveal', onReveal);
    socket.on('battle:finished', onFinished);
    socket.on('battle:playerLeft', onLeft);
    socket.on('battle:cancelled', onCancelled);

    socket.emit('battle:join', { matchId }, (res) => {
      if (!res?.ok) setError(res?.message || 'Could not join the match');
    });

    return () => {
      socket.off('battle:state', onState);
      socket.off('battle:starting', onStarting);
      socket.off('battle:question', onQuestion);
      socket.off('battle:answered', onAnswered);
      socket.off('battle:reveal', onReveal);
      socket.off('battle:finished', onFinished);
      socket.off('battle:playerLeft', onLeft);
      socket.off('battle:cancelled', onCancelled);
    };
  }, [matchId]);

  // Countdown before the first question.
  useEffect(() => {
    if (countdown === null || countdown <= 0) return undefined;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const answer = (choice) => {
    if (selected !== null || reveal) return;
    setSelected(choice);
    getSocket().emit('battle:answer', { matchId, qIndex: question.index, choice }, (res) => {
      if (!res?.ok) {
        setNotice(res?.message || 'Answer not accepted');
      }
    });
  };

  const leave = () => {
    if (!window.confirm('Leave the match? You will lose by forfeit.')) return;
    getSocket().emit('battle:leave', { matchId }, () => navigate('/battle'));
  };

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error}</div>
        <Link to="/battle">Back</Link>
      </div>
    );
  }
  if (!state) return <div className="container py-5 text-center">Connecting to the match...</div>;

  const me = state.players.find((p) => String(p.user) === String(user._id));
  const secondsLeft = question
    ? Math.max(0, Math.ceil(question.timeLimit - (Date.now() + offsetRef.current - new Date(question.startedAt).getTime()) / 1000))
    : 0;

  if (state.status === 'finished') {
    const change = me && me.ratingAfter != null && me.ratingBefore != null ? me.ratingAfter - me.ratingBefore : null;
    return (
      <div className="container py-4" style={{ maxWidth: 640 }}>
        <h2 className="mb-1">Match finished</h2>
        <p className="lead">
          {me?.result === 'win' && 'You won! 🎉'}
          {me?.result === 'draw' && 'It is a draw.'}
          {me?.result === 'loss' && 'You lost this time.'}
          {me?.result === 'forfeit' && 'You left the match.'}
          {change !== null && (
            <span className={`ms-2 badge bg-${change >= 0 ? 'success' : 'danger'}`}>{change >= 0 ? '+' : ''}{change} rating</span>
          )}
        </p>
        <Scoreboard players={state.players} meId={user._id} />
        <div className="d-flex gap-2 mt-3">
          <Link className="btn btn-primary" to={`/history/${state._id}`}>Review answers</Link>
          {state.mode === 'ranked' && <Link className="btn btn-outline-primary" to="/ranked">Play ranked again</Link>}
          {state.mode === 'private' && <Link className="btn btn-outline-primary" to="/rooms">Back to rooms</Link>}
          {state.mode === 'tournament' && state.tournament && <Link className="btn btn-outline-primary" to={`/tournaments/${state.tournament}`}>Back to tournament</Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Battle <span className="badge bg-secondary">{state.mode}</span></h4>
        <button className="btn btn-sm btn-outline-danger" onClick={leave}>Leave</button>
      </div>
      {notice && <div className="alert alert-warning py-2">{notice}</div>}
      <div className="row g-4">
        <div className="col-lg-8">
          {state.status === 'waiting' && (
            <div className="card card-body text-center">
              {countdown !== null ? <h3>Starting in {countdown}...</h3> : <h5>Waiting for all players to join...</h5>}
            </div>
          )}
          {state.status === 'active' && question && (
            <>
              {!reveal && <Timer seconds={secondsLeft} resetKey={question.index} paused={!!reveal} />}
              <QuestionCard
                question={question.question}
                number={question.index + 1}
                total={question.total}
                selectedIndex={selected}
                correctIndex={reveal ? reveal.correctIndex : null}
                disabled={selected !== null || !!reveal || me?.forfeited}
                onAnswer={answer}
              />
              {selected !== null && !reveal && <p className="text-muted mt-2">Answer locked. Waiting for others...</p>}
              {reveal && reveal.explanation && <div className="alert alert-info mt-3">{reveal.explanation}</div>}
            </>
          )}
        </div>
        <div className="col-lg-4">
          <h6>Scores</h6>
          <Scoreboard players={state.players} meId={user._id} showAnswered={!reveal} />
        </div>
      </div>
    </div>
  );
}
