import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  Filter, 
  PlusCircle, 
  Trash2, 
  Eye, 
  AlertCircle, 
  Check, 
  BarChart2, 
  Layers, 
  FileCheck,
  Printer,
  KeyRound,
  GraduationCap,
  Trophy,
  LogOut,
  Send,
  Loader2,
  Save,
  BookOpen
} from 'lucide-react';
import { 
  ExamCode, 
  ExamResult, 
  OptionKey, 
  Question, 
  SubjectMeta, 
  TeacherProfile,
  AIGenerateRequest 
} from '../types/quiz.ts';
import { formatTime, formatDateIndo } from '../utils/grading.ts';
import { StudentAnswerSheetModal } from './StudentAnswerSheetModal.tsx';
import { StudentProgressView } from './StudentProgressView.tsx';
import { LeaderboardView } from './LeaderboardView.tsx';
import { 
  convertDocumentFileToQuestions,
  generateQuestionsWithAI,
  exportQuestionsToWord, 
  openPrintableDocument 
} from '../utils/aiGenerator.ts';
import { playNavigationSound, playSuccessSound } from '../utils/soundEffects.ts';

interface TeacherDashboardProps {
  results: ExamResult[];
  questions: Question[];
  subjects: SubjectMeta[];
  examCodes: ExamCode[];
  activeTeacher: TeacherProfile | null;
  onLogoutTeacher: () => void;
  onAddCustomQuestions: (newQuestions: Question[]) => void;
  onDeleteQuestion: (id: string) => void;
  onResetResults: () => void;
  onSaveExamCode: (code: ExamCode) => void;
  onDeleteExamCode: (codeId: string) => void;
}

export type TeacherTab = 'results' | 'analytics' | 'leaderboard' | 'document_converter' | 'exam_codes' | 'questions';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  results,
  questions,
  subjects,
  examCodes,
  activeTeacher,
  onLogoutTeacher,
  onAddCustomQuestions,
  onDeleteQuestion,
  onResetResults,
  onSaveExamCode,
  onDeleteExamCode,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('results');
  
  // Results Tab Filters
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'remedial'>('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedResultForDetail, setSelectedResultForDetail] = useState<ExamResult | null>(null);

  // Document Converter State
  const [selectedDocSubject, setSelectedDocSubject] = useState(subjects[0]?.name || 'Matematika SMP');
  const [selectedDocGrade, setSelectedDocGrade] = useState<'Kelas 7' | 'Kelas 8' | 'Kelas 9'>('Kelas 8');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedQuestions, setConvertedQuestions] = useState<Question[]>([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Exam Code Manager State
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeTitle, setNewCodeTitle] = useState('');
  const [newCodeSubject, setNewCodeSubject] = useState(subjects[0]?.id || 'matematika');
  const [newCodeGrade, setNewCodeGrade] = useState<'Kelas 7' | 'Kelas 8' | 'Kelas 9'>('Kelas 8');
  const [newCodeDuration, setNewCodeDuration] = useState(20);
  const [newCodeKKM, setNewCodeKKM] = useState(75);
  const [codeSuccessMsg, setCodeSuccessMsg] = useState('');

  // Overall Metrics
  const totalSubmissions = results.length;
  const overallAvg = totalSubmissions > 0
    ? Math.round((results.reduce((acc, curr) => acc + curr.score, 0) / totalSubmissions) * 10) / 10
    : 0;
  const passedCount = results.filter((r) => r.passed).length;
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;

  // Filtered Student Results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (selectedSubject !== 'all' && r.subjectId !== selectedSubject) return false;
      if (selectedClass !== 'all' && r.studentClass !== selectedClass) return false;
      if (statusFilter === 'passed' && !r.passed) return false;
      if (statusFilter === 'remedial' && r.passed) return false;
      if (searchStudent.trim()) {
        const q = searchStudent.toLowerCase();
        return (
          r.studentName.toLowerCase().includes(q) ||
          r.studentClass.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [results, selectedSubject, selectedClass, statusFilter, searchStudent]);

  // Distinct classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.studentClass) set.add(r.studentClass);
    });
    return Array.from(set).sort();
  }, [results]);

  // Item Analysis: Question Difficulty Index
  const itemAnalysis = useMemo(() => {
    const questionStats: Record<string, { text: string; topic: string; correct: number; total: number }> = {};

    results.forEach((r) => {
      if (r.detailedAnalysis) {
        r.detailedAnalysis.forEach((q) => {
          if (!questionStats[q.questionId]) {
            questionStats[q.questionId] = {
              text: q.questionText,
              topic: q.topic,
              correct: 0,
              total: 0,
            };
          }
          questionStats[q.questionId].total += 1;
          if (q.isCorrect) {
            questionStats[q.questionId].correct += 1;
          }
        });
      }
    });

    return Object.entries(questionStats)
      .map(([id, d]) => ({
        id,
        text: d.text,
        topic: d.topic,
        attempts: d.total,
        accuracy: Math.round((d.correct / d.total) * 100),
      }))
      .filter((d) => d.attempts >= 1)
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [results]);

  // Handle Document Upload & Auto Convert to Questions
  const handleDocFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setIsConverting(true);
    setActionSuccessMsg('');

    try {
      const qList = await convertDocumentFileToQuestions(file, selectedDocSubject, selectedDocGrade);
      setConvertedQuestions(qList);
      setActionSuccessMsg(`File "${file.name}" berhasil dikonversi menjadi ${qList.length} butir soal pilihan ganda siap pakai.`);
      playSuccessSound();
    } catch (err) {
      console.error('Error converting document:', err);
    } finally {
      setIsConverting(false);
    }
  };

  // Save converted questions to Question Bank
  const handleSaveQuestionsToBank = () => {
    if (convertedQuestions.length === 0) return;
    onAddCustomQuestions(convertedQuestions);
    setActionSuccessMsg(`Berhasil menyimpan ${convertedQuestions.length} butir soal ke Bank Soal CBT.`);
    playSuccessSound();
  };

  // Publish directly as a new Exam Code
  const handlePublishAsExamCode = () => {
    if (convertedQuestions.length === 0) return;
    
    // Save to bank first
    onAddCustomQuestions(convertedQuestions);

    const generatedCode = `${selectedDocSubject.slice(0, 3).toUpperCase()}${selectedDocGrade.replace(/\D/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const newCode: ExamCode = {
      id: `code-${Date.now()}`,
      code: generatedCode,
      title: `Ujian ${selectedDocSubject} (${uploadFile ? uploadFile.name.replace(/\.[^/.]+$/, '') : 'Materi Pembelajaran'})`,
      subjectId: selectedDocSubject.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      subjectName: selectedDocSubject,
      grade: selectedDocGrade,
      durationMinutes: Math.max(10, convertedQuestions.length * 2),
      kkm: 75,
      questionCount: convertedQuestions.length,
      createdByName: activeTeacher ? activeTeacher.name : 'Dewan Guru SMP',
      createdByNiy: activeTeacher ? activeTeacher.niy : '19850412201001',
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    onSaveExamCode(newCode);
    setActionSuccessMsg(`Kode Ujian "${generatedCode}" telah aktif! Siswa sekarang dapat langsung login menggunakan kode ini.`);
    playSuccessSound();
  };

  // Export to Word with bold answer keys
  const handleExportWord = () => {
    if (convertedQuestions.length === 0) return;
    exportQuestionsToWord(convertedQuestions, {
      title: `Paket Soal ${selectedDocSubject} - ${selectedDocGrade}`,
      subjectName: selectedDocSubject,
      grade: selectedDocGrade,
      teacherName: activeTeacher ? activeTeacher.name : 'Dewan Guru SMP',
      durationMinutes: 20,
      kkm: 75,
    });
  };

  // Print / Save PDF with bold answer keys
  const handlePrintPDF = () => {
    if (convertedQuestions.length === 0) return;
    openPrintableDocument(convertedQuestions, {
      title: `Paket Soal ${selectedDocSubject} ${selectedDocGrade}`,
      subjectName: selectedDocSubject,
      grade: selectedDocGrade,
      teacherName: activeTeacher ? activeTeacher.name : 'Dewan Guru SMP',
      durationMinutes: 20,
      kkm: 75,
    });
  };

  // Create Manual Exam Code
  const handleCreateExamCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeName.trim() || !newCodeTitle.trim()) return;

    const sub = subjects.find((s) => s.id === newCodeSubject);
    const subQuestions = questions.filter((q) => q.subjectId === newCodeSubject);

    const code: ExamCode = {
      id: `code-${Date.now()}`,
      code: newCodeName.trim().toUpperCase(),
      title: newCodeTitle.trim(),
      subjectId: newCodeSubject,
      subjectName: sub?.name || 'Mata Pelajaran SMP',
      grade: newCodeGrade,
      durationMinutes: Number(newCodeDuration) || 20,
      kkm: Number(newCodeKKM) || 75,
      questionCount: subQuestions.length > 0 ? subQuestions.length : 5,
      createdByName: activeTeacher ? activeTeacher.name : 'Dewan Guru SMP',
      createdByNiy: activeTeacher ? activeTeacher.niy : '19850412201001',
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    onSaveExamCode(code);
    setCodeSuccessMsg(`Kode ujian "${code.code}" berhasil disimpan dan aktif.`);
    setNewCodeName('');
    setNewCodeTitle('');
  };

  // Export Results CSV
  const handleExportResultsCSV = () => {
    if (filteredResults.length === 0) return;

    const headers = ['No', 'Nama_Siswa', 'Kelas', 'No_Absen', 'Mata_Pelajaran', 'Skor', 'Ketuntasan', 'Benar', 'Salah', 'Durasi_Detik', 'Tanggal'];
    const rows = filteredResults.map((r, i) => [
      i + 1,
      `"${r.studentName}"`,
      r.studentClass,
      r.nisn || '-',
      `"${r.subjectName}"`,
      r.score,
      r.passed ? 'TUNTAS' : 'REMEDIAL',
      r.correctCount,
      r.wrongCount,
      r.durationSeconds,
      `"${formatDateIndo(r.completedAt)}"`,
    ]);

    const csvData = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Nilai_Exambro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Banner with Teacher Identity & Clean Logout Only */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            Panel Khusus Guru SMP • Real-time Sync
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Dashboard Guru & Manajemen Ujian
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mt-1 leading-relaxed">
            {activeTeacher ? (
              <span>
                Selamat bertugas, <strong>{activeTeacher.name}</strong> (NIY: {activeTeacher.niy}) • {activeTeacher.subject}
              </span>
            ) : (
              'Pantau nilai siswa, analisis progres belajar, konversi file soal Word/PDF, dan kelola kode ujian siswa.'
            )}
          </p>
        </div>

        {/* Clean Header: Only Keluar button as requested */}
        <div className="flex items-center gap-2.5">
          {activeTeacher && (
            <button
              type="button"
              onClick={onLogoutTeacher}
              title="Keluar dari Akun Guru"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Ujian Selesai</span>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100 my-1">
            {totalSubmissions}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Data Tersimpan Real-time
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Rata-rata Nilai Sekolah</span>
          <div className="text-3xl font-black text-blue-600 dark:text-blue-400 my-1">
            {overallAvg}
          </div>
          <span className="text-[11px] text-slate-400">Target KKM Sekolah: 75</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Tingkat Ketuntasan</span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 my-1">
            {passRate}%
          </div>
          <span className="text-[11px] text-slate-400">{passedCount} siswa mencapai KKM</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Kode Ujian Aktif</span>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 my-1">
            {examCodes.length} <span className="text-sm font-semibold text-slate-500">Sesi</span>
          </div>
          <span className="text-[11px] text-slate-400">{questions.length} Total Soal CBT</span>
        </div>
      </div>

      {/* Teacher Navigation Tabs (Zero AI mentions) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('results');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'results'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Hasil & Rekap Nilai</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('analytics');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Grafik Belajar Siswa</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('leaderboard');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Leaderboard Siswa</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('document_converter');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'document_converter'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload File Soal (Word / PDF)</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('exam_codes');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'exam_codes'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Kelola Kode Ujian ({examCodes.length})</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('questions');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bank Soal CBT ({questions.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: HASIL & REKAP NILAI ================= */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">Semua Mapel</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">Semua Kelas</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">Semua Status</option>
                <option value="passed">Tuntas (&gt;= KKM)</option>
                <option value="remedial">Remedial (&lt; KKM)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Cari siswa / kelas..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleExportResultsCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Rekap (CSV)</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {filteredResults.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Tidak ada data nilai siswa yang sesuai kriteria pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Mapel</th>
                      <th className="py-3 px-4 text-center">Skor</th>
                      <th className="py-3 px-4 text-center">Ketuntasan</th>
                      <th className="py-3 px-4 text-center">Benar / Total</th>
                      <th className="py-3 px-4 text-center">Durasi</th>
                      <th className="py-3 px-4">Waktu Selesai</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredResults.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                          {r.studentName}
                          {r.nisn && <div className="text-[10px] text-slate-400 font-normal">{r.nisn}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {r.studentClass}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {r.subjectName}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-sm text-blue-600 dark:text-blue-400">
                          {r.score}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.passed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {r.passed ? 'TUNTAS' : 'REMEDIAL'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                          <strong className="text-emerald-600">{r.correctCount}</strong> / {r.totalQuestions}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {formatTime(r.durationSeconds)}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {formatDateIndo(r.completedAt)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedResultForDetail(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lembar Jawaban</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: GRAFIK PROGRES BELAJAR ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <StudentProgressView
            results={results}
            subjects={subjects}
            activeStudent={null}
            onStartQuiz={() => {}}
          />

          {/* Item Analysis */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Analisis Butir Soal (Indeks Kesulitan / Soal Paling Sering Salah)
                </h3>
                <p className="text-xs text-slate-400">
                  Guru dapat melihat soal dengan akurasi terendah untuk bahan materi remedial di kelas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-14">Tingkat</th>
                    <th className="py-2.5 px-3">Topik Pembelajaran</th>
                    <th className="py-2.5 px-3">Teks Pertanyaan</th>
                    <th className="py-2.5 px-3 text-center">Dikerjakan</th>
                    <th className="py-2.5 px-3 text-center">Akurasi Benar</th>
                    <th className="py-2.5 px-3 text-center">Rekomendasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itemAnalysis.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {item.topic}
                      </td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200 max-w-md">
                        {item.text}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500">{item.attempts}x</td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            item.accuracy < 60
                              ? 'bg-rose-100 text-rose-800 font-extrabold'
                              : item.accuracy < 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.accuracy}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.accuracy < 60 ? (
                          <span className="text-rose-600 font-bold text-[11px]">Perlu Remedial</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Cukup Dikuasai</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: LEADERBOARD SISWA ================= */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <LeaderboardView
            results={results}
            subjects={subjects}
            activeStudent={null}
          />
        </div>
      )}

      {/* ================= TAB 4: UPLOAD FILE SOAL (WORD / PDF) ================= */}
      {activeTab === 'document_converter' && (
        <div className="space-y-6">
          {actionSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">{actionSuccessMsg}</span>
              </div>
              <button
                onClick={() => setActionSuccessMsg('')}
                className="text-emerald-600 hover:text-emerald-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Upload Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Upload Dokumen Soal (Word / PDF)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pilih file soal dalam format Microsoft Word (.docx, .doc) atau PDF (.pdf). Sistem akan secara otomatis mengonversi butir soal menjadi format CBT siap pakai.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={selectedDocSubject}
                  onChange={(e) => setSelectedDocSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tingkat Kelas
                </label>
                <select
                  value={selectedDocGrade}
                  onChange={(e) => setSelectedDocGrade(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="Kelas 7">Kelas 7 SMP</option>
                  <option value="Kelas 8">Kelas 8 SMP</option>
                  <option value="Kelas 9">Kelas 9 SMP</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop File Zone */}
            <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-8 text-center bg-indigo-50/20 dark:bg-indigo-950/20 hover:border-indigo-500 transition-colors">
              <input
                ref={docFileInputRef}
                type="file"
                accept=".docx, .doc, .pdf, .txt"
                onChange={handleDocFileSelect}
                className="hidden"
                id="doc-file-input"
              />
              <label
                htmlFor="doc-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {uploadFile ? `File Dipilih: ${uploadFile.name}` : 'Klik untuk Memilih File Word (.docx) atau PDF (.pdf)'}
                </div>
                <div className="text-xs text-slate-400">
                  Mendukung .docx, .doc, .pdf, dan .txt
                </div>
              </label>
            </div>

            {isConverting && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-bold">Sedang mengonversi dan memproses butir-butir soal dari file...</span>
              </div>
            )}
          </div>

          {/* Converted Questions Preview & Save Action */}
          {convertedQuestions.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    Daftar Soal Hasil Konversi ({convertedQuestions.length} Butir)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kunci jawaban telah dicetak tebal.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveQuestionsToBank}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Soal</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePublishAsExamCode}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Terbitkan sebagai Kode Ujian</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportWord}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPDF}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak / PDF</span>
                  </button>
                </div>
              </div>

              {/* Questions List with Bold Answer Key */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {convertedQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-blue-600">Nomor {idx + 1}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-semibold text-[10px]">
                          {q.difficulty}
                        </span>
                      </div>
                    </div>

                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {q.questionText}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => {
                        const isCorrect = q.correctAnswer === key;
                        return (
                          <div
                            key={key}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-black ring-1 ring-emerald-500'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>
                              <strong>{key}.</strong> {q.options[key]}
                            </span>
                            {isCorrect && (
                              <span className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900">
                                Kunci Jawaban
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 text-[11px] text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-blue-900/40">
                      <strong>Pembahasan:</strong> {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: KELOLA KODE UJIAN ================= */}
      {activeTab === 'exam_codes' && (
        <div className="space-y-6">
          {codeSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">{codeSuccessMsg}</span>
              </div>
              <button
                onClick={() => setCodeSuccessMsg('')}
                className="text-emerald-600 hover:text-emerald-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Form Create Exam Code */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              Buat Kode Ujian CBT Baru
            </h3>
            <p className="text-xs text-slate-400">
              Siswa cukup memasukkan kode ini pada halaman masuk untuk langsung masuk ke sesi ujiannya.
            </p>

            <form onSubmit={handleCreateExamCode} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Kode Ujian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value.toUpperCase())}
                    placeholder="Contoh: MAT8-UTS"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-blue-600 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Mata Pelajaran</label>
                  <select
                    value={newCodeSubject}
                    onChange={(e) => setNewCodeSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Tingkat Kelas</label>
                  <select
                    value={newCodeGrade}
                    onChange={(e) => setNewCodeGrade(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="Kelas 7">Kelas 7</option>
                    <option value="Kelas 8">Kelas 8</option>
                    <option value="Kelas 9">Kelas 9</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Judul / Deskripsi Sesi Ujian</label>
                <input
                  type="text"
                  required
                  value={newCodeTitle}
                  onChange={(e) => setNewCodeTitle(e.target.value)}
                  placeholder="Misal: Penilaian Harian Matematika (Sistem Aljabar)"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Alokasi Waktu (Menit)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={newCodeDuration}
                    onChange={(e) => setNewCodeDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Batas KKM (Poin)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={newCodeKKM}
                    onChange={(e) => setNewCodeKKM(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                + Simpan & Aktifkan Kode Ujian
              </button>
            </form>
          </div>

          {/* List of Active Exam Codes */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Daftar Kode Ujian Siswa ({examCodes.length})</span>
              <span className="text-xs text-slate-400 font-normal">Sinkronisasi Cloud Real-time</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {examCodes.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-lg bg-blue-600 text-white">
                      {c.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteExamCode(c.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Hapus Kode Ujian"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {c.title}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                    <span>Mapel: <strong>{c.subjectName}</strong></span>
                    <span>Tingkat: <strong>{c.grade}</strong></span>
                    <span>Durasi: <strong>{c.durationMinutes} m</strong></span>
                    <span>KKM: <strong>{c.kkm}</strong></span>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                    Dibuat oleh: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.createdByName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: BANK SOAL CBT ================= */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Daftar Butir Soal Terdaftar ({questions.length} Soal)
              </h3>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
              {questions.map((q, idx) => (
                <div key={q.id || idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">No. {idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">
                        {q.subjectName} ({q.grade})
                      </span>
                      <span className="font-bold text-emerald-600 text-xs">
                        Kunci: {q.correctAnswer}
                      </span>
                    </div>
                    {q.id.startsWith('q-') && (
                      <button
                        type="button"
                        onClick={() => onDeleteQuestion(q.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                        title="Hapus Soal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {q.questionText}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Answer Sheet Modal for Specific Student */}
      {selectedResultForDetail && (
        <StudentAnswerSheetModal
          result={selectedResultForDetail}
          onClose={() => setSelectedResultForDetail(null)}
        />
      )}
    </div>
  );
};
