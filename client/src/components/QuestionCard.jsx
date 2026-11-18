// SHARED component (F1 Battle, F4 Rooms, F7 Daily, F19 Practice).
// <QuestionCard question={q} number={1} total={10} onAnswer={(index) => ...}
//               selectedIndex={chosen} correctIndex={showAnswer ? q.correctIndex : null} disabled={answered} />
export default function QuestionCard({ question, number, total, onAnswer, selectedIndex = null, correctIndex = null, disabled = false }) {
  if (!question) return null;

  const styleFor = (i) => {
    if (correctIndex !== null && i === correctIndex) return 'btn-success';
    if (correctIndex !== null && i === selectedIndex) return 'btn-danger';
    if (i === selectedIndex) return 'btn-primary';
    return 'btn-outline-primary';
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        {total && <div className="text-muted small mb-2">Question {number} of {total}</div>}
        <h5 className="card-title mb-3">{question.text}</h5>
        {question.imageUrl && <img src={question.imageUrl} alt="" className="img-fluid rounded mb-3" />}
        <div className="d-grid gap-2">
          {question.options.map((opt, i) => (
            <button key={i} type="button" className={`btn text-start ${styleFor(i)}`} disabled={disabled} onClick={() => onAnswer?.(i)}>
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
