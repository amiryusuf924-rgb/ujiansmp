import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUploadedDocumentQuestions } from './aiGenerator.ts';

test('parseUploadedDocumentQuestions reads real uploaded question text and matches answer choices', () => {
  const rawText = `Nomor 1 Sedang
[Soal 1] Diketahui panjang sisi penyiku segitiga siku-siku adalah 9 cm dan 12 cm. Berapakah panjang hipotenusa (sisi miring) segitiga tersebut?
A. 14 cm
B. 15 cm
KUNCI JAWABAN
C. 16 cm
D. 18 cm
Pembahasan: c² = a² + b² = 9² + 12² = 81 + 144 = 225. Maka c = √225 = 15 cm.`;

  const questions = parseUploadedDocumentQuestions(rawText, 'Matematika', 'Kelas 8');

  assert.equal(questions.length, 1);
  assert.match(questions[0].questionText, /Diketahui panjang sisi penyiku/i);
  assert.equal(questions[0].options.B, '15 cm');
  assert.equal(questions[0].correctAnswer, 'B');
  assert.match(questions[0].explanation, /√225 = 15 cm/i);
});

test('convert fallback keeps Informatika questions in the Informatika subject instead of defaulting to Matematika', async () => {
  const file = new File([''], 'soal-informatika.txt', { type: 'text/plain' });
  const { convertDocumentFileToQuestions } = await import('./aiGenerator.ts');

  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false } as Response);

  try { 
    const questions = await convertDocumentFileToQuestions(file, 'Informatika', 'Kelas 9');
    assert.ok(questions.length > 0);
    assert.equal(questions[0].subjectName, 'Informatika');
    assert.match(questions[0].questionText, /CPU|algoritma|internet|sistem operasi|program/i);
  } finally {
    global.fetch = originalFetch;
  }
});
