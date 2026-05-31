import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, BookOpen, Target, LayoutDashboard, Award, Settings, 
  Layers, LogOut, ChevronRight, Menu, X, Info, Flame, Trash2, RefreshCw
} from 'lucide-react';
import { Exam, ExamAttempt, UserProfile } from './types';
import { mockExams } from './data/mockExams';

// Importing views components
import LandingPage from './components/LandingPage';
import Catalog from './components/Catalog';
import Dashboard from './components/Dashboard';
import QuizRunner from './components/QuizRunner';
import ResultPanel from './components/ResultPanel';
import ProfileViewer from './components/ProfileViewer';
import AdminPanel from './components/AdminPanel';

const defaultMockProfile: UserProfile = {
  email: 'ozy3667@gmail.com',
  name: 'Học Sinh Luyện Thi 2026',
  role: 'admin',
  streak: 3,
  lastActiveDate: new Date().toISOString().split('T')[0],
  targetScore: 9.0,
  targetUniversity: 'Đại Học Bách Khoa Hà Nội',
  targetMajor: 'Khoa học Máy tính',
  history: []
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'catalog' | 'dashboard' | 'profile' | 'admin' | 'runner' | 'result'>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core full-stack data states
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [profile, setProfile] = useState<UserProfile>(defaultMockProfile);
  
  // Quiz taking session states
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeMode, setActiveMode] = useState<'focus' | 'chill'>('chill');
  const [activeAttempt, setActiveAttempt] = useState<ExamAttempt | null>(null);

  // Fetch initial profile & exams databases from the backend server
  useEffect(() => {
    fetchExams();
    fetchProfile();
  }, []);

  const fetchExams = async () => {
    console.warn('[LOCAL MODE] Loading mock exams data automatically.');
  };

  const fetchProfile = async () => {
    console.warn('[LOCAL MODE] Profile loaded from client state.');
  };

  // Launching exam module triggers
  const handleSelectExamMode = (examId: string, mode: 'focus' | 'chill') => {
    const selected = exams.find(e => e.id === examId);
    if (selected) {
      setActiveExam(selected);
      setActiveMode(mode);
      setActiveTab('runner');
    }
  };

  // Submitting test results
  const handleSubmitQuizResult = async (attemptData: Omit<ExamAttempt, 'id' | 'createdAt'>) => {
    try {
      // Giữ lại logic tạo kết quả cục bộ (giống như đoạn mock ở hình đầu tiên của bạn)
      const localAttempt: ExamAttempt = {
        ...attemptData,
        id: `attempt-local-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      // Cập nhật thẳng vào lịch sử trên giao diện
      setProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          history: [...(prev.history || []), localAttempt],
          streak: prev.streak + 1,
          lastActiveDate: new Date().toISOString().split('T')[0]
        };
      });

      setActiveAttempt(localAttempt);
      setActiveTab('result');
      return true;
    } catch (err: any) {
      console.error('Failed to save attempt locally:', err);
      return false;
    }
  };
      
     } catch (err: any) {
      console.error('Failed to save attempt locally:', err);
      return false;
    }
  };

  // Profile updating
  const handleUpdateProfile = async (updatedData: Partial<UserProfile>) => {
    try {
      // Bỏ đoạn fetch('/api/profile') gây lỗi 404/405 đi
      // Cập nhật thẳng vào giao diện local
      setProfile(prev => {
        if (!prev) return prev;
        const newProfile = { ...prev, ...updatedData };
        return newProfile;
      });
      return true;
    } catch (err: any) {
      console.error('Failed to update profile locally', err);
      return false;
    }
  };

  // Profile updating
  const handleUpdateProfile = async (updatedData: Partial<UserProfile>) => {
    try {
      // Bỏ đoạn fetch('/api/profile') gây lỗi 404/405 đi
      // Cập nhật thẳng vào giao diện local
      setProfile(prev => {
        if (!prev) return prev;
        const newProfile = { ...prev, ...updatedData };
        return newProfile;
      });
      return true;
    } catch (err: any) {
      console.error('Failed to update profile locally', err);
      return false;
    }
  };
    } catch (e: any) {
      console.error('[NETWORK ERROR] Profile updating failed on server. Saving update locally on client-only state.', e);
      // Fallback local updates
      setProfile(prev => ({
        ...prev,
        ...updatedData
      }));
      return true;
    }
    return false;
  };

  const handleDeleteExamAdmin = async (examId: string) => {
    try {
      const res = await fetch(`/exams/${examId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      const json = await res.json();
      if (json && json.success) {
        await fetchExams(); // refresh roster
        return true;
      }
    } catch (e: any) {
      console.error('[NETWORK ERROR] Failed to delete exam on server. Removing from client-only local state.', e);
      setExams(prev => prev.filter(ex => ex.id !== examId));
      return true;
    }
    return false;
  };

  // Global resets triggers
  const handleResetLearnerStats = async () => {
    try {
      const res = await fetch('/api/profile/reset-history', {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      const json = await res.json();
      if (json && json.success) {
        setProfile(json.data);
        setActiveTab('landing');
      }
    } catch (e: any) {
      console.error('[NETWORK ERROR] Reset learner history failed on server. Resetting client local memory cache.', e);
      setProfile(prev => ({
        ...prev,
        history: [],
        streak: 1
      }));
      setActiveTab('landing');
    }
  };

  const handleSelectExamFromSuggested = (examId: string) => {
    handleSelectExamMode(examId, 'chill');
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#1E293B] flex flex-col justify-between font-sans">
      
      {/* Dynamic transparent header Navigation Bar */}
      {activeTab !== 'runner' && (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            
            {/* Logo */}
            <div 
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-98 transition-all"
            >
              <div className="bg-indigo-600 rounded-xl p-2 flex items-center justify-center shadow-lg shadow-indigo-100">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base tracking-tight font-display bg-gradient-to-r from-indigo-800 via-indigo-600 to-indigo-500 bg-clip-text text-transparent uppercase">DOL THPT PREP</span>
                <p className="text-[9px] font-mono font-bold tracking-widest text-[#4F46E5] -mt-0.5 uppercase">Khóa ôn 2026</p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                id="tab-landing"
                onClick={() => setActiveTab('landing')}
                className={`px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-all ${
                  activeTab === 'landing' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Trang Chủ
              </button>
              
              <button
                id="tab-catalog"
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-all ${
                  activeTab === 'catalog' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Khai Thác Đề
              </button>

              <button
                id="tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-all ${
                  activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Tiến Độ AI
              </button>

              <button
                id="tab-profile"
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-all ${
                  activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Chỉ Tiêu
              </button>

              {profile?.role === 'admin' && (
                <button
                  id="tab-admin"
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-all ${
                    activeTab === 'admin' ? 'bg-indigo-600/10 text-indigo-600 font-bold border border-indigo-500/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Admin Panel
                </button>
              )}
            </nav>

            {/* User credentials bar & widgets */}
            <div className="hidden md:flex items-center gap-4 border-l border-slate-200 pl-4 font-mono text-xs text-slate-500">
              {profile && (
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="font-semibold text-slate-700">ozy3667@gmail.com</span>
                  {profile.streak > 0 && (
                    <div className="flex items-center gap-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                      <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                      <span>{profile.streak}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Hamburger menu */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-500 hover:text-slate-900 focus:outline-none cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </header>
      )}

      {/* Mobile Drawer/dropdown links */}
      <AnimatePresence>
        {mobileMenuOpen && activeTab !== 'runner' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 font-display font-bold uppercase tracking-wider text-xs space-y-1 block py-2 px-4 sticky top-16 z-50 shadow-lg"
          >
            {[
              { id: 'landing', label: 'Trang Chủ' },
              { id: 'catalog', label: 'Khai Thác Đề' },
              { id: 'dashboard', label: 'Tiến Độ AI' },
              { id: 'profile', label: 'Mục Tiêu' },
              ...(profile?.role === 'admin' ? [{ id: 'admin', label: 'Admin Panel (Giảng viên)' }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-3 px-4 rounded-xl block cursor-pointer text-xs uppercase tracking-widest ${
                  activeTab === tab.id ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main viewport Container with transitions effects */}
      <main className="flex-1 w-full flex flex-col justify-start">
        {profile ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col"
            >
              {activeTab === 'landing' && (
                <LandingPage 
                  onStartTesting={() => setActiveTab('catalog')} 
                  onAdminPanel={() => setActiveTab('admin')} 
                  onDashboard={() => setActiveTab('dashboard')} 
                />
              )}
              {activeTab === 'catalog' && (
                <Catalog 
                  exams={exams} 
                  onSelectExamMode={handleSelectExamMode} 
                  onUploadExamClick={() => setActiveTab('admin')} 
                />
              )}
              {activeTab === 'dashboard' && (
                <Dashboard 
                  profile={profile} 
                  exams={exams} 
                  onSelectExam={handleSelectExamFromSuggested} 
                  onNavigateToCatalog={() => setActiveTab('catalog')} 
                  onResetHistory={handleResetLearnerStats} 
                />
              )}
              {activeTab === 'profile' && (
                <ProfileViewer 
                  profile={profile} 
                  onUpdateProfile={handleUpdateProfile} 
                  onResetHistory={handleResetLearnerStats} 
                />
              )}
              {activeTab === 'admin' && (
                <AdminPanel 
                  exams={exams} 
                  onAddExam={handleAddExamAdmin} 
                  onDeleteExam={handleDeleteExamAdmin} 
                />
              )}
              {activeTab === 'runner' && activeExam && (
                <QuizRunner 
                  exam={activeExam} 
                  mode={activeMode} 
                  onExit={() => setActiveTab('catalog')} 
                  onSubmit={handleSubmitQuizResult} 
                />
              )}
              {activeTab === 'result' && activeExam && activeAttempt && (
                <ResultPanel 
                  exam={activeExam} 
                  attempt={activeAttempt} 
                  onRestart={() => handleSelectExamMode(activeExam.id, activeMode)} 
                  onBackToCatalog={() => setActiveTab('catalog')} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="font-mono text-xs text-slate-650 text-slate-500">Đang chuẩn bị phiên đồng bộ hóa học sinh...</p>
          </div>
        )}
      </main>

      {/* Solid footer decorations credits */}
      {activeTab !== 'runner' && (
        <footer className="border-t border-slate-200 bg-white py-8 px-4 text-center mt-12">
          <div className="max-w-7xl mx-auto space-y-3 font-mono text-[11px] text-slate-500 max-w-4xl">
            <p className="font-semibold text-slate-700">© 2026 DOL THPT Prep — Nền Tảng Luyện Đề Tốt Nghiệp Thông Minh</p>
            <p className="font-light">
              Thiết kế bởi Google AI Studio Agent. Phát triển theo chuẩn đánh giá năng lực & kiểm soát lỗ hổng kiến thức cải cách bộ GD&ĐT.
            </p>
            <div className="flex justify-center gap-4 text-slate-500">
              <span>Đại học Bách Khoa</span>
              <span>•</span>
              <span>Đại học Kinh tế Quốc dân</span>
              <span>•</span>
              <span>Đại học Quốc gia Hà Nội</span>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
