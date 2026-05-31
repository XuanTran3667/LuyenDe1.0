import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, CheckCircle, AlertCircle, Clock, Sparkles, Star, 
  HelpCircle, Eye, ChevronRight, ArrowLeft, RefreshCw, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Exam, ExamAttempt } from '../types';
import { MathText } from './MathRenderer';
import { areMathValuesEquivalent } from '../utils/mathHelper';

interface ResultPanelProps {
  exam: Exam;
  attempt: ExamAttempt;
  onRestart: () => void;
  onBackToCatalog: () => void;
}

export default function ResultPanel({ exam, attempt, onRestart, onBackToCatalog }: ResultPanelProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');
  
  // Scoring Rules Engine reporting states
  const [activeRule, setActiveRule] = useState<any>(null);

  useEffect(() => {
    const fetchAppliedRule = async () => {
      try {
        const res = await fetch('/api/scoring-rules');
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const applied = json.data.find((r: any) => r.id === attempt.scoringRulesId) 
              || json.data.find((r: any) => r.isActive) 
              || json.data[0];
            setActiveRule(applied);
          }
        }
      } catch (err) {
        console.warn('Failed to retrieve grading stats rule in output.', err);
      }
    };
    fetchAppliedRule();
  }, [attempt.scoringRulesId]);

  const correctCount = attempt.correctAnswersCount;
  const totalQuestions = attempt.totalQuestions;
  const incorrectCount = totalQuestions - correctCount;
  const score = attempt.score;

  // Format timeSpentSeconds
  const formatTimeSpent = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rmSecs = secs % 60;
    return `${mins} phút ${rmSecs} giây`;
  };

  // Score feedback message helper
  const getScoreMessage = (val: number) => {
    if (val === 10) return { title: 'Thủ hoa tuyệt đỉnh! 🎉🏆', desc: 'Sự hoàn hảo tuyệt đối. Bạn đã chinh phục đề thi này với mức điểm cao nhất có thể.' };
    if (val >= 9.0) return { title: 'Học bá xuất sắc! 🌟', desc: 'Phong độ đỉnh cao. Chúc mừng bạn đã phá vỡ mốc ranh giới của học sinh giỏi.' };
    if (val >= 8.0) return { title: 'Phong độ rất tốt! 🥈', desc: 'Có nền tảng lí thuyết vững vàng. Khắc phục vài vết rạn nứt nhỏ bạn sẽ đạt mốc điểm tuyệt đối.' };
    if (val >= 5.0) return { title: 'Cố gắng lên nhé! 👍', desc: 'Nở nụ cười và học tiếp thôi. Hãy đọc kĩ những câu trả lời sai để rèn luyện tư duy.' };
    return { title: 'Cần nỗ lực ôn tập! 📝', desc: 'Không sao cả, đây chỉ là thử nghiệm để rèn luyện ý chí thôi mà! Thử sức lại hoặc xem phần lời giải chi tiết kĩ nhé.' };
  };

  const currentFeedback = getScoreMessage(score);

  // AI custom prompt for deep results evaluation
  const handleRequestAiDetail = async () => {
    setAiLoading(true);
    try {
      const wrongQuestionsList = exam.questions
        .filter(q => attempt.answers[q.id] !== q.answer)
        .map(q => `- Câu ${q.order}: Bạn chọn [${attempt.answers[q.id] || 'Chưa làm'}], Đáp án đúng [${q.answer}]. Chuyên đề: [${q.topic}]`)
        .join('\n');

      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          history: [{
            examTitle: exam.title,
            subject: exam.subject,
            score: attempt.score,
            mode: attempt.mode
          }],
          targetScore: 9.0,
          // Feed custom logs of wrong tags for precise diagnosis
          targetUniversity: `Hệ thống sai lệch ở các câu:\n${wrongQuestionsList}`
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      const data = await res.json();
      if (data && data.success) {
        setAiAnalysisResult(data.recommendation);
      } else {
        setAiAnalysisResult('Hệ thống AI đang thắt nghẽn đường truyền. Hãy nhấp lại sau nhé!');
      }
    } catch (e: any) {
      console.error('[LOGGER] Result recommendation failed:', e.message || e);
      setAiAnalysisResult('Hệ thống AI đang bận điều phối bài thi thử. Thử lại sau nhé!');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6">
      {/* Back button row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToCatalog}
          className="text-slate-400 hover:text-white transition-all text-sm font-medium flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại thư viện đề
        </button>
        <span className="text-slate-500 font-mono text-xs">Cảm ơn bạn đã đồng hành cùng Luyện Thi THPT QG 2026</span>
      </div>

      {/* Main Score Board Screen (Bento structures) */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* KPI Score card */}
        <div className="md:col-span-1 glass-panel bg-gradient-to-b from-blue-950/20 to-slate-900 rounded-2xl p-6 text-center space-y-6 flex flex-col justify-center border-blue-900/20">
          <div className="space-y-1">
            <span className="text-xs font-mono text-blue-400 uppercase tracking-widest block">Điểm số đạt được</span>
            <p className="text-6xl font-black font-display text-white tracking-tight">
              {score.toFixed(1)} <span className="text-xl text-slate-500">/10</span>
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-lg font-bold text-blue-300 font-display">{currentFeedback.title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-light px-2">
              {currentFeedback.desc}
            </p>
          </div>

          {/* Sub counters */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/60 font-mono text-xs">
            <div className="flex flex-col items-center p-2 bg-green-500/5 rounded-xl border border-green-500/10">
              <span className="text-xs text-green-400 font-bold">{correctCount}</span>
              <span className="text-[10px] text-slate-500">Câu Đúng</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-red-500/5 rounded-xl border border-red-500/10">
              <span className="text-xs text-red-400 font-bold">{incorrectCount}</span>
              <span className="text-[10px] text-slate-500">Câu Sai</span>
            </div>
          </div>
          
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400 font-mono bg-slate-950/50 py-2.5 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Thời gian giải: <b>{formatTimeSpent(attempt.timeSpentSeconds)}</b></span>
          </div>
        </div>

        {/* AI Actionable recommendation widget */}
        <div className="md:col-span-2 glass-panel bg-gradient-to-b from-indigo-950/10 to-slate-900/60 rounded-2xl p-6 flex flex-col justify-between border-indigo-900/10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded-full font-mono font-bold tracking-widest flex items-center gap-1.5 uppercase">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Bắt bệnh đề thi thử
              </div>
            </div>
            <h3 className="text-xl font-bold font-display text-white">Chẩn Đoán Điểm Yếu Bài Làm Với AI</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              AI sẽ khảo sát chi tiết các câu làm sai của bài thi này để tìm ra mẫu số chung (lỗi hổng lý thuyết, do tính toán, hay do từ vựng), từ đó đưa ra lời khuyên sửa sai ngay tức khắc.
            </p>
          </div>

          <div className="flex-1 min-h-[160px] bg-slate-950/60 border border-slate-900 rounded-xl p-4 overflow-y-auto max-h-[220px] my-4">
            {aiLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
                <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" strokeWidth={3} />
                <p className="font-mono text-slate-400 text-center animate-pulse">Gemini đang đối chất lời giải và giải nghĩa logic lỗ hổng học thuật...</p>
              </div>
            ) : aiAnalysisResult ? (
              <div className="text-slate-300 text-xs space-y-2 leading-relaxed whitespace-pre-line prose prose-invert font-light">
                {aiAnalysisResult}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1 opacity-70 text-center py-6">
                <p className="font-medium text-slate-400 text-sm">Chưa có đánh giá bài giải hiện tại</p>
                <p className="text-[10px]">Bấm nút kiểm định thông thái phía dưới để bắt đầu</p>
              </div>
            )}
          </div>

          <button
            onClick={handleRequestAiDetail}
            disabled={aiLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-display font-semibold transition-all rounded-xl text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            PHÂN TÍCH CHUYÊN SÂU LỖI SAI CỦA TÔI
          </button>
        </div>
      </div>

      {/* DETAILED MOET-FORMAT SECTION BREAKDOWN PANEL */}
      <div className="glass-panel bg-gradient-to-r from-slate-900 to-slate-950/80 rounded-2xl p-6 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5.5 h-5.5" />
            </div>
            <div>
              <h4 className="font-bold text-base text-white font-display">Phân tích Kết cấu Điểm số & Quy chế Bộ GD&ĐT</h4>
              <p className="text-xs text-slate-400 font-sans">
                Kết quả chuyển đổi sang thang điểm 10.0 cho từng cấu phần đề thi quốc gia.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
            <span className="text-xs font-mono text-slate-300">
              Quy chế: <b>{activeRule ? activeRule.name : 'Đề tốt nghiệp THPT chuẩn (2025/2026)'}</b>
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {/* Section 1 */}
          <div className="p-4 bg-slate-950/45 border border-slate-900 rounded-2xl space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-450 tracking-wider">Phần I</span>
                <h5 className="font-bold text-sm text-slate-200 mt-0.5">Trắc nghiệm 4 lựa chọn</h5>
              </div>
              <p className="text-xl font-black font-mono text-indigo-400">
                {attempt.part1Score !== undefined ? `${attempt.part1Score.toFixed(1)}` : '0.0'} <span className="text-xs text-slate-500">/10</span>
              </p>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                style={{ width: `${attempt.part1Score ?? 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
              Trác nghiệm chuẩn đơn lựa chọn (A, B, C, D). Hành vi: đúng mỗi câu +{activeRule?.multipleChoicePoints ?? 0.25}đ cho điểm tổng raw.
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-4 bg-slate-950/45 border border-slate-900 rounded-2xl space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-450 tracking-wider">Phần II</span>
                <h5 className="font-bold text-sm text-slate-200 mt-0.5">Một câu Đúng/Sai</h5>
              </div>
              <p className="text-xl font-black font-mono text-emerald-400">
                {attempt.part2Score !== undefined ? `${attempt.part2Score.toFixed(1)}` : '0.0'} <span className="text-xs text-slate-500">/10</span>
              </p>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${attempt.part2Score ?? 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
              Hài hòa Đúng/Sai cộng dồn lũy tiến 4 nhận định: 1ý=0.1đ; 2ý=0.25đ; 3ý=0.5đ; 4ý=1.0đ.
            </p>
          </div>

          {/* Section 3 */}
          <div className="p-4 bg-slate-950/45 border border-slate-900 rounded-2xl space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-450 tracking-wider">Phần III</span>
                <h5 className="font-bold text-sm text-slate-200 mt-0.5">Câu hỏi Trả lời ngắn</h5>
              </div>
              <p className="text-xl font-black font-mono text-pink-400">
                {attempt.part3Score !== undefined ? `${attempt.part3Score.toFixed(1)}` : '0.0'} <span className="text-xs text-slate-500">/10</span>
              </p>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500 rounded-full transition-all duration-500" 
                style={{ width: `${attempt.part3Score ?? 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
              Khảo sát tự luận ngắn / tính toán chính xác. Hành vi: đúng mỗi câu +{activeRule?.shortAnswerPoints ?? 0.5}đ cho điểm raw.
            </p>
          </div>
        </div>
      </div>

      {/* Options to redo or advance */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
        <button
          onClick={onRestart}
          className="w-full sm:w-auto px-6 py-3 font-display font-semibold border border-slate-800 rounded-xl hover:bg-slate-900 hover:border-slate-700 text-slate-300 transition-all text-xs tracking-wide cursor-pointer flex items-center justify-center gap-2"
        >
          LAM LẠI ĐỀ NÀY 🔁
        </button>
        <button
          onClick={onBackToCatalog}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 font-display font-semibold text-white transition-all rounded-xl text-xs tracking-wide cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
        >
          TIẾP TỤC LUYỆN ĐỀ KHÁC <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Comprehensive Mistakes Review Area */}
      <div className="space-y-6 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between pb-2 border-b border-slate-900">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold font-display text-white">Khảo Sát Đáp Án Chi Tiết Tất Cả Các Câu</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Xếp theo thứ tự từ câu 1</span>
        </div>

        <div className="space-y-6">
          {exam.questions.map(q => {
            const userChoice = attempt.answers[q.id];
            let isCorrect = false;
            let statementsCorrect = 0;
            if (q.type === 'true_false') {
              q.statements?.forEach(st => {
                if (userChoice && typeof userChoice === 'object' && userChoice[st.id] === st.answer) {
                  statementsCorrect += 1;
                }
              });
              isCorrect = statementsCorrect === 4;
            } else if (q.type === 'short_answer') {
              isCorrect = areMathValuesEquivalent(userChoice as string, q.shortAnswer || '');
            } else {
              isCorrect = userChoice === q.answer;
            }
            const isStarred = attempt.starredQuestions.includes(q.id);

            return (
              <div 
                key={q.id}
                className={`glass-panel rounded-2xl p-6 border-l-4 space-y-4 ${
                  isCorrect 
                    ? 'border-l-green-500 border-slate-900/60' 
                    : (q.type === 'true_false' ? (statementsCorrect > 0 ? 'border-l-amber-500 border-slate-900/60' : 'border-l-red-500 border-slate-900/60') : (userChoice === '' ? 'border-l-slate-600 border-slate-900/60' : 'border-l-red-500 border-slate-900/60'))
                }`}
              >
                {/* Question metadata indicators */}
                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-300">Câu {q.order}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 font-medium">Chuyên đề: {q.topic}</span>
                    {q.type === 'true_false' && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                          Đúng/Sai THPT
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isStarred && (
                      <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                        <Star className="w-3 h-3 fill-amber-500" /> Cần Xem Kĩ
                      </span>
                    )}

                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase font-mono tracking-widest ${
                      isCorrect 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : (q.type === 'true_false' && statementsCorrect > 0)
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : userChoice === '' || (q.type === 'true_false' && Object.values(userChoice || {}).every(v => v === ''))
                        ? 'bg-slate-800 text-slate-500 border border-slate-700/50'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {isCorrect 
                        ? 'ĐÚNG' 
                        : (q.type === 'true_false' && statementsCorrect > 0)
                        ? `ĐÚNG ${statementsCorrect}/4 Ý`
                        : userChoice === '' || (q.type === 'true_false' && Object.values(userChoice || {}).every(v => v === ''))
                        ? 'CHƯA LÀM' 
                        : 'SAI'}
                    </span>
                  </div>
                </div>

                {/* Text */}
                <p className="text-sm text-slate-200 leading-relaxed font-semibold">
                  <MathText text={q.text} />
                </p>

                {/* Selected Options state checks */}
                {q.type === 'true_false' ? (
                  /* Render detailed statement true_false results */
                  <div className="space-y-3.5 pt-2">
                    <div className="grid gap-3">
                      {q.statements?.map(st => {
                        const statementUserVal = userChoice?.[st.id] || '';
                        const stCorrect = statementUserVal === st.answer;

                        return (
                          <div 
                            key={st.id} 
                            className={`p-4 border rounded-xl font-sans text-xs space-y-2.5 ${
                              stCorrect 
                                ? 'border-green-500/25 bg-green-500/5 text-slate-200' 
                                : 'border-red-500/25 bg-red-500/5 text-slate-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className={`w-5 h-5 rounded text-[10px] font-bold border flex items-center justify-center shrink-0 uppercase ${
                                  stCorrect 
                                    ? 'bg-green-500/20 border-green-500/40 text-green-300' 
                                    : 'bg-red-500/20 border-red-500/40 text-red-300'
                                }`}>
                                  {st.id}
                                </span>
                                <div className="space-y-2">
                                  <span className="leading-relaxed font-medium"><MathText text={st.text} /></span>
                                  {st.image && (
                                    <img src={st.image} alt={`Statement ${st.id}`} className="max-h-[100px] rounded-lg mt-1 block object-contain bg-slate-900 border border-slate-850" referrerPolicy="no-referrer" />
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-[10px] shrink-0 font-mono self-end sm:self-center bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-900">
                                <span>Bạn chọn: <strong className={stCorrect ? 'text-green-400' : 'text-red-400'}>{statementUserVal === 'T' ? 'Đúng' : statementUserVal === 'F' ? 'Sai' : 'Chưa chọn'}</strong></span>
                                <span className="text-slate-800">|</span>
                                <span>Đáp án gốc: <strong className="text-indigo-400">{st.answer === 'T' ? 'Đúng' : 'Sai'}</strong></span>
                              </div>
                            </div>

                            {/* Detailed explanation per statement */}
                            {st.explanation && (
                              <div className="pl-7 text-[11px] text-slate-400 italic font-light leading-relaxed border-t border-slate-800/40 pt-2 mt-1">
                                <strong>Ý {st.id.toUpperCase()} giải thích:</strong> <MathText text={st.explanation} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : q.type === 'short_answer' ? (
                  /* Render detailed short answer display */
                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Đáp án bạn nhập:</span>
                        <div className={`text-sm font-bold font-mono px-4 py-2 rounded-xl border flex items-center justify-between ${
                          isCorrect 
                            ? 'bg-green-500/5 border-green-500/20 text-green-300' 
                            : userChoice === '' 
                            ? 'bg-slate-950 border-slate-900 text-slate-500' 
                            : 'bg-red-500/5 border-red-500/20 text-red-300'
                        }`}>
                          <span>{userChoice || '(Trống / Chưa trả lời)'}</span>
                          {userChoice && (
                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md ${
                              isCorrect ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {isCorrect ? 'ĐÚNG' : 'SAI'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Đáp án chính xác:</span>
                        <div className="text-sm font-bold font-mono bg-green-500/10 border border-green-500/25 text-green-450 px-4 py-2 rounded-xl flex items-center gap-1.5">
                          <MathText text={q.shortAnswer || ''} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard 4-option question layout */
                  <div className="grid sm:grid-cols-2 gap-2.5 pt-2">
                    {(['A', 'B', 'C', 'D'] as const).map(letter => {
                      const text = q.options ? q.options[letter] : '';
                      const isUserPick = userChoice === letter;
                      const isKey = q.answer === letter;

                      let pillStyles = 'border-slate-900 bg-slate-950 text-slate-400 opacity-70';
                      if (isKey) {
                        pillStyles = 'border-green-500/50 bg-green-500/10 text-green-300 font-medium';
                      } else if (isUserPick) {
                        pillStyles = 'border-red-500/40 bg-red-500/10 text-red-300 font-medium';
                      }

                      return (
                        <div 
                          key={letter}
                          className={`p-3 border rounded-xl font-sans text-xs flex items-center justify-between ${pillStyles}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded text-[10px] font-bold border flex items-center justify-center shrink-0 ${
                              isKey 
                                ? 'bg-green-500/30 border-green-500/40 text-green-200' 
                                : isUserPick 
                                ? 'bg-red-500/30 border-red-500/40 text-red-200'
                                : 'border-slate-800'
                            }`}>
                              {letter}
                            </span>
                            <div className="space-y-1">
                              <span><MathText text={text} /></span>
                              {q.optionsImages?.[letter] && (
                                <img src={q.optionsImages[letter]} alt={`Option ${letter}`} className="max-h-[100px] rounded-lg mt-1 block object-contain bg-slate-905 p-0.5 border border-slate-800" referrerPolicy="no-referrer" />
                              )}
                            </div>
                          </div>
                          {isKey && (
                            <span className="text-[9px] uppercase font-bold font-mono tracking-wider text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-md">Đáp án chính xác</span>
                          )}
                          {isUserPick && !isCorrect && (
                            <span className="text-[9px] uppercase font-bold font-mono tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-md">Phương án bạn chọn</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explanation container */}
                <div className="p-4 bg-slate-950/80 border border-slate-900 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-blue-400 font-mono uppercase font-bold tracking-widest">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span>Lời giải gốc chi tiết:</span>
                  </div>
                  <div className="text-xs text-slate-300 font-light leading-relaxed space-y-3">
                    <MathText text={q.explanation} />
                    {q.explanationImage && (
                      <img src={q.explanationImage} alt="Explanation Graphic" className="max-h-[140px] rounded-lg mt-1 block object-contain bg-slate-900 border border-slate-800" referrerPolicy="no-referrer" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
