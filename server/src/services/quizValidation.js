// F8 (Farin): quiz/question validation and CSV import. Pure functions, unit tested.
const TYPES = ['mcq', 'truefalse', 'image'];

/** Returns a list of problems with one question (empty list = valid). */
function validateQuestion(q) {
  const errors = [];
  if (!q || typeof q !== 'object') return ['Question is empty'];
  if (!q.text || !String(q.text).trim()) errors.push('question text is missing');
  const type = q.type || 'mcq';
  if (!TYPES.includes(type)) errors.push(`type must be one of ${TYPES.join(', ')}`);
  const options = Array.isArray(q.options) ? q.options : [];
  if (type === 'truefalse') {
    if (options.length !== 2) errors.push('true/false questions need exactly 2 options');
  } else if (options.length < 2 || options.length > 6) {
    errors.push('needs 2 to 6 options');
  }
  if (options.some((o) => !String(o || '').trim())) errors.push('an option is empty');
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length) errors.push('correct answer is not one of the options');
  if (type === 'image' && !q.imageUrl) errors.push('image questions need an image URL');
  return errors;
}

/** Returns all problems that block publishing. */
function validateQuiz(quiz) {
  const errors = [];
  if (!quiz.title || !String(quiz.title).trim()) errors.push('Title is missing');
  if (!quiz.category) errors.push('Category is missing');
  if (!quiz.questions || quiz.questions.length === 0) errors.push('Add at least one question');
  (quiz.questions || []).forEach((q, i) => {
    validateQuestion(q).forEach((e) => errors.push(`Question ${i + 1}: ${e}`));
  });
  return errors;
}

/** Minimal CSV parser: handles quotes, commas and new lines inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"' && s[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const CSV_COLUMNS = ['text', 'type', 'optionA', 'optionB', 'optionC', 'optionD', 'correct', 'explanation', 'imageUrl'];

/**
 * CSV -> questions. Expected header: text,type,optionA,optionB,optionC,optionD,correct,explanation,imageUrl
 * correct = A/B/C/D or 1/2/3/4 (true/false questions also accept True/False).
 * @returns {{ questions: object[], errors: {row: number, message: string}[] }}
 */
function questionsFromCsv(text) {
  const rows = parseCsv(text);
  const errors = [];
  const questions = [];
  if (rows.length < 2) return { questions, errors: [{ row: 1, message: 'The file needs a header row and at least one question row' }] };

  const header = rows[0].map((h) => h.trim());
  const missing = ['text', 'optionA', 'optionB', 'correct'].filter((col) => !header.includes(col));
  if (missing.length) return { questions, errors: [{ row: 1, message: `Missing columns: ${missing.join(', ')}. Expected: ${CSV_COLUMNS.join(',')}` }] };
  const col = (r, name) => (header.indexOf(name) >= 0 ? String(r[header.indexOf(name)] || '').trim() : '');

  rows.slice(1).forEach((r, i) => {
    const rowNumber = i + 2;
    const type = (col(r, 'type') || 'mcq').toLowerCase();
    let options = ['optionA', 'optionB', 'optionC', 'optionD'].map((k) => col(r, k)).filter(Boolean);
    let correct = col(r, 'correct').toUpperCase();
    if (type === 'truefalse') {
      options = ['True', 'False'];
      if (correct === 'TRUE') correct = 'A';
      if (correct === 'FALSE') correct = 'B';
    }
    let correctIndex = -1;
    if (/^[A-F]$/.test(correct)) correctIndex = correct.charCodeAt(0) - 65;
    else if (/^[1-6]$/.test(correct)) correctIndex = Number(correct) - 1;

    const q = { text: col(r, 'text'), type, options, correctIndex, explanation: col(r, 'explanation'), imageUrl: col(r, 'imageUrl') };
    const problems = validateQuestion(q);
    if (problems.length) errors.push({ row: rowNumber, message: problems.join('; ') });
    else questions.push(q);
  });

  return { questions, errors };
}

module.exports = { TYPES, validateQuestion, validateQuiz, parseCsv, questionsFromCsv, CSV_COLUMNS };
