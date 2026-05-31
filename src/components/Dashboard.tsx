import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Flame, Award, BookOpen, Star, Brain, ArrowRight, TrendingUp, Sparkles, 
  RefreshCw, ChevronRight, Zap, Target, HelpCircle, Trophy, BarChart3, Info
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { ExamAttempt, UserProfile, Exam } from '../types';
import { MathText } from './MathRenderer';

interface DashboardProps {
  profile: UserProfile;
  exams: Exam[];
  onSelectExam: (examId: string) => void;
  onNavigateToCatalog: () => void;
  onResetHistory: () => void;
}

export default function Dashboard({ profile, exams, onSelectExam, onNavigateToCatalog, onResetHistory }: DashboardProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string>('');

  // Calculate statistics
  const history = profile?.history || [];
  const streak = profile?.streak || 0;
  const totalAttempts = history.length;
  const averageScore = totalAttempts > 0 
    ? parseFloat((history.reduce((sum, item) => sum + item.score, 0) / totalAttempts).toFixed(2))
    : 0;

  // Track topic performance or subject performance
  const subjectScores: { [key: string]: { sum: number; count: number } } = {};
  history.forEach(attempt => {
    const subject = attempt.subject || 'Chung';
    if (!subjectScores[subject]) {
      subjectScores[subject] = { sum: 0, count: 0 };
    }
    subjectScores[subject].sum += attempt.score;
    subjectScores[subject].count += 1;
  });

  const subjectAverages = Object.keys(subjectScores).map(subject => ({
    subject,
    avg: parseFloat((subjectScores[subject].sum / subjectScores[subject].count).toFixed(2))
  }));

  // Identify strong and weak subjects
  let strongestSubject = 'Chưa xác định';
  let weakestSubject = 'Chưa xác định';
  if (subjectAverages.length > 0) {
    const sorted = [...subjectAverages].sort((a, b) => b.avg - a.avg);
    strongestSubject = `${sorted[0].subject} (${sorted[0].avg.toFixed(1)}/10)`;
    weakestSubject = sorted.length > 1 
      ? `${sorted[sorted.length - 1].subject} (${sorted[sorted.length - 1].avg.toFixed(1)}/10)`
      : 'Không có dữ liệu so sánh';
  }

  // Pre-configured achievements (Badges)
  const allBadges = [
    { id: 'b1', title: 'Khởi đầu vững chắc', desc: 'Hoàn thành đề thi thử THPT đầu tiên', icon: '🌱', unlocked: totalAttempts >= 1 },
    { id: 'b2', title: 'Sát thủ đếm ngược', desc: 'Đạt điểm >= 8.0 trong chế độ Focus Mode', icon: '⏱️', unlocked: history.some(h => h.mode === 'focus' && h.score >= 8.0) },
    { id: 'b3', title: 'Hòa âm lý tưởng', desc: 'Hoàn thành bài luyện tập Chill Mode có bật nhạc', icon: '🎧', unlocked: history.some(h => h.mode === 'chill') },
    { id: 'b4', title: 'Đỉnh cao trí tuệ', desc: 'Có ít nhất một đề thi đạt 10/10 điểm tuyệt đối', icon: '🏆', unlocked: history.some(h => h.score === 10) },
    { id: 'b5', title: 'Học bá kiên trì', desc: 'Có chuỗi duy trì học tập từ 3 ngày trở lên', icon: '🔥', unlocked: streak >= 3 },
  ];

  const unlockedCount = allBadges.filter(b => b.unlocked).length;

  // Recharts score progression data
  const chartData = history.map((attempt, index) => ({
    name: `Lần ${index + 1}`,
    'Điểm số': attempt.score,
    title: attempt.examTitle || 'Đề không tên',
    mode: attempt.mode === 'focus' ? 'Focus ⏱️' : 'Chill 🎧'
  }));

  // AI Advice requesting
  const fetchAiAdvice = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          history: history,
          targetScore: profile?.targetScore || 9.0,
          targetUniversity: profile?.targetUniversity || 'Trường mục tiêu',
          targetMajor: profile?.targetMajor || 'Ngành mục tiêu'
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      const data = await res.json();
      if (data && data.success) {
        setAiAdvice(data.recommendation);
      } else {
        setAiAdvice('Đang có chút gián đoạn kết nối AI. Hãy thử lại sau nhé!');
      }
    } catch (e: any) {
      console.error('[LOGGER] AI Recommendation Error:', e.message || e);
      setAiAdvice('Đang có chút gián đoạn kết nối AI. Hãy thử lại sau nhé!');
    } finally {
      setAiLoading(false);
    }
  };

  // Find dynamic recommended exam based on weakest subject or just general suggestions
  const getDynamicSuggestedExam = () => {
    if (exams.length === 0) return null;
    if (subjectAverages.length > 0) {
      const sorted = [...subjectAverages].sort((a, b) => a.avg - b.avg);
      const weakestSub = sorted[0].subject;
      const suggest = exams.find(ex => ex.subject === weakestSub && !history.some(h => h.examId === ex.id));
      if (suggest) return suggest;
    }
    // Default suggestion is any exam not taken yet
    const notTaken = exams.filter(ex => !profile.history.some(h => h.examId === ex.id));
    return notTaken.length > 0 ? notTaken[0] : exams[0];
  };

  const suggestedExam = getDynamicSuggestedExam();

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 font-sans text-slate-800">
      {/* Intro section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-950">Dashboard Học Tập Cá Nhân</h2>
          <p className="text-slate-650 text-sm mt-1">
            Chào mừng học sinh <span className="text-indigo-600 font-bold">{profile.name}</span>. Năm thi 2026 đang đến rất gần!
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalAttempts > 0 && (
            <button
              onClick={onResetHistory}
              className="text-xs bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-lg px-3 py-1.5 font-mono transition-all cursor-pointer"
            >
              Đặt lại tiến độ gốc
            </button>
          )}
          <button
            onClick={onNavigateToCatalog}
            className="text-xs bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-705 rounded-lg px-4 py-2 font-display font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Đến thư viện đề
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Target goals card banner */}
      <div className="glass-panel rounded-2xl p-6 grid sm:grid-cols-3 gap-6 relative overflow-hidden bg-white border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-indigo-500" /> Điểm số mục tiêu
          </span>
          <p className="text-2xl font-black font-display text-indigo-600">{profile.targetScore.toFixed(1)} / 10</p>
        </div>
        <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-6">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-pink-500" /> Ngành mong muốn
          </span>
          <p className="text-lg font-bold font-display text-slate-800 truncate">{profile.targetMajor || 'Chưa cập nhật'}</p>
        </div>
        <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-6">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> Trường Đại học hướng đến
          </span>
          <p className="text-base font-semibold text-slate-705 truncate" title={profile.targetUniversity}>
            {profile.targetUniversity || 'Chưa cập nhật'}
          </p>
        </div>
      </div>

      {/* Top Level KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Streak */}
        <div className="glass-panel hover:border-indigo-300 bg-white transition-all rounded-2xl p-5 flex items-center gap-4 relative border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-mono">Chuỗi Học Số</p>
            <p className="text-2xl font-black font-display text-orange-600">{streak} Ngày</p>
          </div>
        </div>

        {/* KPI 2: Total Exams */}
        <div className="glass-panel hover:border-indigo-300 bg-white transition-all rounded-2xl p-5 flex items-center gap-4 border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-mono">Đề Đã Luyện</p>
            <p className="text-2xl font-black font-display text-indigo-600">{totalAttempts} lượt</p>
          </div>
        </div>

        {/* KPI 3: Average Score */}
        <div className="glass-panel hover:border-indigo-300 bg-white transition-all rounded-2xl p-5 flex items-center gap-4 border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-mono">Điểm Trung Bình</p>
            <p className="text-2xl font-black font-display text-purple-600">
              {totalAttempts > 0 ? averageScore.toFixed(1) : '--'} <span className="text-xs font-normal text-slate-400">/10</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Achievements unlocks */}
        <div className="glass-panel hover:border-indigo-300 bg-white transition-all rounded-2xl p-5 flex items-center gap-4 border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Award className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-mono">Mở Khóa Huy Hiệu</p>
            <p className="text-2xl font-black font-display text-amber-600">
              {unlockedCount} <span className="text-xs font-normal text-slate-400">/{allBadges.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Stats Block & Graphic Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Dynamic Charts (Line Progress + Subject performance) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4 bg-white border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900">Biểu Đồ Tiến Trình Điểm Số</h3>
                <p className="text-xs text-slate-500">Khảo sát điểm qua các lượt thi để kiểm nghiệm tốc độ cải thiện kiến thức</p>
              </div>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>

            <div className="h-[250px] w-full pt-4">
              {totalAttempts > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontStyle="italic" />
                    <YAxis domain={[0, 10]} stroke="#64748b" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} 
                      labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="Điểm số" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-405 text-sm border border-dashed border-slate-200 bg-slate-50 rounded-xl space-y-2">
                  <BarChart3 className="w-8 h-8 text-slate-350 animate-pulse" />
                  <p>Hãy hoàn thành ít nhất một đề thi để khám phá biểu đồ!</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick analysis subject comparison & strength index */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass-panel rounded-xl p-5 space-y-2 bg-white border border-slate-200">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest block">Thần hộ mệnh (Môn mạnh nhất)</span>
              <p className="text-xl font-bold font-display text-emerald-700 flex items-center gap-1.5">
                <span className="text-lg">🛡️</span> {strongestSubject}
              </p>
              <p className="text-xs text-slate-550 font-light pt-1">
                Tuyệt vời, bạn đang nắm giữ thế thượng phong tại đây. Hãy tiếp tục giải đề khó để tích lũy phản xạ điểm 10.
              </p>
            </div>
            
            <div className="glass-panel rounded-xl p-5 space-y-2 bg-white border border-slate-200">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest block">Vùng trũng kiến thức (Môn yếu nhất)</span>
              <p className="text-xl font-bold font-display text-rose-600 flex items-center gap-1.5">
                <span className="text-lg">⚠️</span> {weakestSubject}
              </p>
              <p className="text-xs text-slate-550 font-light pt-1">
                Đừng nản chí! Đây là cơ hội vàng để AI gợi ý khoanh vùng ôn tập, biến điểm yếu thành bệ phóng bứt phá.
              </p>
            </div>
          </div>
        </div>

        {/* AI Recommendations Console (Real Integration with server prompt!) */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col space-y-6 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/25 border-indigo-200 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></div>
              <span className="text-xs font-bold font-display text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> AI Cố Vấn Học Tập QG 2026
              </span>
            </div>
            <h3 className="text-lg font-bold font-display text-slate-900">Lộ Trình AI Gợi Ý</h3>
            <p className="text-xs text-slate-600 leading-normal">
              Bấm nút kích hoạt bên dưới để gửi dữ liệu bài làm của bạn qua mạng nơ-ron học máy của Gemini. Hệ thống sẽ cá nhân hóa lộ trình ôn thi THPT 2026.
            </p>
          </div>

          {/* AI Response Output Block */}
          <div className="flex-1 min-h-[220px] bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto max-h-[300px]">
            {aiLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                <p className="font-mono text-center">Gemini đang giải nén phổ điểm tốt nghiệp vả phân tích đề xuất...</p>
              </div>
            ) : aiAdvice ? (
              <div className="text-slate-700 text-xs space-y-2 leading-relaxed whitespace-pre-line font-medium prose prose-slate">
                <MathText text={aiAdvice} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 text-center py-6">
                <Brain className="w-8 h-8 text-indigo-400/70 float-effect" />
                <p className="font-semibold text-slate-700">Bạn muốn biết chiến lược học tối ưu của hôm nay?</p>
                <p className="text-[10px] text-slate-500">Dữ liệu bao gồm lịch sử luyện đề cùng chỉ tiêu đại học</p>
              </div>
            )}
          </div>

          <button
            id="btn-ai-consult"
            disabled={aiLoading}
            onClick={fetchAiAdvice}
            className="w-full py-3 px-4 rounded-xl font-display font-semibold transition-all text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-505 text-white hover:opacity-95 shadow-md active:scale-[0.98] disabled:opacity-55"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            {aiAdvice ? 'CẬP NHẬT LỘ TRÌNH MỚI' : 'CHẨN ĐOÁN LỖ HỔNG KIẾN THỨC VỚI AI'}
          </button>
        </div>
      </div>

      {/* Suggested next exam panel */}
      {suggestedExam && (
        <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-slate-200 bg-white hover:border-indigo-400 shadow-sm transition-all">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 inline-block">ĐỀ THI ĐƯỢC AI GỢI Ý TIẾP THEO</span>
            <h4 className="text-lg font-bold text-slate-900 font-display mt-2">{suggestedExam.title}</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
              <span>Môn học: <b className="text-slate-800">{suggestedExam.subject}</b></span>
              <span>Thời gian: <b className="text-slate-800">{suggestedExam.duration} phút</b></span>
              <span>Độ khó: <b className="text-amber-600">{suggestedExam.difficulty}</b></span>
            </div>
          </div>
          <button
            onClick={() => onSelectExam(suggestedExam.id)}
            className="w-full sm:w-auto self-stretch sm:self-auto px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-1.5 text-xs tracking-wider cursor-pointer font-display shadow-md shadow-indigo-100"
          >
            BẮT ĐẦU NGAY <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Achievements showcase: Badges Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold font-display text-slate-900">Hệ Thống Huy Hiệu Đạt Được</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {allBadges.map(badge => (
            <div 
              key={badge.id}
              className={`glass-panel border-slate-200 bg-white rounded-xl p-4 text-center space-y-2 flex flex-col items-center transition-all ${
                badge.unlocked 
                  ? 'border-amber-200 bg-amber-50/40 text-amber-900 shadow-md' 
                  : 'opacity-40 select-none'
              }`}
            >
              <div className="text-4xl filter drop-shadow">{badge.icon}</div>
              <h5 className="font-bold text-sm tracking-tight">{badge.title}</h5>
              <p className="text-[10px] text-slate-500 font-light leading-normal leading-relaxed">{badge.desc}</p>
              {badge.unlocked ? (
                <span className="text-[9px] bg-amber-100 text-amber-800 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Unlocked</span>
              ) : (
                <span className="text-[9px] bg-slate-100 text-slate-400 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Locked</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
