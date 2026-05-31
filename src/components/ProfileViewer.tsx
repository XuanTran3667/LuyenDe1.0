import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, Target, GraduationCap, Sparkles, Award, ShieldAlert,
  RefreshCw, Check, CheckCircle2, History, Trash2, Database
} from 'lucide-react';
import { UserProfile, ExamAttempt } from '../types';

interface ProfileViewerProps {
  profile: UserProfile;
  onUpdateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  onResetHistory: () => void;
}

export default function ProfileViewer({ profile, onUpdateProfile, onResetHistory }: ProfileViewerProps) {
  const [name, setName] = useState(profile.name);
  const [targetScore, setTargetScore] = useState(profile.targetScore);
  const [targetUniversity, setTargetUniversity] = useState(profile.targetUniversity || '');
  const [targetMajor, setTargetMajor] = useState(profile.targetMajor || '');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const isOk = await onUpdateProfile({
      name,
      targetScore: parseFloat(String(targetScore)) || 8.0,
      targetUniversity,
      targetMajor
    });

    setLoading(false);
    if (isOk) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 pb-12 text-slate-800">
      {/* Top Header banner */}
      <div className="border-b border-slate-200 py-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-950">Hồ Sơ & Mục Tiêu 2026</h2>
        </div>
        <p className="text-slate-600 text-sm mt-1">Cấu hình tham số học tập để AI cố vấn căn chỉnh lộ trình sát nhất.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left column: Configure Target Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-6 bg-white border border-slate-200">
            <h3 className="text-lg font-bold font-display text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Cập nhật Chỉ tiêu & Mục tiêu
            </h3>

            <form onSubmit={handleSubmitProfile} className="space-y-5">
              {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" /> <span>Đã đồng bộ hóa lưu trữ chỉ tiêu thành tích!</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-slate-500">Họ và Tên Học Sinh</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none transition-all font-sans focus:bg-white"
                />
              </div>

              {/* Target GPAs score */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono font-bold uppercase text-slate-500">
                  <span>Điểm mục tiêu khối thi:</span>
                  <span className="text-indigo-605 font-bold">{parseFloat(String(targetScore)).toFixed(1)} / 10</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="10.0"
                  step="0.1"
                  value={targetScore}
                  onChange={(e) => setTargetScore(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Target School */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-slate-500">Trường Đại Học Mơ Ước</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đại Học Kinh Tế Quốc Dân (NEU)"
                  value={targetUniversity}
                  onChange={(e) => setTargetUniversity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none transition-all font-sans focus:bg-white"
                />
              </div>

              {/* Target Major */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-slate-500">Ngành Học Nhắm Tới</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Logistics & Quản lý chuỗi cung ứng"
                  value={targetMajor}
                  onChange={(e) => setTargetMajor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none transition-all font-sans focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-display font-semibold transition-all rounded-xl text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                LƯU THAY ĐỔI
              </button>

            </form>
          </div>
        </div>

        {/* Right column: Action Database reset & Stats details */}
        <div className="md:col-span-1 space-y-6">
          {/* Diagnostic reset info */}
          <div className="glass-panel border-slate-200 bg-white shadow-sm rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold font-display text-rose-600 flex items-center gap-1.5">
              <Database className="w-4 h-4" /> Vùng quản lý dữ liệu
            </h3>
            
            <p className="text-xs text-slate-600 leading-relaxed font-light">
              Nếu bạn muốn mô phỏng lộ trình học lại từ số không, hãy xóa sạch lịch sử làm đề và đặt chuỗi học tập (Streak) về mặc định. Thao tác này không thể thu hồi.
            </p>

            {profile.history.length > 0 ? (
              <button
                onClick={() => {
                  if (confirm('Bạn chắc chắn muốn xóa vĩnh viễn toàn bộ lịch sử thi cử luyện đề chứ?')) {
                    onResetHistory();
                  }
                }}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 font-mono font-bold rounded-xl text-[11px] tracking-widest cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> XOÁ VĨNH VIỄN LỊCH SỬ LUYỆN ĐỀ
              </button>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500 text-[11px] font-mono">
                Chưa có lịch sử làm đề thi nào cần xóa
              </div>
            )}
          </div>

          {/* List of completed attempts summary */}
          <div className="glass-panel rounded-2xl p-5 space-y-4 bg-white border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold font-display text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" /> Nhật ký làm bài ({profile.history.length})
            </h3>
            
            {profile.history.length > 0 ? (
              <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                {profile.history.map((h, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 flex items-center justify-between font-mono text-[10px]">
                    <div className="truncate max-w-[140px]">
                      <p className="text-slate-800 font-semibold truncate">{h.examTitle}</p>
                      <span className="text-slate-450">{getRelativeTime(h.createdAt)}</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                      {h.score.toFixed(1)} đ
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-550 text-center py-4 font-mono">Chưa hoàn thành lượt thi thử nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
