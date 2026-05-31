import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, ShieldAlert, Sparkles, Star, ChevronLeft, ChevronRight, 
  Play, Pause, Volume2, HelpCircle, ArrowLeft, Trophy, CheckCircle, 
  AlertTriangle, Lock, Eye, Check, X, Bookmark
} from 'lucide-react';
import { Exam, Question, ExamAttempt } from '../types';
import { MathText } from './MathRenderer';
import { areMathValuesEquivalent } from '../utils/mathHelper';

interface QuizRunnerProps {
  exam: Exam;
  mode: 'focus' | 'chill';
  onExit: () => void;
  onSubmit: (attempt: Omit<ExamAttempt, 'id' | 'createdAt'>) => void;
}

// Lo-Fi tracks list
const LOFI_STREAMS = [
  { id: 'track-1', name: 'Lofi Chilling Beats ☕', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'track-2', name: 'Ambient Study Beat 🎧', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'track-3', name: 'Piano Thư Giãn Sâu 🎹', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' }
];

export default function QuizRunner({ exam, mode, onExit, onSubmit }: QuizRunnerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [starredQuestions, setStarredQuestions] = useState<string[]>([]);
  
  // Timer State (focus mode limits)
  const [secondsLeft, setSecondsLeft] = useState(exam.duration * 60);
  const [scoreCheckTriggered, setScoreCheckTriggered] = useState<{ [questionId: string]: boolean }>({});

  // Dynamic weights & rules state loaded from Ministry Board configurations
  const [scoringRules, setScoringRules] = useState<any[]>([]);
  const [activeRule, setActiveRule] = useState<any>({
    id: 'moet-standard',
    name: 'Đề tốt nghiệp THPT chuẩn Bộ GD&ĐT (2025/2026)',
    multipleChoicePoints: 0.25,
    shortAnswerPoints: 0.5,
    trueFalsePoints: { 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 }
  });

  // Modal triggers for Submit Confirmation or Timeout Alert overlay
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);

  // Focus Mode specific states
  const [blurCount, setBlurCount] = useState(0);
  const [showBlurWarning, setShowBlurWarning] = useState(false);

  // Chill Mode specific states (Mascot messages & Lo-fi audio)
  const [mascotMessage, setMascotMessage] = useState('Chào cậu! Hãy bắt đầu chinh phục câu số 1 cùng tớ nhé! 🎉');
  const [isPlayingLofi, setIsPlayingLofi] = useState(false);
  const [selectedLofi, setSelectedLofi] = useState(LOFI_STREAMS[0]);
  
  // Synth sound generator (Rain low pass sound) using Browser Web Audio API
  const [isSynthPlaying, setIsSynthPlaying] = useState(false);

  // Sync active scoring rule from DB
  useEffect(() => {
    const loadRules = async () => {
      try {
        const res = await fetch('/api/scoring-rules');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data.length > 0) {
            setScoringRules(json.data);
            const applied = json.data.find((r: any) => r.id === exam.scoringRulesId) 
              || json.data.find((r: any) => r.isActive) 
              || json.data[0];
            if (applied) {
              setActiveRule(applied);
            }
          }
        }
      } catch (err) {
        console.warn('[NETWORK WARNING] Could not sync grading rules. Fallback active rule is locked.', err);
      }
    };
    loadRules();
  }, [exam]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{ source: AudioWorkletNode | ScriptProcessorNode; filter: BiquadFilterNode } | null>(null);

  const shortAnswerInputRef = useRef<HTMLInputElement | null>(null);

  const insertSym = (sym: string) => {
    const input = shortAnswerInputRef.current;
    if (!input) {
      setAnswers(prev => {
        const text = (prev[currentQuestion.id] || '') + sym;
        return { ...prev, [currentQuestion.id]: text };
      });
      return;
    }
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const oldText = answers[currentQuestion.id] || '';
    const newText = oldText.slice(0, start) + sym + oldText.slice(end);
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: newText
    }));
    
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + sym.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Initialize empty answers state
  useEffect(() => {
    const initialAnswers: { [key: string]: any } = {};
    exam.questions.forEach(q => {
      if (q.type === 'true_false') {
        initialAnswers[q.id] = { a: '', b: '', c: '', d: '' };
      } else {
        initialAnswers[q.id] = '';
      }
    });
    setAnswers(initialAnswers);
  }, [exam]);

  // FOCUS MODE: Window Blur Tracking / anti-cheat mechanism
  useEffect(() => {
    if (mode !== 'focus') return;

    const handleBlur = () => {
      setBlurCount(prev => {
        const next = prev + 1;
        setShowBlurWarning(true);
        return next;
      });
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleBlur();
      }
    });

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleBlur);
    };
  }, [mode]);

  // Timer loop for Focus Mode
  useEffect(() => {
    if (mode !== 'focus') return;
    
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode]);

  // Audio stream control
  useEffect(() => {
    if (isPlayingLofi) {
      if (!audioRef.current) {
        audioRef.current = new Audio(selectedLofi.url);
        audioRef.current.loop = true;
      } else {
        audioRef.current.src = selectedLofi.url;
      }
      audioRef.current.play().catch(() => {
        setIsPlayingLofi(false);
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isPlayingLofi, selectedLofi]);

  // Custom Rain Web Audio API synthesizer (no assets required!)
  const toggleRainSynth = () => {
    if (isSynthPlaying) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsSynthPlaying(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Generate Brown/Pink noise for soothing soft rain rainfall effect
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          // Brownian low pass leak integration
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; // Gain scaling
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // Pass through dynamic high and low cut filters
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 520; // Soft rain muffled frequency

        whiteNoise.connect(filter);
        filter.connect(ctx.destination);
        whiteNoise.start();

        setIsSynthPlaying(true);
      } catch (err) {
        console.error('Failed to trigger audio synth:', err);
      }
    }
  };

  const handleSelectOption = (questionId: string, choice: 'A' | 'B' | 'C' | 'D') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: choice
    }));

    // Dynamic mascot response in Chill Mode
    if (mode === 'chill') {
      const responses = [
        'Một lựa chọn rất sắc sảo đấy! Cậu có muốn bấm nút "Kiểm tra đáp án" không? 🧩',
        'Lựa chọn đầy quyết đoán! Hãy tự tin kiểm thử kiến thức của cậu nhé! 🌟',
        'Tớ ghi nhận câu trả lời rồi nhé, tò mò đáp án chuẩn của câu này chứ? Click liền nha!'
      ];
      setMascotMessage(responses[Math.floor(Math.random() * responses.length)]);
    }
  };

  const handleSelectStatement = (questionId: string, statementId: string, choice: 'T' | 'F') => {
    setAnswers(prev => {
      const currentVal = prev[questionId] && typeof prev[questionId] === 'object'
        ? prev[questionId]
        : { a: '', b: '', c: '', d: '' };
      return {
        ...prev,
        [questionId]: {
          ...currentVal,
          [statementId]: choice
        }
      };
    });

    if (mode === 'chill') {
      setMascotMessage('Một lựa chọn Đúng/Sai rất quả quyết! Cậu có muốn bấm "Kiểm tra đáp án" không? 🤔');
    }
  };

  // Toggle star marking
  const toggleStar = (questionId: string) => {
    setStarredQuestions(prev => {
      const isStarred = prev.includes(questionId);
      const next = isStarred ? prev.filter(id => id !== questionId) : [...prev, questionId];
      
      if (mode === 'chill') {
        setMascotMessage(
          isStarred 
            ? 'Đã bỏ đánh dấu câu này. Hãy xem xét các dạng chuyên đề khác nhé!' 
            : 'Đã lưu lại thành công! Tẹo nữa xem chi tiết lời giải trong bảng vàng kết quả nha! 🧠'
        );
      }
      return next;
    });
  };

  // Immediate check checkmark in Chill Mode
  const checkAnswerChill = (questionId: string) => {
    setScoreCheckTriggered(prev => ({
      ...prev,
      [questionId]: true
    }));

    const q = exam.questions.find(item => item.id === questionId);
    if (q) {
      if (q.type === 'true_false') {
        const ans = answers[questionId];
        let correctCount = 0;
        q.statements?.forEach(st => {
          if (ans && ans[st.id] === st.answer) {
            correctCount += 1;
          }
        });
        if (correctCount === 4) {
          setMascotMessage('TUYỆT ĐỈNH! Cậu trả lời ĐÚNG CẢ 4 NHẬN ĐỊNH luôn! Xứng danh thủ khoa 2026! 🏆🚀');
        } else if (correctCount > 0) {
          setMascotMessage(`Khá tốt! Cậu đúng được ${correctCount}/4 nhận định rồi nhé. Xem kĩ lời giải từng nhận định nha! 🌟`);
        } else {
          setMascotMessage('Rất tiếc, chưa đúng ý nào cả. Đọc kĩ lời giải chi tiết từng ý ở bên dưới để khắc phục nha! 💡');
        }
      } else if (q.type === 'short_answer') {
        const isCorrect = areMathValuesEquivalent(answers[questionId], q.shortAnswer || '');
        if (isCorrect) {
          setMascotMessage('CHÍNH XÁC HOÀN TOÀN! Đáp án trả lời ngắn của cậu cực kỳ xuất sắc và chuẩn toán học! 🎊🎖️');
        } else {
          setMascotMessage(`Tiếc quá, chưa chính xác nha. Đáp án đúng là: ${q.shortAnswer}. Cùng xem lí giải chi tiết thấu đáo nhé! 💡`);
        }
      } else {
        const isCorrect = answers[questionId] === q.answer;
        if (isCorrect) {
          setMascotMessage('XUẤT SẮC! Cậu chọn chuẩn không cần chỉnh luôn! 1 điểm cộng tinh thần! 🎉🏆');
        } else {
          setMascotMessage('Ầy chưa đúng rồi! Đọc kĩ giải thích chuyên đề bên dưới để ghi sâu kiến thức nhé! 💡');
        }
      }
    }
  };

  const currentQuestion: Question = exam.questions[currentQuestionIndex];
  
  // Format secondsLeft to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage solved
  // Calculate percentage solved
  const solvedCount = Object.values(answers).filter(v => {
    if (v && typeof v === 'object') {
      const subVals = Object.values(v);
      return subVals.length === 4 && subVals.every(x => x !== '');
    }
    return v !== '';
  }).length;
  const progressPercent = Math.round((solvedCount / exam.questions.length) * 100);

  // Submit operations
  const handleSubmitQuiz = () => {
    // Grade exam according to actual keys and question type
    let rawPart1Score = 0;
    let rawPart2Score = 0;
    let rawPart3Score = 0;
    let rawTotalPoints = 0;
    let fullCorrectCount = 0;

    const mcPoints = activeRule?.multipleChoicePoints ?? 0.25;
    const saPoints = activeRule?.shortAnswerPoints ?? 0.5;
    const tfRule = activeRule?.trueFalsePoints ?? { 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 };

    let p1Count = 0;
    let p2Count = 0;
    let p3Count = 0;

    exam.questions.forEach(q => {
      if (q.type === 'true_false') {
        p2Count += 1;
        const ans = answers[q.id];
        let subCorrectCount = 0;
        q.statements?.forEach(st => {
          if (ans && ans[st.id] === st.answer) {
            subCorrectCount += 1;
          }
        });

        let qPoints = 0;
        if (subCorrectCount === 1) qPoints = tfRule[1];
        else if (subCorrectCount === 2) qPoints = tfRule[2];
        else if (subCorrectCount === 3) qPoints = tfRule[3];
        else if (subCorrectCount === 4) qPoints = tfRule[4];

        rawPart2Score += qPoints;
        rawTotalPoints += qPoints;
        if (subCorrectCount === 4) {
          fullCorrectCount += 1;
        }
      } else if (q.type === 'short_answer') {
        p3Count += 1;
        const isCorrect = areMathValuesEquivalent(answers[q.id], q.shortAnswer || '');
        if (isCorrect) {
          rawPart3Score += saPoints;
          rawTotalPoints += saPoints;
          fullCorrectCount += 1;
        }
      } else {
        p1Count += 1;
        if (answers[q.id] === q.answer) {
          rawPart1Score += mcPoints;
          rawTotalPoints += mcPoints;
          fullCorrectCount += 1;
        }
      }
    });

    // Score over 10 point scale (Calculate max possible points to prevent division by zero or errors on shorter exams)
    const maxPossiblePoints = (p1Count * mcPoints) + (p2Count * tfRule[4]) + (p3Count * saPoints);
    const finalScore = maxPossiblePoints > 0 
      ? parseFloat(((rawTotalPoints / maxPossiblePoints) * 10).toFixed(2))
      : 0;

    // Convert individual part scores to 10-point scale for comparative reporting
    const part1Score = p1Count > 0 ? parseFloat(((rawPart1Score / (p1Count * mcPoints)) * 10).toFixed(2)) : undefined;
    const part2Score = p2Count > 0 ? parseFloat(((rawPart2Score / (p2Count * tfRule[4])) * 10).toFixed(2)) : undefined;
    const part3Score = p3Count > 0 ? parseFloat(((rawPart3Score / (p3Count * saPoints)) * 10).toFixed(2)) : undefined;

    const timeSpent = exam.duration * 60 - secondsLeft;

    onSubmit({
      examId: exam.id,
      examTitle: exam.title,
      subject: exam.subject,
      score: finalScore,
      totalQuestions: exam.questions.length,
      correctAnswersCount: fullCorrectCount, // Displays count of fully correct items
      timeSpentSeconds: mode === 'focus' ? timeSpent : (exam.duration * 60 - secondsLeft), // correct time capture
      mode,
      answers,
      starredQuestions,
      part1Score,
      part2Score,
      part3Score,
      scoringRulesId: activeRule?.id
    });
  };

  const triggerAutoSubmit = () => {
    setIsAutoSubmitted(true);
    // Smooth transition overlay automatically submits within 2 seconds
    setTimeout(() => {
      handleSubmitQuiz();
    }, 2000);
  };

  return (
    <div className={`min-h-[calc(100vh-80px)] w-full flex flex-col ${mode === 'focus' ? 'bg-slate-950 text-slate-100' : 'bg-[#F0F4F8] text-slate-805'}`}>
      
      {/* Quiz Runner Header / Top Toolbar */}
      <div className={`border-b ${mode === 'focus' ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/90 shadow-sm'} px-4 py-3 sticky top-0 z-40 backdrop-blur flex items-center justify-between transition-colors`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className={`p-2 rounded-lg transition-all cursor-pointer ${mode === 'focus' ? 'hover:bg-slate-900 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className={`font-bold text-sm sm:text-base truncate max-w-[200px] sm:max-w-md ${mode === 'focus' ? 'text-white' : 'text-slate-900'}`}>{exam.title}</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${mode === 'focus' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-700 border border-emerald-100'}`}>
                {mode === 'focus' ? 'Focus Mode' : 'Chill Mode'}
              </span>
              <span className={mode === 'focus' ? 'text-slate-500' : 'text-slate-300'}>•</span>
              <span className={mode === 'focus' ? 'text-slate-400' : 'text-slate-600'}>{exam.subject} ({exam.questions.length} câu)</span>
            </div>
          </div>
        </div>

        {/* Dynamic header widgets (Timer vs Music players) */}
        <div className="flex items-center gap-4">
          {mode === 'focus' ? (
            <div className="flex items-center gap-2 bg-red-950/25 border border-red-900/40 px-3.5 py-1.5 rounded-xl">
              <Clock className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="font-mono font-bold text-red-400 tracking-wider text-sm">{formatTime(secondsLeft)}</span>
            </div>
          ) : (
            // Chill Mode sound controller bar
            <div className="flex items-center gap-2">
              {/* Rain synth trigger button */}
              <button
                onClick={toggleRainSynth}
                className={`p-2.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
                  isSynthPlaying 
                    ? 'bg-indigo-50 border-indigo-250 text-indigo-700 font-semibold' 
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                }`}
                title={isSynthPlaying ? 'Tắt tiếng mưa rơi rơi' : 'Bật nhạc mưa rơi mộc'}
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline font-bold">Mưa 🌧️</span>
              </button>

              {/* Lo-fi radio dropdown stream playing */}
              <button
                onClick={() => setIsPlayingLofi(!isPlayingLofi)}
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPlayingLofi 
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-700 font-semibold shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-850 shadow-sm'
                }`}
                title={isPlayingLofi ? 'Tạm dừng nhạc Lofi' : 'Trình phát Lofi'}
              >
                {isPlayingLofi ? <Pause className="w-4 h-4 text-emerald-600 animate-spin" /> : <Play className="w-4 h-4 text-emerald-600" />}
                <span className="text-xs font-display font-medium hidden md:block">Lofi Beats</span>
              </button>

              {isPlayingLofi && (
                <select
                  value={selectedLofi.id}
                  onChange={(e) => {
                    const found = LOFI_STREAMS.find(t => t.id === e.target.value);
                    if (found) setSelectedLofi(found);
                  }}
                  className="bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] py-1.5 px-2 outline-none font-mono"
                >
                  {LOFI_STREAMS.map(str => (
                    <option key={str.id} value={str.id}>{str.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Quick Submit button */}
          <button
            id="btn-submit-attempt"
            onClick={() => setShowSubmitConfirmModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-display font-medium transition-all shadow-sm cursor-pointer"
          >
            NỘP BÀI THI
          </button>
        </div>
      </div>

      {/* Progress horizontal line mapping completed questions percentage */}
      <div className={`w-full ${mode === 'focus' ? 'bg-slate-900' : 'bg-slate-200'} h-1.5 flex`}>
        <div 
          className={`h-full transition-all duration-300 ${mode === 'focus' ? 'bg-red-500' : 'bg-indigo-600'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Body Workspace (Bento layout for quiz questions + progress pad) */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid lg:grid-cols-4 gap-6 p-4 md:p-6 overflow-y-auto">
        
        {/* Sidebar Left: Mascot and Sound/Focus statistics */}
        <div className="space-y-6 lg:col-span-1 flex flex-col justify-start">
          {mode === 'chill' ? (
            /* Chill: Mascot Box (Duolingo / Notion style Mascot helper) */
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel rounded-2xl p-5 text-center relative overflow-hidden bg-white border border-slate-200 shadow-sm text-slate-850"
            >
              <div className="absolute top-2 right-2 flex gap-1 text-[10px] font-mono text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-bold">
                <Sparkles className="w-3 h-3 text-emerald-600 font-bold" /> TRỢ LÝ CHILL
              </div>

              {/* Animated Avatar */}
              <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mt-4 mb-4 float-effect shadow-sm">
                <span className="text-4xl">🐳</span>
              </div>

              <h4 className="text-sm font-bold font-display text-emerald-805">Dolphin Mascot 2026</h4>
              <p className="text-[11px] text-slate-450 font-mono font-medium italic">"Sẵn sàng vượt sóng cả THPT!"</p>

              {/* Dialogue Box */}
              <div className="mt-4 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-left relative">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-50/60 border-t border-l border-emerald-100 rotate-45 font-medium"></div>
                <p className="text-xs text-slate-800 font-semibold leading-relaxed whitespace-pre-line text-center">
                  {mascotMessage}
                </p>
              </div>
            </motion.div>
          ) : (
            /* Focus: Rules lock stats block */
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel border-red-500/25 bg-red-950/20 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2 text-red-500 font-mono text-xs uppercase font-bold tracking-widest">
                <Lock className="w-4 h-4 text-red-500" /> Giám thị ảo tối ưu
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Chế độ ngăn ngừa gian lận của EdTech. Đồng hồ đếm ngược đang chạy, không hiển thị đáp án, hệ thống ghi nhận rời khỏi tab.
              </p>

              <div className="p-3 bg-slate-950/30 rounded-xl border border-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">Chỉ số chuyển tab:</span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${blurCount > 0 ? 'bg-red-500/25 text-red-400' : 'bg-slate-900 text-slate-500'}`}>
                    {blurCount} cảnh báo
                  </span>
                </div>
                {blurCount > 0 && (
                  <p className="text-[10px] text-red-400/80 font-mono italic">
                    Chú ý: Hãy thi thực sự nghiêm túc để kết quả đánh giá AI có sai lệch thấp nhất!
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Quick instructions hints card */}
          <div className={`glass-panel rounded-2xl p-4 hidden lg:block text-[11px] space-y-2 ${mode === 'focus' ? 'border-slate-800 bg-slate-950 text-slate-500' : 'border-slate-200 bg-white text-slate-650 shadow-sm'}`}>
            <h5 className={`font-bold font-mono uppercase tracking-widest ${mode === 'focus' ? 'text-slate-400' : 'text-slate-700'}`}>Hướng dẫn phím tắt</h5>
            <p>• Click biểu tượng <Star className="w-3.5 h-3.5 inline mx-0.5 text-amber-500" /> để đánh dấu câu xem lại.</p>
            <p>• Hoàn thành tối đa rồi ấn nộp để AI lập tức bắt bệnh và gợi ý khóa chuyên đề tương ứng.</p>
          </div>
        </div>

        {/* Center Grid Column: Active Question Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={`glass-panel rounded-2xl p-6 space-y-6 ${mode === 'focus' ? 'bg-slate-900 border-slate-800' : 'bg-white border border-slate-200 shadow-sm text-slate-800'}`}
            >
              {/* Question Header */}
              <div className={`flex items-center justify-between border-b pb-4 ${mode === 'focus' ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <span className={`text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                  mode === 'focus' 
                    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' 
                    : 'text-indigo-700 bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}>
                  Câu hỏi {currentQuestion.order} / {exam.questions.length}
                </span>

                <div className="flex items-center gap-2">
                  {/* Topic identifier tag */}
                  <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-900">
                    Chuyên đề: {currentQuestion.topic}
                  </span>

                  {/* Bookmark Star Toggle */}
                  <button
                    onClick={() => toggleStar(currentQuestion.id)}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-all text-slate-400 cursor-pointer"
                    title="Đánh dấu câu cần nghiên cứu kĩ"
                  >
                    <Star 
                      className={`w-4 h-4 ${
                        starredQuestions.includes(currentQuestion.id) ? 'fill-amber-500 text-amber-500' : 'text-slate-500'
                      }`} 
                    />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <h4 className={`text-base sm:text-lg font-semibold leading-relaxed font-sans ${mode === 'focus' ? 'text-slate-100' : 'text-slate-900'}`}>
                  <MathText text={currentQuestion.text} />
                </h4>

                {currentQuestion.image && (
                  <div className={`rounded-xl overflow-hidden border max-h-[300px] flex items-center justify-center ${mode === 'focus' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                    <img src={currentQuestion.image} alt="Question Diagram" className="object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              {/* Options list selection */}
              {currentQuestion.type === 'true_false' ? (
                /* TRUE/FALSE (ĐÚNG/SAI) RENDER BLOCK */
                <div className="space-y-4 pt-2">
                  {currentQuestion.statements?.map((statement) => {
                    const userVal = (answers[currentQuestion.id] as any)?.[statement.id] || '';
                    const showResult = mode === 'chill' && scoreCheckTriggered[currentQuestion.id];
                    const stCorrect = userVal === statement.answer;

                    return (
                      <div 
                        key={statement.id}
                        className={`p-4 rounded-xl border transition-all ${
                          mode === 'focus' 
                            ? 'bg-slate-950/40 border-slate-800 text-slate-200' 
                            : 'bg-slate-50/50 border-slate-200 text-slate-800 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className={`w-6 h-6 rounded bg-indigo-100 border border-indigo-200 text-indigo-750 text-[11px] font-mono font-black flex items-center justify-center shrink-0 uppercase`}>
                              {statement.id}
                            </span>
                            <div className="space-y-2">
                              <span className="text-sm font-medium leading-relaxed"><MathText text={statement.text} /></span>
                              {statement.image && (
                                <img src={statement.image} alt={`Statement ${statement.id}`} className="max-h-[140px] rounded-lg mt-1 block object-contain bg-white p-1 border border-slate-200" referrerPolicy="no-referrer" />
                              )}
                            </div>
                          </div>

                          {/* True / False selection buttons */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Đúng (T) Button */}
                            <button
                              disabled={showResult}
                              onClick={() => handleSelectStatement(currentQuestion.id, statement.id, 'T')}
                              className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                userVal === 'T'
                                  ? (mode === 'focus'
                                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                      : 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold')
                                  : (mode === 'focus'
                                      ? 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                                      : 'border-slate-200 bg-white hover:bg-slate-100/50 text-slate-600')
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                userVal === 'T' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400'
                              }`}>
                                {userVal === 'T' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              Đúng
                            </button>

                            {/* Sai (F) Button */}
                            <button
                              disabled={showResult}
                              onClick={() => handleSelectStatement(currentQuestion.id, statement.id, 'F')}
                              className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                userVal === 'F'
                                  ? (mode === 'focus'
                                      ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                                      : 'border-rose-600 bg-rose-50 text-rose-800 font-bold')
                                  : (mode === 'focus'
                                      ? 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                                      : 'border-slate-200 bg-white hover:bg-slate-100/50 text-slate-600')
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                userVal === 'F' ? 'border-rose-500 bg-rose-500' : 'border-slate-400'
                              }`}>
                                {userVal === 'F' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              Sai
                            </button>
                          </div>
                        </div>

                        {/* Immediate result representation for Chill mode */}
                        {showResult && (
                          <div className="mt-3 pt-3 border-t text-xs flex flex-col gap-2 border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 font-bold">
                                {stCorrect ? (
                                  <>
                                    <Check className="w-4 h-4 text-emerald-500" />
                                    <span className="text-emerald-600 font-display">Nhận định chính xác!</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4 text-rose-500" />
                                    <span className="text-rose-600 font-display">Nhận định chưa chính xác!</span>
                                  </>
                                )}
                              </span>
                              <span className="font-mono text-[11px] text-slate-500">
                                Đáp án đúng: <strong className="text-indigo-600">{statement.answer === 'T' ? 'ĐÚNG' : 'SAI'}</strong>
                              </span>
                            </div>
                            {statement.explanation && (
                              <p className="text-slate-500 italic mt-1 font-light leading-relaxed">
                                <strong>Xem giải thích:</strong> <MathText text={statement.explanation} />
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : currentQuestion.type === 'short_answer' ? (
                /* SHORT ANSWER WORKSPACE INTERFACE WITH FORMULA KEYBOARD HELPER */
                <div className="space-y-4 pt-2 text-slate-800">
                  <div className="space-y-1.5">
                    <label className={`text-xs uppercase font-bold font-mono tracking-widest ${mode === 'focus' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Nhập đáp án tự luận / trả lời ngắn:
                    </label>
                    
                    <div className="relative">
                      <input
                        ref={shortAnswerInputRef}
                        type="text"
                        disabled={mode === 'chill' && scoreCheckTriggered[currentQuestion.id]}
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
                        }}
                        placeholder="Ví dụ: 12, 3.14, 1/2, \sqrt{3}, 8\pi, H2SO4..."
                        className={`w-full font-mono text-base px-5 py-4 rounded-xl border-2 outline-none transition-all ${
                          mode === 'focus'
                            ? 'bg-slate-900 border-slate-800 text-white focus:border-red-500'
                            : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-550/80 shadow-xs'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Smart Formula Keyboard Helpers for mobile & desktop cursor selection */}
                  {!(mode === 'chill' && scoreCheckTriggered[currentQuestion.id]) && (
                    <div className="space-y-2">
                      <span className={`text-[10px] font-mono uppercase tracking-wider block ${mode === 'focus' ? 'text-slate-500' : 'text-slate-405'}`}>
                        Bàn phím ký hiệu toán học nhanh:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { sym: '\\sqrt{}', display: '√x', title: 'Căn bậc hai' },
                          { sym: '\\pi', display: 'π', title: 'Hằng số Pi' },
                          { sym: '\\frac{}{}', display: '分', title: 'Phân số \frac{a}{b}' },
                          { sym: '^', display: 'x²', title: 'Chỉ số trên/Mũ' },
                          { sym: '_', display: 'x₁', title: 'Chỉ số dưới' },
                          { sym: '\\alpha', display: 'α', title: 'Alpha' },
                          { sym: '\\beta', display: 'β', title: 'Beta' },
                          { sym: '\\Delta', display: 'Δ', title: 'Delta' },
                          { sym: '\\int', display: '∫', title: 'Tích phân' },
                          { sym: '\\Sigma', display: 'Σ', title: 'Tổng Sigma' },
                          { sym: '\\cdot', display: '•', title: 'Nhân ccdot' },
                          { sym: '\\to', display: '→', title: 'Mũi tên' }
                        ].map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            type="button"
                            onClick={() => insertSym(btn.sym)}
                            title={btn.title}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                              mode === 'focus'
                                ? 'bg-slate-900 border-slate-800 hover:border-slate-500 text-slate-300'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            {btn.display}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Immediate grading representation for Chill Mode */}
                  {mode === 'chill' && scoreCheckTriggered[currentQuestion.id] && (
                    <div className="p-4 rounded-xl border bg-indigo-50/50 border-indigo-150/60 font-sans space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold font-mono tracking-widest text-slate-500">Kết quả nháp</span>
                        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                          areMathValuesEquivalent(answers[currentQuestion.id], currentQuestion.shortAnswer || '')
                            ? 'bg-emerald-500/20 text-emerald-700'
                            : 'bg-rose-500/20 text-rose-700'
                        }`}>
                          {areMathValuesEquivalent(answers[currentQuestion.id], currentQuestion.shortAnswer || '') ? 'ĐÚNG CHUẨN' : 'CHƯA ĐÚNG'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 space-y-1.5">
                        <p>Bạn nhập: <strong className="font-mono text-slate-900 bg-white border px-1.5 py-0.5 rounded">{answers[currentQuestion.id] || '(trống)'}</strong></p>
                        <div className="flex items-center gap-1">Đáp án đúng: <strong className="font-mono text-emerald-750 bg-white border px-1.5 py-0.5 rounded flex items-center gap-1"><MathText text={currentQuestion.shortAnswer || ''} /></strong></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MULTIPLE CHOICE 4 OPTIONS (A B C D) */
                <div className="grid gap-3 pt-2">
                  {(['A', 'B', 'C', 'D'] as const).map(optionLetter => {
                    const optionText = currentQuestion.options ? currentQuestion.options[optionLetter] : '';
                    const isSelected = answers[currentQuestion.id] === optionLetter;
                    
                    // Color statuses during Immediate Check in Chill Mode
                    const showResult = mode === 'chill' && scoreCheckTriggered[currentQuestion.id];
                    const isCorrectAnswer = optionLetter === currentQuestion.answer;
                    
                    let optionStyles = '';
                    if (mode === 'focus') {
                      if (isSelected) {
                        optionStyles = 'border-red-500 bg-red-500/5 text-red-200';
                      } else {
                        optionStyles = 'border-slate-800 bg-slate-950 hover:bg-slate-900/70 hover:border-slate-700 text-slate-300';
                      }
                    } else {
                      // Chill Mode
                      if (showResult) {
                        if (isCorrectAnswer) {
                          optionStyles = 'border-emerald-500 bg-emerald-50/70 text-emerald-800 font-semibold';
                        } else if (isSelected) {
                          optionStyles = 'border-rose-400 bg-rose-50/75 text-rose-800';
                        } else {
                          optionStyles = 'border-slate-200 bg-slate-50/30 text-slate-400 opacity-60';
                        }
                      } else {
                        if (isSelected) {
                          optionStyles = 'border-indigo-600 bg-indigo-50/55 text-indigo-900 font-semibold shadow-xs';
                        } else {
                          optionStyles = 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:shadow-xs';
                        }
                      }
                    }

                    if (mode === 'focus' && showResult) {
                      if (isCorrectAnswer) {
                        optionStyles = 'border-green-500/80 bg-green-500/10 text-green-200';
                      } else if (isSelected) {
                        optionStyles = 'border-red-500/80 bg-red-500/10 text-red-300';
                      }
                    }

                    // Option letter indicator styles
                    let badgeStyles = '';
                    if (mode === 'focus') {
                      if (isSelected) {
                        badgeStyles = 'bg-red-500/25 border-red-500 text-red-400';
                      } else {
                        badgeStyles = 'bg-slate-900 border-slate-800 text-slate-400';
                      }
                    } else {
                      // Chill mode
                      if (showResult) {
                        if (isCorrectAnswer) {
                          badgeStyles = 'bg-emerald-500 border-emerald-600 text-white';
                        } else if (isSelected) {
                          badgeStyles = 'bg-rose-500 border-rose-600 text-white';
                        } else {
                          badgeStyles = 'bg-slate-100 border-slate-200 text-slate-400';
                        }
                      } else {
                        if (isSelected) {
                          badgeStyles = 'bg-indigo-600 border-indigo-700 text-white';
                        } else {
                          badgeStyles = 'bg-slate-100 border-slate-200 text-slate-550';
                        }
                      }
                    }

                    return (
                      <button
                        key={optionLetter}
                        onClick={() => !showResult && handleSelectOption(currentQuestion.id, optionLetter)}
                        disabled={showResult}
                        className={`w-full text-left p-4 rounded-xl border font-sans text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${optionStyles} ${showResult ? 'opacity-95' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${badgeStyles}`}>
                            {optionLetter}
                          </span>
                          <div className="space-y-2">
                            <span className="leading-relaxed"><MathText text={optionText} /></span>
                            {currentQuestion.optionsImages?.[optionLetter] && (
                              <img src={currentQuestion.optionsImages[optionLetter]} alt={`Option ${optionLetter}`} className="max-h-[120px] rounded-lg mt-1 block object-contain bg-white p-1 border border-slate-200" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        </div>

                        {/* Display correct/incorrect icons if Chill check is completed */}
                        {showResult && (
                          <div>
                            {isCorrectAnswer ? (
                              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : isSelected ? (
                              <X className="w-4 h-4 text-rose-500 shrink-0" />
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Chill mode immediate checker trigger row */}
              {mode === 'chill' && (
                currentQuestion.type === 'true_false'
                  ? Object.values(answers[currentQuestion.id] || {}).some(val => val !== '')
                  : answers[currentQuestion.id]
              ) && !scoreCheckTriggered[currentQuestion.id] && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-2 flex justify-end"
                >
                  <button
                    onClick={() => checkAnswerChill(currentQuestion.id)}
                    className="text-xs font-display font-semibold uppercase tracking-wider bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl px-4 py-2 shadow-xs transition-all cursor-pointer"
                  >
                    KIỂM TRA ĐÁP ÁN NÀY ĐÚNG/SAI?
                  </button>
                </motion.div>
              )}

              {/* Chill mode: reveal explanation block immediately if checked */}
              {mode === 'chill' && scoreCheckTriggered[currentQuestion.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border rounded-xl p-5 space-y-3 shadow-inner bg-indigo-50/40 border-indigo-100/70 text-slate-850"
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs uppercase font-bold font-mono tracking-widest text-slate-500">Lời giải chi tiết</span>
                  </div>
                  <div className="text-xs text-slate-705 font-light leading-relaxed space-y-3">
                    <MathText text={currentQuestion.explanation} />
                    {currentQuestion.explanationImage && (
                      <img src={currentQuestion.explanationImage} alt="Explanation Graphic" className="max-h-[180px] rounded-xl mt-2 block object-contain bg-white p-1.5 border border-slate-200" referrerPolicy="no-referrer" />
                    )}
                  </div>
                </motion.div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Previous/Next questions pagination toolbar */}
          <div className="flex items-center justify-between">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="px-4 py-2.5 bg-slate-900 text-slate-300 border border-slate-800 disabled:opacity-40 rounded-xl text-xs font-display font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> CÂU TRƯỚC
            </button>
            <button
              disabled={currentQuestionIndex === exam.questions.length - 1}
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="px-4 py-2.5 bg-slate-900 text-slate-300 border border-slate-800 disabled:opacity-40 rounded-xl text-xs font-display font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              CÂU TIẾP THEO <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sidebar Right: Questions Grid Quick Navigator */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel border-slate-900 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold font-display text-white border-b border-slate-800/60 pb-2">Danh sách câu hỏi</h4>
            
            <div className="grid grid-cols-5 gap-2.5">
              {exam.questions.map((q, idx) => {
                const isSelected = idx === currentQuestionIndex;
                const ans = answers[q.id];
                const starred = starredQuestions.includes(q.id);
                
                let isAnswered = false;
                if (ans && typeof ans === 'object') {
                  isAnswered = Object.values(ans).some(val => val !== '');
                } else {
                  isAnswered = ans && ans !== '';
                }

                let buttonStyles = 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700';
                
                if (isAnswered) {
                  buttonStyles = mode === 'focus' 
                    ? 'border-red-500/20 text-red-400 bg-red-500/10'
                    : 'border-teal-500/20 text-teal-400 bg-teal-500/10';
                }

                if (isSelected) {
                  buttonStyles = mode === 'focus'
                    ? 'border-red-500 bg-red-600 text-white'
                    : 'border-teal-500 bg-teal-600 text-white';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-9 w-full rounded-lg border font-mono font-bold text-xs flex flex-col items-center justify-center relative cursor-pointer ${buttonStyles} transition-all`}
                  >
                    <span>{idx + 1}</span>
                    {starred && (
                      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Grid Color legend descriptors */}
            <div className="pt-2 border-t border-slate-800/60 space-y-2 text-[10px] text-slate-400 font-mono">
              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 border rounded ${mode === 'focus' ? 'bg-red-500/10 border-red-500/25' : 'bg-teal-500/10 border-teal-500/25'}`}></span>
                <span>Đã nộp phương án</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 rounded"></span>
                <span>Chưa chọn đáp án</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block"></span>
                <span>Cần xem lại</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ENTIRE FLUID ANIMATEPRESENCE OVERLAYS SUITE */}
      <AnimatePresence>
        {/* Cheat Warning Modal */}
        {showBlurWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-slate-900 border-2 border-red-500 text-white rounded-2xl p-6 text-center space-y-6 shadow-2xl relative"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center mx-auto text-red-500">
                <ShieldAlert className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-display text-red-500">Cảnh Báo Chuyển Tab / Rời Khung Hình</h3>
                <p className="text-sm text-slate-300 font-light leading-relaxed font-sans">
                  Bạn đang ở chế độ làm bài nghiêm túc **Focus Mode**. Hệ thống ghi nhận bạn đã rời cửa sổ thi thử hoặc chuyển đổi sang ứng dụng khác.
                </p>
                <p className="text-xs bg-red-500/10 text-red-400 font-mono inline-block px-3 py-1 rounded border border-red-500/20 font-bold mt-2">
                  Lượt vi phạm hiện tại: {blurCount} lần
                </p>
              </div>

              <button
                onClick={() => setShowBlurWarning(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 font-display font-bold rounded-xl tracking-wider text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                QUAY LẠI LÀM BÀI KHẨN CẤP
              </button>
            </motion.div>
          </div>
        )}

        {/* Nộp Bài Thi Thống Kê Xác Nhận Modal */}
        {showSubmitConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="max-w-md w-full bg-white text-slate-800 rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold font-display text-slate-900">Xác nhận nộp bài thi thử?</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Vui lòng kiểm tra lại bảng thống kê tiến trình làm bài dưới đây trước khi bấm xác nhận nộp bài chính thức.
                </p>
              </div>

              {/* Stats conversion card list */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-450 tracking-wider">Đã làm</span>
                  <p className="text-lg font-bold text-slate-850 font-mono">{solvedCount} / {exam.questions.length}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-450 tracking-wider">Chưa hoàn thành</span>
                  <p className={`text-lg font-bold font-mono ${exam.questions.length - solvedCount > 0 ? 'text-amber-600' : 'text-slate-850'}`}>
                    {exam.questions.length - solvedCount} câu
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-450 tracking-wider">Đã đánh dấu (★)</span>
                  <p className="text-lg font-bold text-amber-500 font-mono flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400" /> {starredQuestions.length} câu
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-450 tracking-wider">Thời gian còn lại</span>
                  <p className="text-lg font-bold text-indigo-600 font-mono">{formatTime(secondsLeft)}</p>
                </div>
              </div>

              {exam.questions.length - solvedCount > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-3 text-amber-805">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-amber-900 font-sans">
                    <strong>Lưu ý:</strong> Bạn vẫn còn <strong>{exam.questions.length - solvedCount} câu hỏi</strong> bỏ trống chưa hoàn thành đáp án. Bạn có muốn tiếp tục làm bài thi không?
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium font-display text-sm tracking-wide rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  XÁC NHẬN NỘP BÀI THI
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirmModal(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium font-display text-sm rounded-xl transition-all active:scale-98 cursor-pointer text-center"
                >
                  TIẾP TỤC LÀM BÀI
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Dynamic Fullscreen Auto-Submit Timeout Overlay (No alerts!) */}
        {isAutoSubmitted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 backdrop-blur-xl p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md w-full bg-slate-900 border border-red-500/30 text-white rounded-3xl p-8 text-center space-y-6 shadow-2xl relative"
            >
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Lock className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold font-display text-red-500">HẾT GIỜ LÀM BÀI!</h3>
                <p className="text-sm text-slate-300 font-sans leading-relaxed">
                  Đồng hồ đếm ngược của Bộ Giáo dục & Đào tạo đã về 00:00. Hệ thống tự động khóa đề thi của bạn và nộp bài để tính điểm...
                </p>
              </div>

              {/* Progress visual spinner */}
              <div className="flex items-center justify-center gap-2.5 text-xs text-indigo-400 font-mono">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                Đang tổng hợp điểm số cực kỳ chuẩn xác...
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
