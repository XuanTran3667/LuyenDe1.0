/**
 * Core Types for Nền Tảng Luyện Thi THPT QG 2026
 */

export type Subject = 'Toán' | 'Vật lý' | 'Hóa học' | 'Tiếng Anh' | 'Sinh học' | 'Lịch sử' | 'Địa lý' | 'GDCD';

export type Difficulty = 'Dễ' | 'Trung bình' | 'Khó' | 'Cực khó';

export interface StatementTF {
  id: string; // 'a' | 'b' | 'c' | 'd'
  text: string;
  answer: 'T' | 'F'; // T = Đúng, F = Sai
  explanation?: string;
  correctCount?: number; // statistic support
  totalCount?: number;   // statistic support
  image?: string;
}

export interface Question {
  id: string;
  order: number;
  text: string;
  image?: string;
  type?: 'multiple_choice' | 'true_false' | 'short_answer'; // default is multiple_choice if empty
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  optionsImages?: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
  };
  answer?: 'A' | 'B' | 'C' | 'D';
  statements?: StatementTF[]; // Used for true_false questions
  shortAnswer?: string; // Correct response text for short answer questions
  scoringMethod?: 'partial' | 'all_or_nothing'; // 'partial' = points per statement, 'all_or_nothing' = full points only if all 4 statements are correct
  explanation: string;
  explanationImage?: string;
  topic: string;
  partIndex?: number; // Part I, Part II, Part III of the Ministry structure
}

export interface ScoringRule {
  id: string;
  name: string;
  academicYear: number;
  subject: Subject | 'Chung';
  examType: 'THPT_QG' | 'DGNL' | 'Free';
  isActive: boolean;
  multipleChoicePoints: number; // point for a correct multiple choice
  shortAnswerPoints: number; // point for a correct short answer
  trueFalsePoints: {
    1: number; // points for 1 statement correct
    2: number; // points for 2 statements correct
    3: number; // points for 3 statements correct
    4: number; // points for 4 statements correct
  };
  description?: string;
}

export interface ExamStructure {
  part1Count: number; // Point weight per item usually hard-referenced or derived from rule
  part2Count: number;
  part3Count: number;
  totalPointsScale: number; // standard: 10
}

export interface Exam {
  id: string;
  title: string;
  year: number;
  subject: Subject;
  difficulty: Difficulty;
  duration: number; // in minutes
  questions: Question[];
  tags: string[];
  pdfUrl?: string;
  attemptCount: number;
  createdAt: string;
  
  // Ministry structure additions
  totalQuestions?: number;
  academicYear?: number;
  scoringRulesId?: string; // active linked scoring rule ID
  examStructure?: ExamStructure;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  subject: Subject;
  score: number; // Point scale over 10 (e.g. 8.5)
  totalQuestions: number;
  correctAnswersCount: number;
  timeSpentSeconds: number;
  mode: 'focus' | 'chill';
  answers: { [questionId: string]: 'A' | 'B' | 'C' | 'D' | '' | { [statementId: string]: 'T' | 'F' | '' } | string };
  starredQuestions: string[]; // Set of marked review questions
  createdAt: string;
  aiAnalysis?: string; // AI generated specific advice for the attempt
  
  // Breakdown of sections
  part1Score?: number;
  part2Score?: number;
  part3Score?: number;
  scoringRulesId?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  requirement: string;
  unlockedAt?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  role: 'user' | 'admin';
  streak: number;
  lastActiveDate?: string;
  history: ExamAttempt[];
  targetScore: number;
  targetUniversity?: string;
  targetMajor?: string;
}

export interface AIRecommendation {
  suggestedExamIds: string[];
  weakTopics: { topic: string; subject: Subject; incorrectCount: number; tip: string }[];
  studyPlan: string;
}
