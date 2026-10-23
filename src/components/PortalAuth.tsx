import React, { useState } from 'react';
import { 
  Laptop, 
  GraduationCap, 
  KeyRound, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Lock,
  Hash,
  School
} from 'lucide-react';
import { ExamCode, StudentProfile, TeacherProfile } from '../types/quiz.ts';
import { REGISTERED_TEACHERS } from '../data/teacherData.ts';
import { playNavigationSound } from '../utils/soundEffects.ts';

interface PortalAuthProps {
  examCodes: ExamCode[];
  activeTeacher: TeacherProfile | null;
  onStudentEnterExam: (student: StudentProfile, examCode: ExamCode) => void;
  onTeacherLogin: (teacher: TeacherProfile) => void;
}

// Rombel Kelas 7A s.d 9E
const ROMBEL_CLASSES = [
  '7A', '7B', '7C', '7D', '7E',
  '8A', '8B', '8C', '8D', '8E',
  '9A', '9B', '9C', '9D', '9E',
];

export const PortalAuth: React.FC<PortalAuthProps> = ({
  examCodes,
  onStudentEnterExam,
  onTeacherLogin,
}) => {
  const [activePortal, setActivePortal] = useState<'siswa' | 'guru'>('siswa');

  // Student State
  const [inputExamCode, setInputExamCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('8A');
  const [absenNumber, setAbsenNumber] = useState('');
  const [studentError, setStudentError] = useState('');

  // Teacher State
  const [inputNiy, setInputNiy] = useState('');
  const [teacherError, setTeacherError] = useState('');
  const [teacherSuccess, setTeacherSuccess] = useState('');

  // Matched Exam Code
  const matchedExam = examCodes.find(
    (c) => c.code.trim().toUpperCase() === inputExamCode.trim().toUpperCase()
  );

  // Student Submit
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    if (!inputExamCode.trim()) {
      setStudentError('Silakan masukkan Kode Ujian yang diberikan guru.');
      return;
    }

    if (!matchedExam) {
      setStudentError(`Kode ujian "${inputExamCode}" tidak valid atau belum diaktifkan oleh guru.`);
      return;
    }

    if (!studentName.trim()) {
      setStudentError('Silakan masukkan nama lengkap siswa.');
      return;
    }

    if (!studentClass) {
      setStudentError('Silakan pilih kelas Anda.');
      return;
    }

    playNavigationSound();
    onStudentEnterExam(
      {
        name: studentName.trim(),
        studentClass: studentClass,
        nisn: absenNumber.trim() ? `Absen ${absenNumber.trim()}` : undefined,
      },
      matchedExam
    );
  };

  // Teacher Login with NIY
  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError('');
    setTeacherSuccess('');

    const trimmedNiy = inputNiy.trim();
    if (!trimmedNiy) {
      setTeacherError('Silakan masukkan NIY Guru Anda.');
      return;
    }

    // Match NIY with registered teachers, or allow standard teacher NIY entry
    const foundTeacher = REGISTERED_TEACHERS.find(
      (t) => t.niy.replace(/[\s-]/g, '') === trimmedNiy.replace(/[\s-]/g, '')
    );

    if (foundTeacher) {
      playNavigationSound();
      setTeacherSuccess(`Berhasil login sebagai ${foundTeacher.name}. Mengalihkan...`);
      setTimeout(() => {
        onTeacherLogin(foundTeacher);
      }, 500);
    } else if (trimmedNiy.length >= 6) {
      // Allow custom / yayasan NIY
      const customTeacher: TeacherProfile = {
        id: `t-${Date.now()}`,
        name: 'Guru Mata Pelajaran',
        niy: trimmedNiy,
        subject: 'Mata Pelajaran SMP',
        schoolName: 'SMP Negeri 1 Nusantara',
      };
      playNavigationSound();
      setTeacherSuccess('Berhasil login ke Dashboard Guru.');
      setTimeout(() => {
        onTeacherLogin(customTeacher);
      }, 500);
    } else {
      setTeacherError('Nomor Induk Yayasan (NIY) tidak valid.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      {/* Portal Selection Switcher */}
      <div className="flex p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-8 shadow-inner">
        <button
          type="button"
          onClick={() => {
            playNavigationSound();
            setActivePortal('siswa');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activePortal === 'siswa'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Masuk Sebagai Siswa</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playNavigationSound();
            setActivePortal('guru');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activePortal === 'guru'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Masuk Sebagai Guru</span>
        </button>
      </div>

      {/* ================= PORTAL SISWA ================= */}
      {activePortal === 'siswa' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Laptop className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Ujian CBT Siswa SMP
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Masukkan kode ujian yang diberikan guru dan lengkapi data diri Anda.
            </p>
          </div>

          {studentError && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{studentError}</span>
            </div>
          )}

          <form onSubmit={handleStudentSubmit} className="space-y-4">
            {/* Input Kode Ujian */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kode Ujian <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={inputExamCode}
                  onChange={(e) => setInputExamCode(e.target.value.toUpperCase())}
                  placeholder="Masukkan Kode Ujian..."
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold tracking-wider text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>
            </div>

            {/* If Exam Code matched, show brief subject info */}
            {matchedExam && (
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-100 space-y-1 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{matchedExam.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300 pt-0.5">
                  <span>Mata Pelajaran: <strong>{matchedExam.subjectName}</strong></span>
                  <span>Waktu: <strong>{matchedExam.durationMinutes} Menit</strong></span>
                </div>
              </div>
            )}

            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nama Lengkap Siswa"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Kelas & No Absen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kelas <span className="text-rose-500">*</span>
                </label>
                <select
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Kelas 7">
                    {ROMBEL_CLASSES.filter((c) => c.startsWith('7')).map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Kelas 8">
                    {ROMBEL_CLASSES.filter((c) => c.startsWith('8')).map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Kelas 9">
                    {ROMBEL_CLASSES.filter((c) => c.startsWith('9')).map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  No. Absen <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={absenNumber}
                    onChange={(e) => setAbsenNumber(e.target.value)}
                    placeholder="Contoh: 14"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Tombol Mulai */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Mulai Ujian</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= PORTAL GURU ================= */}
      {activePortal === 'guru' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Login Guru
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Masukkan Nomor Induk Yayasan (NIY) Anda.
            </p>
          </div>

          {teacherError && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{teacherError}</span>
            </div>
          )}

          {teacherSuccess && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{teacherSuccess}</span>
            </div>
          )}

          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nomor Induk Yayasan (NIY) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={inputNiy}
                  onChange={(e) => setInputNiy(e.target.value)}
                  placeholder="Masukkan NIY Guru Anda..."
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Lock className="w-4 h-4" />
                <span>Masuk ke Dashboard Guru</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
