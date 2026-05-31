import React from 'react';
import { motion } from 'motion/react';
import { Target, Sparkles, Flame, ShieldAlert, ListRestart, Award, BookOpen, Music, GraduationCap } from 'lucide-react';

interface LandingPageProps {
  onStartTesting: () => void;
  onAdminPanel: () => void;
  onDashboard: () => void;
}

export default function LandingPage({ onStartTesting, onAdminPanel, onDashboard }: LandingPageProps) {
  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-12 px-4 bg-[#F0F4F8]">
      {/* Decorative background glow blobs */}
      <div className="absolute top-10 left-1/4 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>

      <div className="max-w-5xl w-full text-center space-y-12 z-10">
        {/* Flag Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-4 py-1.5 rounded-full text-[#4F46E5] text-sm font-bold tracking-wide font-display shadow-sm"
        >
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          <span>PHIÊN BẢN TỐI ƯU ÔN THI THPT QUỐC GIA 2026</span>
        </motion.div>

        {/* Hero Title */}
        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold font-display leading-tight tracking-tight bg-gradient-to-r from-indigo-950 via-indigo-805 to-slate-900 bg-clip-text text-transparent"
          >
            Luyện Đề THPT Quốc Gia <br className="hidden sm:block"/>
            <span className="text-indigo-600">Thông Minh & Cá Nhân Hóa</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Phá vỡ lối mòn học truyền thống. Tận hưởng không gian luyện đề song song hai trạng thái: học tập tập trung cường độ cao hoặc thư giãn nhẹ nhàng cùng nền nhạc Lo-Fi độc bản.
          </motion.p>
        </div>

        {/* Main call to actions */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <button
            id="btn-hero-learn"
            onClick={onStartTesting}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold font-display shadow-lg shadow-indigo-200 transition-all text-base tracking-wide flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-5 h-5" />
            VÀO LUYỆN ĐỀ NGAY
          </button>
          
          <button
            id="btn-hero-dash"
            onClick={onDashboard}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 active:bg-slate-100 text-slate-800 font-bold font-display transition-all text-base flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Target className="w-5 h-5" />
            DASHBOARD HỌC TẬP
          </button>
        </motion.div>

        {/* Core Dual Modes Showcase cards */}
        <div className="grid md:grid-cols-2 gap-8 pt-6">
          {/* Focus Mode Card */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel rounded-2xl p-6 sm:p-8 text-left hover:border-red-300 transition-all group relative overflow-hidden bg-white border border-slate-200"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-red-500/10 transition-all"></div>
            
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            
            <h3 className="text-xl font-extrabold font-display text-slate-900 mb-2 group-hover:text-red-700 transition-colors flex items-center gap-2">
              Nghiêm Túc - Focus Mode
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-wider">Thi Thật</span>
            </h3>
            
            <p className="text-slate-600 text-sm font-light mb-4 leading-relaxed">
              Mô phỏng 100% không khí phòng thi thật. Hệ thống kích hoạt khóa chống mất tập trung, ẩn đáp án, theo dõi hành vi chuyển tab và báo cáo chi tiết giúp tôi luyện bản lĩnh vững vàng trước áp lực đề thi THPT QG.
            </p>

            <ul className="space-y-2 text-xs text-slate-500 font-mono">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Đồng hồ đếm ngược tuyệt đối
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Cảnh báo thông minh khi chuyển đổi tab
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Giấu đáp án & chỉ hiển thị lời giải khi nộp bài
              </li>
            </ul>
          </motion.div>

          {/* Chill Mode Card */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel rounded-2xl p-6 sm:p-8 text-left hover:border-emerald-300 transition-all group relative overflow-hidden bg-white border border-slate-200"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all"></div>
            
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <Music className="w-6 h-6 text-emerald-600" />
            </div>
            
            <h3 className="text-xl font-extrabold font-display text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
              Thư Giãn - Chill Mode
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-wider">Học Tập</span>
            </h3>
            
            <p className="text-slate-600 text-sm font-light mb-4 leading-relaxed">
              Thân thiện và nhẹ nhàng. Ôn thi bền vững có sự hỗ trợ của kho nhạc Lo-Fi sóng não mượt mà, linh thú Mascot dễ thương cổ vũ từng câu đúng, check đáp án trực quan tại chỗ mà không lo áp lực thời gian dồn dập.
            </p>

            <ul className="space-y-2 text-xs text-slate-500 font-mono">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Bật/tắt trình phát Lofi Chill Beats trực tiếp
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Hiển thị kết quả & giải thích chi tiết ngay tại chỗ
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Linh thú đồng hành mascot Duolingo style sinh động
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Feature Icons bento grid banner */}
        <div className="pt-2">
          <h4 className="text-slate-500 text-xs font-bold tracking-widest font-display text-center uppercase mb-6">TÍNH NĂNG VƯỢT TRỘI ÔN THI 2026</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white text-center flex flex-col items-center shadow-sm">
              <Sparkles className="w-5 h-5 text-indigo-500 mb-2" />
              <span className="text-xs text-slate-800 font-semibold">AI Phân Tích Điểm Yếu</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-white text-center flex flex-col items-center shadow-sm">
              <Flame className="w-5 h-5 text-orange-500 mb-2" />
              <span className="text-xs text-slate-800 font-semibold">Bảo Toàn Chuỗi Học Streak</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-white text-center flex flex-col items-center shadow-sm">
              <Award className="w-5 h-5 text-[#f59e0b] mb-2" />
              <span className="text-xs text-slate-800 font-semibold">Huy Hiệu Học Tập</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-white text-center flex flex-col items-center shadow-sm">
              <ListRestart className="w-5 h-5 text-indigo-600 mb-2" />
              <span className="text-xs text-slate-800 font-semibold">Lưu Trạng Thái Làm Bài</span>
            </div>
          </div>
        </div>

        {/* Access panel to test credentials */}
        <div className="pt-6 text-slate-550 text-xs">
          Nếu bạn là Giáo viên/Quản trị viên học tập, nhấn vào <button onClick={onAdminPanel} className="text-indigo-600 hover:underline font-semibold cursor-pointer">Admin Panel</button> ở góc trên hoặc tại chân trang để thêm và chỉnh sửa đề thi PDF/lời giải gốc.
        </div>
      </div>
    </div>
  );
}
