import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

function aiProxyPlugin(): Plugin {
  return {
    name: 'ai-proxy-plugin',
    configureServer(server) {
      // Document file to CBT Question Converter
      server.middlewares.use('/api/convert-document', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { fileName, base64Content, subjectName, grade, rawText } = data;
            const apiKey = process.env.GEMINI_API_KEY;

            let extractedText = rawText || '';

            // If base64 provided and it's a docx
            if (base64Content && fileName?.toLowerCase().endsWith('.docx')) {
              try {
                const mammoth = await import('mammoth');
                const buffer = Buffer.from(base64Content, 'base64');
                const result = await mammoth.extractRawText({ buffer });
                extractedText = result.value || '';
              } catch (e) {
                console.warn('Mammoth docx parse fallback:', e);
              }
            }

            if (!apiKey) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ questions: [], extractedText }));
              return;
            }

            const ai = new GoogleGenAI({ apiKey });
            let response;

            if (base64Content && fileName?.toLowerCase().endsWith('.pdf')) {
              // Direct PDF multimodal ingestion
              const prompt = `Anda adalah sistem pengkonversi dokumen soal ujian SMP resmi.
Bacalah dokumen PDF ini, lalu ekstrak SELURUH soal pilihan ganda yang ada di dalamnya secara presisi dan rapi.
Untuk setiap butir soal:
1. Pastikan memiliki teks pertanyaan yang jelas.
2. Identifikasi 4 pilihan jawaban (A, B, C, D).
3. Tandai kunci jawaban yang benar (A, B, C, atau D).
4. Buatkan pembahasan edukatif yang ringkas dan jelas.
Mata Pelajaran: ${subjectName || 'SMP'}
Tingkat: ${grade || 'Kelas 8'}

Format output HARUS berupa JSON array valid tanpa markdown backtick:
[
  {
    "questionText": "Pertanyaan...",
    "options": {
      "A": "Pilihan A",
      "B": "Pilihan B",
      "C": "Pilihan C",
      "D": "Pilihan D"
    },
    "correctAnswer": "A",
    "explanation": "Penjelasan..."
  }
]`;

              response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: [
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: base64Content,
                    },
                  },
                  { text: prompt },
                ],
                config: {
                  responseMimeType: 'application/json',
                },
              });
            } else {
              // Word text or raw text conversion
              const prompt = `Anda adalah sistem pengkonversi dokumen soal ujian SMP resmi.
Berikut adalah teks dari dokumen soal ujian:
---
${extractedText.slice(0, 30000)}
---
Tugas Anda:
1. Konversi teks di atas menjadi butir-butir soal pilihan ganda (A, B, C, D) siap pakai.
2. Temukan atau tentukan kunci jawaban yang benar untuk setiap soal.
3. Buatkan pembahasan konsep edukatif untuk setiap soal.
Mata Pelajaran: ${subjectName || 'SMP'}
Tingkat: ${grade || 'Kelas 8'}

Format output HARUS berupa JSON array valid tanpa markdown backtick:
[
  {
    "questionText": "Teks pertanyaan...",
    "options": {
      "A": "Pilihan A",
      "B": "Pilihan B",
      "C": "Pilihan C",
      "D": "Pilihan D"
    },
    "correctAnswer": "A",
    "explanation": "Penjelasan..."
  }
]`;

              response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                },
              });
            }

            const resText = response?.text || '[]';
            const questions = JSON.parse(resText);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ questions, extractedText }));
          } catch (error) {
            console.error('Document conversion error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ questions: [] }));
          }
        });
      });

      server.middlewares.use('/api/ai/generate-questions', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ questions: [] }));
              return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Anda adalah Guru Ahli Kurikulum SMP Indonesia.
Buatkan ${data.questionCount || 5} butir soal pilihan ganda (A, B, C, D) berkualitas tinggi untuk:
- Mata Pelajaran: ${data.subjectName}
- Tingkat: ${data.grade}
- Topik/Materi: ${data.topic || 'Umum'}
- Tingkat Kesulitan: ${data.difficulty || 'Sedang'}

Format respons HARUS berupa array JSON valid tanpa markdown backtick:
[
  {
    "questionText": "Teks pertanyaan jelas dan lugas...",
    "options": {
      "A": "Pilihan A",
      "B": "Pilihan B",
      "C": "Pilihan C",
      "D": "Pilihan D"
    },
    "correctAnswer": "A",
    "explanation": "Pembahasan konsep edukatif yang mendalam..."
  }
]`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              },
            });

            const text = response.text || '[]';
            const parsed = JSON.parse(text);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ questions: parsed }));
          } catch (error) {
            console.error('Server generation error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ questions: [] }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aiProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

