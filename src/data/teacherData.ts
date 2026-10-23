import { ExamCode, TeacherProfile } from '../types/quiz.ts';

export const REGISTERED_TEACHERS: TeacherProfile[] = [
  {
    id: 't-1',
    name: 'Amir Yusuf S.Kom',
    niy: '19901101201501',
    email: 'amir77@gmail.com',
    password: '123',
    subject: 'Teknologi Informasi',
    schoolName: 'SMP Negeri 1 Nusantara',
  },
  {
    id: 't-1a',
    name: 'Bambang Suryono, S.Pd.',
    niy: '19850412201001',
    subject: 'Matematika SMP',
    schoolName: 'SMP Negeri 1 Nusantara',
  },
  {
    id: 't-2',
    name: 'Dr. Endah Retnowati, M.Pd.',
    niy: '19880924201202',
    subject: 'IPA Terpadu SMP',
    schoolName: 'SMP Negeri 1 Nusantara',
  },
  {
    id: 't-3',
    name: 'Nurul Hidayati, S.S.',
    niy: '19920115201503',
    subject: 'Bahasa Indonesia SMP',
    schoolName: 'SMP Negeri 1 Nusantara',
  },
  {
    id: 't-4',
    name: 'David Prasetyo, M.Hum.',
    niy: '19900318201404',
    subject: 'Bahasa Inggris SMP',
    schoolName: 'SMP Negeri 1 Nusantara',
  },
  {
    id: 't-5',
    name: 'Drs. Slamet Riyadi',
    niy: '19790610200805',
    subject: 'IPS Terpadu SMP',
    schoolName: 'SMP Negeri 1 Nusantara',
  },
  {
    id: 't-6',
    name: 'Wahyuni Kartika, S.Pd.',
    niy: '19940522201806',
    subject: 'PPKn SMP',
    schoolName: 'SMP Negeri 1 Nusantara',
  },
];

export const INITIAL_EXAM_CODES: ExamCode[] = [];
