import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Search, BookOpen, Clock, Tag, ChevronRight, HelpCircle, 
  ExternalLink, Download, FileText, Zap, Music, Calendar
} from 'lucide-react';
import { Exam, Subject, Difficulty } from '../types';

interface CatalogProps {
  exams: Exam[];
  onSelectExamMode: (examId: string, mode: 'focus' | 'chill') => void;
  onUploadExamClick: () => void;
}

const ALL_SUBJECTS: (Subject | 'Tất cả')[] = ['Tất cả', 'Toán', 'Vật lý', 'Hóa học', 'Tiếng Anh', 'Sinh học', 'Lịch sử', 'Địa lý'];
const ALL_DIFFICULTIES: (Difficulty | 'Tất cả')[] = ['Tất cả', 'Dễ', 'Trung bình', 'Khó', 'Cực khó'];

export default function Catalog({ exams, onSelectExamMode, onUploadExamClick }: CatalogProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'Tất cả'>('Tất cả');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'Tất cả'>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('Tất cả');

  // Available unique years in list
  const availableYears = useMemo(() => {
    const years = new Set(exams.map(e => String(e.year)));
    return ['Tất cả', ...Array.from(years)];
  }, [exams]);

  // Filter logic
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchSubject = selectedSubject === 'Tất cả' || exam.subject === selectedSubject;
      const matchDifficulty = selectedDifficulty === 'Tất cả' || exam.difficulty === selectedDifficulty;
      const matchYear = selectedYear === 'Tất cả' || String(exam.year) === selectedYear;
      const matchSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          exam.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSubject && matchDifficulty && matchYear && matchSearch;
    });
  }, [exams, selectedSubject, selectedDifficulty, selectedYear, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 text-slate-800">
      {/* Search and Title row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-950">Thư Viện Đề Thi Thử QG 2026</h2>
          <p className="text-slate-600 text-sm mt-1">Luyện tập thông minh, vượt qua giới hạn của bản thân.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onUploadExamClick}
            className="text-xs font-display font-semibold tracking-wider bg-indigo-50 text-[#4F46E5] border border-indigo-250 hover:bg-indigo-100 rounded-xl px-4 py-2.5 transition-all text-center flex items-center gap-1.5 cursor-pointer"
          >
            TỰ TẢI ĐỀ THI GỐC (PDF)
          </button>
        </div>
      </div>

      {/* Filter and Search Box panel */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4 bg-white border border-slate-200">
        <div className="grid sm:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Tìm kiếm môn học, tựa đề, dạng chuyên đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/60 transition-all rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>

          {/* Difficulty selector */}
          <div>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/60 transition-all rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option disabled>Chọn mức độ</option>
              {ALL_DIFFICULTIES.map(diff => (
                <option key={diff} value={diff}>Mức độ: {diff}</option>
              ))}
            </select>
          </div>

          {/* Year selector */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/60 transition-all rounded-xl px-4 py-2.5 text-sm text-slate-705 outline-none"
            >
              <option disabled>Chọn năm học</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year === 'Tất cả' ? 'Năm thi: Tất cả' : `Năm thi: ${year}`}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Subjects horizontal quick pills scroll */}
        <div className="border-t border-slate-200 pt-4 flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs uppercase font-mono font-bold tracking-widest text-slate-455 shrink-0">Môn học:</span>
          <div className="flex items-center gap-1.5 pl-2">
            {ALL_SUBJECTS.map(subj => {
              const isActive = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all border shrink-0 ${
                    isActive 
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/15' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {subj}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid List displaying exams */}
      {filteredExams.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6 pb-12">
          {filteredExams.map(exam => {
            // Difficulty color helper
            const diffColor = 
              exam.difficulty === 'Dễ' ? 'text-emerald-700 border-emerald-500/20 bg-emerald-50' :
              exam.difficulty === 'Trung bình' ? 'text-indigo-600 border-indigo-500/20 bg-indigo-50' :
              exam.difficulty === 'Khó' ? 'text-amber-700 border-amber-500/20 bg-amber-50' :
              'text-rose-600 border-rose-500/20 bg-rose-50';

            return (
              <motion.div
                key={exam.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel flex flex-col justify-between rounded-2xl p-6 hover:border-indigo-400 hover:scale-[1.005] hover:shadow-md transition-all group relative border-slate-200 bg-white"
              >
                {/* Subject Corner tag */}
                <div className="absolute top-4 right-4 text-slate-500 uppercase tracking-widest text-[9px] font-mono border border-slate-200 px-2.5 py-0.5 rounded-full bg-slate-50">
                  {exam.subject}
                </div>

                <div className="space-y-4">
                  {/* General Stats Block */}
                  <div className="flex items-center gap-2.5 text-xs font-mono">
                    <span className={`px-2 py-0.5 border rounded-full font-bold uppercase tracking-wider text-[9px] ${diffColor}`}>
                      {exam.difficulty}
                    </span>
                    <span className="text-slate-450 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {exam.year}
                    </span>
                    <span className="text-slate-350">•</span>
                    <span className="text-slate-550 font-medium">Lượt làm: {exam.attemptCount}</span>
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold font-display text-slate-900 group-hover:text-indigo-650 transition-colors leading-snug">
                      {exam.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {exam.duration} Phút
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {exam.questions.length} Câu hỏi
                      </span>
                    </div>
                  </div>

                  {/* Subtopics Tags list */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {exam.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-[10px] font-mono font-medium text-slate-550 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Simulated file PDF or other things */}
                <div className="flex items-center justify-between border-t border-slate-200 mt-6 pt-4">
                  <a
                    href="https://vietnamnet.vn/vn/giao-duc/tuyen-sinh/de-thi-tot-nghiep-thpt-mon-toan-nam-2024-va-dap-an-tu-cac-nam-truoc-thi-thu-viet-namnet.pdf"
                    target="_blank"
                    rel="referrer nofollow"
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Đề gốc (PDF) <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>

                  {/* Start testing dynamic modes toggler */}
                  <div className="flex items-center gap-2">
                    {/* Chill launcher */}
                    <button
                      title="Làm bài thảnh thơi có nhạc và trợ giảng mascot"
                      onClick={() => onSelectExamMode(exam.id, 'chill')}
                      className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-teal-500/10 hover:border-teal-500/20 hover:text-teal-600 text-teal-600 transition-all flex items-center justify-center cursor-pointer"
                    >
                      <Music className="w-4 h-4 mr-1.5" />
                      <span className="text-[11px] font-display font-black uppercase tracking-wider hidden sm:block">CHILL</span>
                    </button>

                    {/* Focus launcher */}
                    <button
                      title="Chế độ phòng thi nghiêm túc khắt khe"
                      onClick={() => onSelectExamMode(exam.id, 'focus')}
                      className="px-4 py-2.5 border border-slate-255 rounded-xl bg-slate-50 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 text-rose-600 transition-all flex items-center justify-center cursor-pointer"
                    >
                      <Zap className="w-4 h-4 mr-1.5" />
                      <span className="text-[11px] font-display font-black uppercase tracking-wider">FOCUS</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center glass-panel rounded-2xl border-slate-200 border-dashed border bg-white">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto animate-bounce pb-2" />
          <p className="text-slate-700 font-display font-medium text-lg">Không tìm thấy Đề thi nào đạt yêu cầu lọc!</p>
          <p className="text-slate-500 text-sm mt-1">Chọn từ khóa khác hoặc xóa bớt tiêu chí lọc để tiếp tục.</p>
          <button
            onClick={() => {
              setSelectedSubject('Tất cả');
              setSelectedDifficulty('Tất cả');
              setSelectedYear('Tất cả');
              setSearchQuery('');
            }}
            className="mt-4 text-xs font-semibold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-200 cursor-pointer"
          >
            Reset bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
