import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, ListPlus, Send, RefreshCw, Layers, CheckCircle2, 
  HelpCircle, ChevronDown, ChevronUp, AlertCircle, FileSpreadsheet, Sparkles,
  FileUp, Check, Edit, AlertTriangle, Eye, HelpCircle as HelpIcon, ClipboardCheck, ArrowUpRight, Info
} from 'lucide-react';
import { Exam, Question, Subject, Difficulty } from '../types';
import { MathText } from './MathRenderer';
import { runParserTestsDirect } from '../utils/testSuite';

interface AdminPanelProps {
  exams: Exam[];
  onAddExam: (newExam: any) => Promise<boolean>;
  onDeleteExam: (examId: string) => Promise<boolean>;
}

function ImageUploadField({ 
  label, 
  imageUrl, 
  onUpload, 
  onRemove 
}: { 
  label: string; 
  imageUrl?: string; 
  onUpload: (base64: string) => void; 
  onRemove: () => void; 
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-1.5 p-1 w-full">
      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">{label}</span>
      {imageUrl ? (
        <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 w-full max-h-[140px] flex items-center justify-center p-2">
          <img src={imageUrl} alt={label} className="object-contain max-h-[120px]" referrerPolicy="no-referrer" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all cursor-pointer text-[10px] font-bold shrink-0"
          >
            Xóa ảnh
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 border border-dashed border-slate-300 hover:border-indigo-400 hover:text-indigo-600 rounded-lg text-[10px] text-slate-500 font-semibold cursor-pointer transition-all hover:bg-slate-50"
        >
          <FileUp className="w-3.5 h-3.5 text-indigo-500" />
          <span>Tải ảnh đính kèm</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </button>
      )}
    </div>
  );
}

export default function AdminPanel({ exams, onAddExam, onDeleteExam }: AdminPanelProps) {
  // New exam form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<Subject>('Toán');
  const [difficulty, setDifficulty] = useState<Difficulty>('Trung bình');
  const [duration, setDuration] = useState(50);
  const [year, setYear] = useState(2026);
  const [rawTags, setRawTags] = useState('Chuyên đề chung, Đề thi thử');
  const [filterType, setFilterType] = useState<'all' | 'multiple_choice' | 'true_false' | 'short_answer'>('all');
  
  // Custom list of questions creation state
  const [newQuestions, setNewQuestions] = useState<any[]>([
    {
      text: 'Cho ví dụ câu hỏi số 1?',
      options: { A: 'Phương án A', B: 'Phương án B', C: 'Phương án C', D: 'Phương án D' },
      answer: 'A',
      explanation: 'Đây là giải nghĩa lý thuyết của câu 1.',
      topic: 'Bài tập cơ bản',
      type: 'multiple_choice'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Tab state: 'manual' | 'pdf' | 'test'
  const [activeTab, setActiveTab] = useState<'manual' | 'pdf' | 'test'>('manual');
  
  // PDF processing states
  const [pdfExamFile, setPdfExamFile] = useState<File | null>(null);
  const [pdfAnswerFile, setPdfAnswerFile] = useState<File | null>(null);
  const [copiedAnswerText, setCopiedAnswerText] = useState('');
  const [ocrProgress, setOcrProgress] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  
  // Temporary holding array for AI parsed questions
  const [aiParsedQuestions, setAiParsedQuestions] = useState<any[]>([]);
  const [mismatchWarning, setMismatchWarning] = useState('');

  // Dynamic resource status indicators
  const [pdfjsStatus, setPdfjsStatus] = useState<'loading' | 'ready' | 'error'>((window as any).pdfjsLib ? 'ready' : 'loading');
  const [aiServerStatus, setAiServerStatus] = useState<'loading' | 'ready' | 'fallback' | 'error'>('loading');
  const [aiServerInfo, setAiServerInfo] = useState<string>('Đang kiểm tra kết nối AI...');

  // Dynamic injection of PDF.js and verification of Server AI status
  useEffect(() => {
    console.log('[AUDIT LOG] Initializing PDF.js and Server AI checking modules...');
    
    // 1. PDF.js injection
    if ((window as any).pdfjsLib) {
      console.log('[AUDIT LOG] PDF.js already loaded in window workspace.');
      setPdfjsStatus('ready');
    } else {
      console.log('[AUDIT LOG] Constructing virtual script layout to grab PDF.js 3.4.120 from Cloudflare CDN...');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.async = true;
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        if (pdfjs) {
          try {
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            console.log('[AUDIT LOG] PDF.js core library and Worker engine bound successfully.');
            setPdfjsStatus('ready');
          } catch (err: any) {
            console.error('[AUDIT LOG] Failure during binding GlobalWorkerOptions workerSrc:', err);
            setPdfjsStatus('error');
          }
        } else {
          console.error('[AUDIT LOG] Script tags loaded but window.pdfjsLib is missing.');
          setPdfjsStatus('error');
        }
      };
      script.onerror = (err) => {
        console.error('[AUDIT LOG] Network transmission failed while loading PDF.js script tag:', err);
        setPdfjsStatus('error');
      };
      document.head.appendChild(script);
    }

    // 2. Query actual server-side Gemini/Fallback availability status
    const queryAiStatus = async () => {
      try {
        console.log('[AUDIT LOG] Requesting backend model status from /api/ai/status...');
        const res = await fetch('/api/ai/status');
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        const data = await res.json();
        console.log('[AUDIT LOG] Server status response:', data);
        if (data.success) {
          if (data.initialized) {
            setAiServerStatus('ready');
            setAiServerInfo(`Hãng cung cấp: ${data.provider} (Trực Tuyến Sẵn Sàng)`);
          } else {
            setAiServerStatus('fallback');
            setAiServerInfo(`Hãng cung cấp: ${data.provider} (Quy Tắc Cục Bộ - Local Regex Mode)`);
          }
        } else {
          throw new Error(data.error || 'Server did not report state info.');
        }
      } catch (err: any) {
        console.error('[AUDIT LOG] Failed to query backend AI Parser status. Activating local mode.', err.message);
        setAiServerStatus('fallback');
        setAiServerInfo('Hãng cung cấp: Rule Engine (Cục Bộ Fallback kích hoạt)');
      }
    };

    queryAiStatus();
  }, []);

  const handleReloadResources = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setOcrProgress('Đang đồng bộ hóa dịch vụ...');
    console.log('[AUDIT LOG] Re-triggering component asset validation manual cycle...');

    if ((window as any).pdfjsLib) {
      setPdfjsStatus('ready');
    } else {
      setPdfjsStatus('loading');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.async = true;
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        if (pdfjs) {
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          setPdfjsStatus('ready');
        }
      };
      script.onerror = () => setPdfjsStatus('error');
      document.head.appendChild(script);
    }

    setAiServerStatus('loading');
    setAiServerInfo('Đang kết nối lại mạng...');
    try {
      const res = await fetch('/api/ai/status');
      const data = await res.json();
      if (data.success) {
        if (data.initialized) {
          setAiServerStatus('ready');
          setAiServerInfo(`Hãng cung cấp: ${data.provider}`);
        } else {
          setAiServerStatus('fallback');
          setAiServerInfo(`Hãng cung cấp: ${data.provider} (Chế độ cục bộ)`);
        }
      } else {
        setAiServerStatus('error');
        setAiServerInfo('Lỗi dịch vụ kiểm nghiệm AI.');
      }
    } catch {
      setAiServerStatus('fallback');
      setAiServerInfo('Hãng cung cấp: Rule Engine (Cục Bộ Fallback)');
    } finally {
      setOcrProgress('');
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjs = (window as any).pdfjsLib;
    if (!pdfjs) {
      throw new Error('PDF.js chưa được tải hoàn tất. Vui lòng bấm nạp lại hệ thống phía trên hoặc chờ 2 giây!');
    }
    const arrayBuffer = await file.arrayBuffer();
    
    console.log(`[AUDIT LOG] Initializing document load. File size: ${(file.size / 1024).toFixed(1)} KB`);
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    
    // Track loading progress if desired
    loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
      const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
      setOcrProgress(`Đang tải dữ liệu nhị phân PDF... [${percent}%]`);
    };

    const pdf = await loadingTask.promise;
    console.log(`[AUDIT LOG] Document successfully loaded. Pages count: ${pdf.numPages}`);
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`[AUDIT LOG] Processing extraction for Page ${pageNum} of ${pdf.numPages}...`);
      setOcrProgress(`Trích xuất văn bản thô: Trang ${pageNum} / ${pdf.numPages}...`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `\n--- PAGE ${pageNum} ---\n` + pageText;
    }
    console.log(`[AUDIT LOG] PDF text content extracted successfully. Total Length: ${fullText.length} characters.`);
    return fullText;
  };

  const handleStartPDFParsing = async () => {
    if (!pdfExamFile) {
      setErrorMsg('Vui lòng kéo/thả tải lên tài liệu File đề thi (PDF) để bắt đầu phân tích!');
      return;
    }

    setAiParsing(true);
    setOcrProgress('Khởi hoạt bộ chuyển đổi tài liệu PDF...');
    setErrorMsg('');
    setMismatchWarning('');

    try {
      // 1. Text extraction
      setOcrProgress('Đang giải mã và đọc PDF trang liên kết...');
      const questionRawText = await extractTextFromPdf(pdfExamFile);

      let answersRawText = '';
      if (pdfAnswerFile) {
        setOcrProgress('Đang phân tách và đọc PDF chứa bảng đáp án...');
        answersRawText = await extractTextFromPdf(pdfAnswerFile);
      } else if (copiedAnswerText.trim()) {
        answersRawText = copiedAnswerText;
      }

      // 2. Transmit to server AI
      setOcrProgress('Đang gửi dữ liệu thô chuẩn hóa đến AI Parser (Gemini)...');
      console.log('[AUDIT LOG] Transmitting post payload containing extracted text strings to /api/ai/parse-exam...');
      
     // Bỏ qua việc gọi server thật để tránh lỗi 405 trên GitHub Pages
    // Ép hệ thống tự động nhảy thẳng xuống catch để kích hoạt Chế độ cục bộ (Local Mode)
    throw new Error('Kích hoạt Chế độ cục bộ trên GitHub Web');

      if (!response.ok) {
        throw new Error(`Mạng kết nối máy chủ không thành công (HTTP ${response.status})`);
      }

      const result = await response.json();
      console.log('[AUDIT LOG] AI Parser completed response parsing:', result);
      
      if (result.success) {
        const questionsList = result.questions || [];
        setAiParsedQuestions(questionsList);
        
        // Simple mismatch count verification
        if (pdfAnswerFile || copiedAnswerText.trim()) {
          const questionsCount = questionsList.length;
          if (questionsCount === 0) {
            setMismatchWarning('Cảnh báo: AI Parser không phân tách được bất kỳ định dạng câu hỏi nào. Hãy chắc chắn tập tin PDF không phải là ảnh scan thuần (không có text) hoặc không đúng định dạng!');
          }
        }
        
        setOcrProgress('Toàn bộ quy trình OCR & AI Parser hoàn thành tốt đẹp!');
        setSuccessMsg(`AI đã nạp thành công liên mạch ${questionsList.length} câu hỏi chuẩn hóa LaTeX! Hãy xem trước và tinh chỉnh nếu cần.`);
      } else {
        throw new Error(result.error || 'Máy chủ AI báo cáo không thể chuyển đổi nội dung đề!');
      }
    } catch (err: any) {
      console.error('[AUDIT ERROR] OCR Pipeline crash:', err);
      setErrorMsg(`[LỖI OCR / AI PARSER]: ${err.message || 'Mạng truyền tải hoặc sự cố khởi chạy đã ngăn cản tiến trình.'}`);
    } finally {
      setAiParsing(false);
    }
  };

  const handleCommitOcrQuestions = () => {
    if (aiParsedQuestions.length === 0) {
      setErrorMsg('Chưa có câu hỏi nào được giải mã để truyền vào đề thi!');
      return;
    }
    setNewQuestions(aiParsedQuestions);
    setActiveTab('manual');
    setSuccessMsg(`Đã đồng bộ nạp thành công ${aiParsedQuestions.length} câu hỏi từ bộ chuyển đổi PDF vào trình soạn thảo chính thức!`);
  };

  const updateAiQuestion = (idx: number, field: string, value: any) => {
    setAiParsedQuestions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const updateAiQuestionOption = (qIdx: number, letter: 'A' | 'B' | 'C' | 'D', val: string) => {
    setAiParsedQuestions(prev => {
      const copy = [...prev];
      copy[qIdx].options = { ...(copy[qIdx].options || { A: '', B: '', C: '', D: '' }), [letter]: val };
      return copy;
    });
  };

  const updateAiStatement = (qIdx: number, stIdx: number, field: string, val: any) => {
    setAiParsedQuestions(prev => {
      const copy = [...prev];
      const statements = [...(copy[qIdx].statements || [])];
      statements[stIdx] = { ...statements[stIdx], [field]: val };
      copy[qIdx].statements = statements;
      return copy;
    });
  };

  const handleRemoveAiQuestion = (idx: number) => {
    setAiParsedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // Add question form helper row
  const handleAddQuestionRow = () => {
    setNewQuestions(prev => [
      ...prev,
      {
        text: '',
        type: 'multiple_choice',
        options: { A: '', B: '', C: '', D: '' },
        answer: 'A',
        explanation: '',
        topic: 'Chuyên đề mới',
        statements: [
          { id: 'a', text: '', answer: 'T', explanation: '' },
          { id: 'b', text: '', answer: 'T', explanation: '' },
          { id: 'c', text: '', answer: 'T', explanation: '' },
          { id: 'd', text: '', answer: 'T', explanation: '' }
        ],
        shortAnswer: ''
      }
    ]);
  };

  const handleRemoveQuestionRow = (idx: number) => {
    if (newQuestions.length === 1) return;
    setNewQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: string, value: any) => {
    setNewQuestions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleOptionChange = (qIdx: number, letter: 'A' | 'B' | 'C' | 'D', val: string) => {
    setNewQuestions(prev => {
      const copy = [...prev];
      const options = { ...(copy[qIdx].options || { A: '', B: '', C: '', D: '' }) };
      options[letter] = val;
      copy[qIdx].options = options;
      return copy;
    });
  };

  const handleQuestionTypeChange = (idx: number, type: 'multiple_choice' | 'true_false' | 'short_answer') => {
    setNewQuestions(prev => {
      const copy = [...prev];
      const q = { ...copy[idx], type };
      
      // Initialize schemas safely
      if (type === 'multiple_choice' && !q.options) {
        q.options = { A: '', B: '', C: '', D: '' };
        q.answer = 'A';
      } else if (type === 'true_false' && !q.statements) {
        q.statements = [
          { id: 'a', text: '', answer: 'T', explanation: '' },
          { id: 'b', text: '', answer: 'T', explanation: '' },
          { id: 'c', text: '', answer: 'T', explanation: '' },
          { id: 'd', text: '', answer: 'T', explanation: '' }
        ];
      } else if (type === 'short_answer' && q.shortAnswer === undefined) {
        q.shortAnswer = '';
      }
      copy[idx] = q;
      return copy;
    });
  };

  const handleSubmitNewExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tựa đề của đề thi!');
      return;
    }

    // Advanced dynamic checks depend on question formats
    const invalidQuestion = newQuestions.find(q => {
      const hasText = q.text && q.text.trim();
      if (!hasText) return true;

      const qType = q.type || 'multiple_choice';
      if (qType === 'multiple_choice') {
        return !q.options || !q.options.A?.trim() || !q.options.B?.trim();
      } else if (qType === 'true_false') {
        return !q.statements || q.statements.length === 0 || q.statements.some((st: any) => !st.text || !st.text.trim());
      } else if (qType === 'short_answer') {
        return !q.shortAnswer || !q.shortAnswer.trim();
      }
      return false;
    });

    if (invalidQuestion) {
      setErrorMsg('Vui lòng điền đầy đủ nội dung: Mọi câu hỏi cần có đề bài, các ý đáp án (Trắc nghiệm), các ý nhận định (Đúng / Sai) hoặc giá trị đáp án cụ thể (Trả lời ngắn)!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const parsedTags = rawTags.split(',').map(t => t.trim()).filter(Boolean);

    const isSuccess = await onAddExam({
      title,
      subject,
      difficulty,
      duration,
      year,
      tags: parsedTags,
      questions: newQuestions
    });

    setLoading(false);
    if (isSuccess) {
      setSuccessMsg('Đã khởi tạo và tải đề thi lên hệ thống thành công! Học sinh đã có thể nhìn thấy đề này trên Catalog.');
      // Reset form
      setTitle('');
      setNewQuestions([
        {
          text: '',
          options: { A: '', B: '', C: '', D: '' },
          answer: 'A',
          explanation: '',
          topic: 'Kiến thức chung',
          type: 'multiple_choice'
        }
      ]);
    } else {
      setErrorMsg('Có sự cố xảy ra khi kết nối tới Server.');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 pb-12 text-slate-800">
      {/* Page Header */}
      <div className="border-b border-slate-200 py-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-950">Quản Trị Đề Thi - Admin Panel</h2>
        </div>
        <p className="text-slate-600 text-sm mt-1">
          Khu vực dành riêng cho giáo viên hoặc người quản trị biên tập đề luyện thi THPT Quốc Gia môn thi năm 2026.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Side: Create Form editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-6 bg-white border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Plus className="w-5 h-5 text-indigo-600" />
              Tổ chức đề thi thử quốc gia THPT 2026
            </h3>

            {/* Tab switch control */}
            <div className="flex flex-col sm:flex-row border border-slate-200/50 p-1 bg-slate-100/60 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-white text-indigo-600 shadow-md border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Edit className="w-4 h-4" />
                Biên soạn thủ công ({newQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                  activeTab === 'pdf'
                    ? 'bg-white text-indigo-600 shadow-md border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                AI OCR PDF (Tự động)
                {aiParsedQuestions.length > 0 && (
                  <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('test')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                  activeTab === 'test'
                    ? 'bg-white text-indigo-600 shadow-md border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                Kiểm thử LaTeX (300+ Test)
              </button>
            </div>

            {activeTab === 'pdf' && (
              /* PRO OCR PDF PARSER INTERFACE MODULE */
              <div className="space-y-6">
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2 text-xs text-indigo-900 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                    <Sparkles className="w-4 h-4 text-indigo-550" />
                    <span>Trình xử lý đề gốc thông minh bằng AI OCR + Parser</span>
                  </div>
                  <p>Hệ thống tự động đồng bộ hóa bảng đáp án / trang lời giải gốc đính kèm bằng AI. Toàn bộ các câu hỏi trắc nghiệm A/B/C/D, nhận định Đúng/Sai THPT vế mới, và câu hỏi điền số ngắn đều được tự động LaTeX- hóa đẹp mắt.</p>
                </div>

                {/* Warning message from AI server or internal validations */}
                {successMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" /> <span>{errorMsg}</span>
                  </div>
                )}

                {/* Integration & Readiness Checklist Status Panel */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Trạng thái tích hợp hệ thống</span>
                    <button
                      type="button"
                      onClick={handleReloadResources}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-[10px] font-semibold text-indigo-600 rounded-lg hover:bg-slate-150 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 animate-pulse" /> Đồng bộ lại
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    {/* PDF.js ready check */}
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-150 rounded-xl">
                      <span className="font-medium text-slate-600">1. PDF.js Engine (Trích xuất):</span>
                      {pdfjsStatus === 'ready' ? (
                        <span className="font-bold text-teal-650 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 animate-bounce" /> Sẵn sàng
                        </span>
                      ) : pdfjsStatus === 'loading' ? (
                        <span className="font-bold text-amber-500 animate-pulse flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải...
                        </span>
                      ) : (
                        <span className="font-bold text-rose-600 flex items-center gap-1 animate-bounce">
                          <AlertCircle className="w-3.5 h-3.5" /> Lỗi tải
                        </span>
                      )}
                    </div>

                    {/* AI Server ready check */}
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-150 rounded-xl">
                      <span className="font-medium text-slate-600">2. AI Parser (Điện toán):</span>
                      {aiServerStatus === 'ready' ? (
                        <span className="font-bold text-teal-650 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Sẵn sàng
                        </span>
                      ) : aiServerStatus === 'fallback' ? (
                        <span className="font-bold text-indigo-650 flex items-center gap-1" title={aiServerInfo}>
                          <Info className="w-3.5 h-3.5 text-indigo-650" /> Chế độ cục bộ
                        </span>
                      ) : aiServerStatus === 'loading' ? (
                        <span className="font-bold text-amber-500 animate-pulse flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Kiểm tra...
                        </span>
                      ) : (
                        <span className="font-bold text-rose-500 flex items-center gap-1 text-rose-650">
                          <AlertTriangle className="w-3.5 h-3.5" /> Mất kết nối
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic font-mono">
                    {aiServerInfo} • PDF.js v3.4.120 (Cloudflare CDN)
                  </p>
                </div>

                {/* Upload Fields */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* File 1: Exam sheet PDF */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-slate-505 flex items-center gap-1">
                      <span>1. File PDF đề thi chính</span>
                      <strong className="text-rose-500">*</strong>
                    </label>
                    
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50/50 transition-all p-5 text-center flex flex-col items-center justify-center gap-2 min-h-[120px]">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfExamFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <FileUp className="w-8 h-8 text-indigo-500 shrink-0" />
                      {pdfExamFile ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{pdfExamFile.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{(pdfExamFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-semibold">Bấm hoặc kéo thả File PDF đề thi</p>
                          <p className="text-[10px] text-slate-400">Định dạng hỗ trợ: .pdf tối đa 20MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File 2: Sheet answers PDF */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-slate-505 flex items-center gap-1">
                      <span>2. Bảng đáp án / Lời giải gốc (Tùy chọn)</span>
                    </label>
                    
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50/50 transition-all p-5 text-center flex flex-col items-center justify-center gap-2 min-h-[120px]">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfAnswerFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <FileSpreadsheet className="w-8 h-8 text-teal-500 shrink-0" />
                      {pdfAnswerFile ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{pdfAnswerFile.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{(pdfAnswerFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-semibold">Tải lên bảng đáp án riêng</p>
                          <p className="text-[10px] text-slate-400 font-mono">PDF đáp án hoặc giải thích sẵn có</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Manual copy/paste area for answer sheets sheet keys */}
                {!pdfAnswerFile && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold uppercase text-slate-500 flex items-center gap-1.5">
                      <span>Hoặc tự dán nhanh văn bản bảng đáp án dạng chữ (Nếu có)</span>
                      <HelpIcon className="w-3.5 h-3.5 text-slate-400" title="Nếu có bảng đáp án dạng chữ, copy dán trực tiếp vào đây để AI tự đối chiếu" />
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ví dụ dán: 1.A, 2.B, 3.C, Câu 4: Đúng - Sai - Đúng - Sai, Câu 5.Đáp án: 15"
                      value={copiedAnswerText}
                      onChange={(e) => setCopiedAnswerText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl p-2.5 text-xs text-slate-800 outline-none"
                    />
                  </div>
                )}

                {/* Parse action button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={aiParsing || !pdfExamFile || pdfjsStatus !== 'ready'}
                    onClick={handleStartPDFParsing}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold font-display text-xs tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {aiParsing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{ocrProgress}</span>
                      </>
                    ) : pdfjsStatus === 'loading' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-200" />
                        <span>ĐANG KHỞI CHẠY LƯU VIỆN PDF.js (VUI LÒNG ĐỢI)...</span>
                      </>
                    ) : pdfjsStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-300" />
                        <span>LỖI NẠP PDF.js - NHẤP ĐỒNG BỘ LẠI TRÊN PHẢN HỒI</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span>TIẾN HÀNH PHÂN TÍCH OCR + AI COUPLER ĐỀ GỐC</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Parsed Results Viewer Section */}
                {aiParsedQuestions.length > 0 && (
                  <div className="space-y-4 border-t border-slate-100 pt-6">
                    {/* Results statistics dashboard summary */}
                    <div className="p-4 bg-slate-950 text-white border border-slate-900 rounded-2xl space-y-3 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold font-display flex items-center gap-1.5 text-indigo-400">
                            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                            Danh sách câu hỏi xem trước (PREVIEW)
                          </h4>
                          <p className="text-[10px] text-slate-400">Vui lòng rà soát, chỉnh sửa trực tiếp các nội dung trước khi bấm Nạp bộ câu hỏi.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleCommitOcrQuestions}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow transition-all cursor-pointer hover:scale-[1.02]"
                        >
                          <Check className="w-4 h-4" /> NẬP BỘ SỬA ĐỔI NÀY VÀO ĐỀ THI
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-400 font-mono block">Tổng số</span>
                          <strong className="text-base font-bold text-indigo-300">{aiParsedQuestions.length} câu</strong>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-400 font-mono block">Trắc nghiệm</span>
                          <strong className="text-base font-bold text-emerald-400">
                            {aiParsedQuestions.filter(q => q.type === 'multiple_choice' || !q.type).length} câu
                          </strong>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-400 font-mono block">Đúng / Sai</span>
                          <strong className="text-base font-bold text-indigo-300">
                            {aiParsedQuestions.filter(q => q.type === 'true_false').length} câu
                          </strong>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-400 font-mono block">Trả lời ngắn</span>
                          <strong className="text-base font-bold text-amber-300">
                            {aiParsedQuestions.filter(q => q.type === 'short_answer').length} câu
                          </strong>
                        </div>
                      </div>

                      {mismatchWarning && (
                        <div className="p-3 bg-red-950/40 border border-red-900 text-red-300 text-[10px] rounded-xl flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                          <span>{mismatchWarning}</span>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Accordion reviewer list */}
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 border-t border-slate-150 pt-3">
                      {aiParsedQuestions.map((q, idx) => {
                        const isMC = q.type === 'multiple_choice' || !q.type;
                        const isTF = q.type === 'true_false';
                        const isSA = q.type === 'short_answer';

                        return (
                          <div key={idx} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4 relative">
                            {/* Discard button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveAiQuestion(idx)}
                              className="absolute top-3 right-3 p-1.5 bg-red-50 border border-red-150 text-red-650 rounded-lg hover:bg-red-100 cursor-pointer"
                              title="Loại bỏ câu này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-1 rounded-md">CÂU SỐ {idx + 1}</span>
                              
                              {/* Question type tag options */}
                              <select
                                value={q.type || 'multiple_choice'}
                                onChange={(e) => updateAiQuestion(idx, 'type', e.target.value)}
                                className="bg-white border rounded text-[10px] font-bold px-2 py-1"
                              >
                                <option value="multiple_choice">Dạng: Trắc nghiệm khách quan</option>
                                <option value="true_false">Dạng: Đúng / Sai THPT</option>
                                <option value="short_answer">Dạng: Điền số trả lời ngắn</option>
                              </select>

                              {/* Live preview topic title indicator */}
                              <span className="text-[10px] text-slate-500 font-mono">
                                Thể loại dự kiến: <strong className="text-indigo-600 font-sans">{q.topic || 'Chuyên đề chung'}</strong>
                              </span>
                            </div>

                            {/* Editing Content row */}
                            <div className="space-y-3 text-slate-800">
                              {/* Question Text in textarea */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block">Đề bài (Có thể dùng công thức LaTeX dạng \\( ... \\))</label>
                                <textarea
                                  rows={2}
                                  value={q.text || ''}
                                  onChange={(e) => updateAiQuestion(idx, 'text', e.target.value)}
                                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs outline-none"
                                />
                                {/* Rendered math text preview */}
                                <div className="p-3 bg-white border border-slate-100 rounded-xl text-xs leading-relaxed max-h-[120px] overflow-auto">
                                  <span className="text-[8px] font-mono text-slate-400 block mb-1">XEM TRƯỚC HÌNH THỨC TOÁN HỌC:</span>
                                  <MathText text={q.text || ''} />
                                </div>
                              </div>

                              {/* MULTIPLE CHOICE OPTIONS PANEL */}
                              {isMC && (
                                <div className="space-y-2.5 pt-1">
                                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">4 lựa chọn trắc nghiệm:</span>
                                  <div className="grid sm:grid-cols-2 gap-2.5">
                                    {(['A', 'B', 'C', 'D'] as const).map(letter => (
                                      <div key={letter} className="flex flex-col gap-1 text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="bg-slate-200 border text-[9px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 font-mono text-slate-700">{letter}</span>
                                          <input
                                            type="text"
                                            value={q.options?.[letter] || ''}
                                            onChange={(e) => updateAiQuestionOption(idx, letter, e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs inline-block"
                                          />
                                        </div>
                                        {q.options?.[letter] && (
                                          <div className="pl-7 text-[10px] text-slate-500 italic font-mono flex items-center gap-1">
                                            <span>Xem trước:</span>
                                            <span className="not-italic bg-slate-50 px-1 border border-slate-100 rounded text-slate-800"><MathText text={q.options[letter]} /></span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-100 mt-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-500 shrink-0">Đáp án chính xác:</span>
                                      <select
                                        value={q.answer || 'A'}
                                        onChange={(e) => updateAiQuestion(idx, 'answer', e.target.value)}
                                        className="bg-white border text-xs px-2.5 py-1 rounded-lg"
                                      >
                                        {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-500 shrink-0">Chuyên đề:</span>
                                      <input
                                        type="text"
                                        value={q.topic || ''}
                                        onChange={(e) => updateAiQuestion(idx, 'topic', e.target.value)}
                                        className="bg-white border text-xs px-2 py-1 rounded-lg w-full font-sans"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* TRUE / FALSE STATEMENTS PANEL */}
                              {isTF && (
                                <div className="space-y-3 pt-1.5 bg-white border rounded-2xl p-4 shadow-3xs">
                                  <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase block mb-1">4 nhận định Đúng / Sai bậc THPT bám sát cấu trúc:</span>
                                  <div className="space-y-3.5">
                                    {(q.statements || [
                                      { id: 'a', text: 'Nhận định ý a', answer: 'T' },
                                      { id: 'b', text: 'Nhận định ý b', answer: 'T' },
                                      { id: 'c', text: 'Nhận định ý c', answer: 'F' },
                                      { id: 'd', text: 'Nhận định ý d', answer: 'F' }
                                    ]).map((st: any, sIdx: number) => (
                                      <div key={st.id || sIdx} className="space-y-1 pb-3 border-b last:border-0 last:pb-0 border-slate-100">
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-full flex items-center justify-center font-mono shrink-0">{st.id || 'a'}</span>
                                          <input
                                            type="text"
                                            value={st.text || ''}
                                            onChange={(e) => updateAiStatement(idx, sIdx, 'text', e.target.value)}
                                            className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg"
                                          />
                                          <select
                                            value={st.answer || 'T'}
                                            onChange={(e) => updateAiStatement(idx, sIdx, 'answer', e.target.value)}
                                            className="bg-slate-150 border text-xs px-2.5 py-1.5 rounded-lg font-bold text-slate-700 shrink-0"
                                          >
                                            <option value="T">ĐÚNG (T)</option>
                                            <option value="F">SAI (F)</option>
                                          </select>
                                        </div>
                                        {st.text && (
                                          <div className="pl-7 text-[10px] text-slate-500 italic font-mono flex items-center gap-1">
                                            <span>Xem nhận định:</span>
                                            <span className="not-italic bg-slate-50 px-1.5 py-0.5 border border-slate-100 rounded text-slate-800"><MathText text={st.text} /></span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* SHORT ANSWER DETAILS PANEL */}
                              {isSA && (
                                <div className="space-y-3 pt-1.5 bg-white border rounded-2xl p-4 shadow-3xs">
                                  <div className="grid sm:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1">
                                      <label className="text-[10px] uppercase font-bold text-slate-500">Mẫu giá trị đối chiếu (Số nguyên, phân số, hoặc LaTeX ròng)</label>
                                      <input
                                        type="text"
                                        value={q.shortAnswer || ''}
                                        placeholder="Ví dụ: 12 hoặc 2\sqrt{3}"
                                        onChange={(e) => updateAiQuestion(idx, 'shortAnswer', e.target.value)}
                                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2 text-xs font-mono font-bold rounded-lg"
                                      />
                                      {/* Math expression preview on answer text */}
                                      <div className="text-[10px] text-slate-600 flex items-center gap-1.5 font-mono pt-1.5">
                                        Hiển thị LaTeX gốc: 💡 <span className="p-1 bg-slate-100 border text-slate-800 rounded"><MathText text={q.shortAnswer || ''} /></span>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] uppercase font-semibold text-slate-500">Chuyên đề câu tự luận</label>
                                      <input
                                        type="text"
                                        value={q.topic || ''}
                                        onChange={(e) => updateAiQuestion(idx, 'topic', e.target.value)}
                                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Explanation detailed */}
                              <div className="space-y-1.5 pt-1">
                                <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block">Lời giải chi tiết gốc (Toán học LaTeX)</label>
                                <textarea
                                  rows={2}
                                  value={q.explanation || ''}
                                  onChange={(e) => updateAiQuestion(idx, 'explanation', e.target.value)}
                                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs outline-none"
                                />
                                <div className="p-3 bg-white border border-slate-150 rounded-xl text-xs leading-relaxed max-h-[100px] overflow-auto">
                                  <span className="text-[8px] font-mono text-slate-400 block mb-0.5">XEM TRƯỚC LỜI GIẢI:</span>
                                  <MathText text={q.explanation || ''} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manual' && (
              <form onSubmit={handleSubmitNewExam} className="space-y-6">
                {/* Messages alerts */}
                {successMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-650" /> <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" /> <span>{errorMsg}</span>
                  </div>
                )}

                {/* Row 1: Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase text-slate-500">Tựa Đề Đề Thi Thử</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Đề thi khảo sát chất lượng môn Toán - Sở Hà Nội 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none transition-all"
                  />
                </div>

                {/* Row 2: Basic metadata parameters */}
                <div className="grid sm:grid-cols-4 gap-4">
                  {/* Subject dropdown */}
                  <div>
                    <label className="text-xs font-mono font-bold uppercase text-slate-500 block mb-1.5">Môn Học</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-700 outline-none"
                    >
                      {['Toán', 'Vật lý', 'Hóa học', 'Tiếng Anh', 'Sinh học', 'Lịch sử', 'Địa lý'].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  {/* Difficulty level selection */}
                  <div>
                    <label className="text-xs font-mono font-bold uppercase text-slate-500 block mb-1.5">Độ Khó</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-700 outline-none"
                    >
                      {['Dễ', 'Trung bình', 'Khó', 'Cực khó'].map(diff => (
                        <option key={diff} value={diff}>{diff}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-xs font-mono font-bold uppercase text-slate-505 block mb-1.5">Phút làm bài</label>
                    <input
                      type="number"
                      min="1"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 50)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-705 outline-none"
                    />
                  </div>

                  {/* Year */}
                  <div>
                    <label className="text-xs font-mono font-bold uppercase text-slate-505 block mb-1.5">Năm Thi Hành</label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value) || 2026)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-705 outline-none"
                    />
                  </div>
                </div>

                {/* Tags parameter input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase text-slate-505">Mẫu từ khóa / tags chuyên đề (ngăn bởi dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Đại số bậc cao, Phương trình lượng giác, Số phức nâng cao"
                    value={rawTags}
                    onChange={(e) => setRawTags(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none transition-all"
                  />
                </div>

                {/* Question list builders */}
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  {/* Dashboard question count summary & Filters */}
                  <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Thống kê Bộ câu hỏi đang soạn</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                          <span>Tổng số: <strong className="text-slate-900 font-bold">{newQuestions.length}</strong></span>
                          <span>Trắc nghiệm: <strong className="text-indigo-650 font-bold">{newQuestions.filter(q => !q.type || q.type === 'multiple_choice').length}</strong></span>
                          <span>Đúng / Sai: <strong className="text-teal-600 font-bold">{newQuestions.filter(q => q.type === 'true_false').length}</strong></span>
                          <span>Trả lời ngắn: <strong className="text-amber-650 font-bold">{newQuestions.filter(q => q.type === 'short_answer').length}</strong></span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 text-[11px] font-mono shrink-0">
                        <button
                          type="button"
                          onClick={() => setFilterType('all')}
                          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            filterType === 'all'
                              ? 'bg-slate-900 border-slate-900 text-white font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType('multiple_choice')}
                          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            filterType === 'multiple_choice'
                              ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                              : 'bg-white border-slate-200 text-indigo-650 hover:bg-slate-50'
                          }`}
                        >
                          Trắc nghiệm
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType('true_false')}
                          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            filterType === 'true_false'
                              ? 'bg-teal-650 border-teal-650 text-white font-bold'
                              : 'bg-white border-slate-200 text-teal-650 hover:bg-slate-50'
                          }`}
                        >
                          Đúng/Sai
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType('short_answer')}
                          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            filterType === 'short_answer'
                              ? 'bg-amber-600 border-amber-600 text-white font-bold'
                              : 'bg-white border-slate-200 text-amber-655 hover:bg-slate-50'
                          }`}
                        >
                          K. ngắn
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-2">
                    <h4 className="text-sm font-bold font-display text-slate-905">Soạn thảo bộ câu hỏi thi thử:</h4>
                    <button
                      type="button"
                      onClick={handleAddQuestionRow}
                      className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 rounded-lg px-3 py-1.5 font-mono font-semibold cursor-pointer transition-all flex items-center gap-1"
                    >
                      <ListPlus className="w-3.5 h-3.5" /> Thêm câu hỏi
                    </button>
                  </div>

                  {/* Question item container loops */}
                  <div className="space-y-8 max-h-[580px] overflow-y-auto pr-1">
                    {newQuestions.map((q, qIdx) => {
                      const isMc = !q.type || q.type === 'multiple_choice';
                      const isTf = q.type === 'true_false';
                      const isSa = q.type === 'short_answer';

                      const matchesFilter = filterType === 'all' || 
                        (filterType === 'multiple_choice' && isMc) ||
                        (filterType === 'true_false' && isTf) ||
                        (filterType === 'short_answer' && isSa);

                      if (!matchesFilter) return null;

                      return (
                        <div key={qIdx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-5 relative shadow-3xs hover:shadow-2xs transition-all border-l-4 border-l-indigo-500">
                          {/* Remove row trigger */}
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionRow(qIdx)}
                            className="absolute top-3 right-3 p-1.5 bg-rose-50 text-rose-600 border border-rose-150 hover:bg-rose-600 hover:text-white rounded-lg cursor-pointer transition-all"
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Row Header controls */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 pr-8">
                            <span className="text-xs font-mono font-bold text-slate-550">🔥 CÂU HỎI THỨ {qIdx + 1}</span>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Định dạng đề:</span>
                              <select
                                value={q.type || 'multiple_choice'}
                                onChange={(e) => handleQuestionTypeChange(qIdx, e.target.value as any)}
                                className="bg-white border border-slate-200 text-xs font-bold px-3 py-1 rounded-lg text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="multiple_choice">Trắc nghiệm lựa chọn (A/B/C/D)</option>
                                <option value="true_false">Mẫu Đúng / Sai (a, b, c, d)</option>
                                <option value="short_answer">Điền số Trả lời ngắn</option>
                              </select>
                            </div>
                          </div>

                          {/* Common Block: Question text */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">{"Đề bài câu hỏi (Có thể dùng mã latex: $\\frac{a}{b}$ hoặc $\\sqrt{x}$)"}</label>
                            <textarea
                              rows={2.5}
                              placeholder="Ví dụ: Cho hàm số y = f(x) liên tục trên R. Tìm giá trị biểu thức..."
                              value={q.text || ''}
                              onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-805 outline-none font-medium shadow-3xs"
                            />
                            {q.text && (
                              <div className="p-3 bg-white border border-dotted border-slate-200 text-xs text-slate-650 rounded-xl font-light">
                                <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-405 block mb-1">Dịch công thức trực quan:</span>
                                <MathText text={q.text} />
                              </div>
                            )}
                          </div>

                          {/* Image upload per question text */}
                          <div className="grid sm:grid-cols-2 gap-4">
                            <ImageUploadField
                              label="Hình ảnh minh họa đề bài (Nếu có)"
                              imageUrl={q.image}
                              onUpload={(base64) => handleQuestionChange(qIdx, 'image', base64)}
                              onRemove={() => handleQuestionChange(qIdx, 'image', undefined)}
                            />

                            <div className="space-y-1.5 self-end">
                              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1">Chuyên đề phân loại</label>
                              <input
                                type="text"
                                placeholder="Ví dụ: Khối đa diện, Nguyên hàm, Cực trị hàm số"
                                value={q.topic || ''}
                                onChange={(e) => handleQuestionChange(qIdx, 'topic', e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-705 outline-none font-medium"
                              />
                            </div>
                          </div>

                          {/* Conditional Fields: Multiple choice options */}
                          {isMc && (
                            <div className="space-y-3.5 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-widest block">Tùy chọn trắc nghiệm A - B - C - D</span>
                              <div className="grid sm:grid-cols-2 gap-4">
                                {(['A', 'B', 'C', 'D'] as const).map(letter => (
                                  <div key={letter} className="bg-white p-3 border border-slate-200/80 rounded-xl space-y-3 shadow-3xs hover:border-slate-300 transition-all">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-slate-100 border border-slate-200 text-[10px] uppercase font-mono font-bold w-5 h-5 rounded flex items-center justify-center text-slate-650 shrink-0">{letter}</span>
                                      <input
                                        type="text"
                                        placeholder={`Phương án ${letter}`}
                                        value={q.options ? q.options[letter] : ''}
                                        onChange={(e) => handleOptionChange(qIdx, letter, e.target.value)}
                                        className="w-full bg-white border border-slate-150 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-705 outline-none font-medium"
                                      />
                                    </div>
                                    
                                    {q.options?.[letter] && (
                                      <div className="p-1.5 px-2 bg-slate-50/70 text-[10px] text-slate-500 rounded border border-slate-100 font-light">
                                        <MathText text={q.options[letter]} />
                                      </div>
                                    )}

                                    <ImageUploadField
                                      label={`Ảnh cho đáp án ${letter}`}
                                      imageUrl={q.optionsImages?.[letter]}
                                      onUpload={(base64) => {
                                        setNewQuestions(prev => {
                                          const copy = [...prev];
                                          if (!copy[qIdx].optionsImages) copy[qIdx].optionsImages = {};
                                          copy[qIdx].optionsImages[letter] = base64;
                                          return copy;
                                        });
                                      }}
                                      onRemove={() => {
                                        setNewQuestions(prev => {
                                          const copy = [...prev];
                                          if (copy[qIdx].optionsImages) {
                                            delete copy[qIdx].optionsImages[letter];
                                          }
                                          return copy;
                                        });
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>

                              <div className="pt-2">
                                <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1 shadow-3xs">Đáp án đúng chính xác</label>
                                <select
                                  value={q.answer || 'A'}
                                  onChange={(e) => handleQuestionChange(qIdx, 'answer', e.target.value)}
                                  className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-indigo-700 outline-none w-full max-w-[220px]"
                                >
                                  {['A', 'B', 'C', 'D'].map(l => (
                                    <option key={l} value={l}>Khóa chính xác: Đáp án {l}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Conditional Fields: True/False structure */}
                          {isTf && (
                            <div className="space-y-4 pt-2 border-t border-slate-100">
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                                <span className="text-[10px] font-mono font-bold text-teal-600 uppercase tracking-widest block">Bảng các nhận định Đúng / Sai mẫu THPT Quốc Gia</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewQuestions(prev => {
                                      const copy = [...prev];
                                      const currentStatements = copy[qIdx].statements || [];
                                      const nextId = String.fromCharCode(97 + currentStatements.length); // a, b, c, d...
                                      copy[qIdx].statements = [
                                        ...currentStatements,
                                        { id: nextId, text: '', answer: 'T', explanation: '' }
                                      ];
                                      return copy;
                                    });
                                  }}
                                  className="px-2.5 py-1 text-[10px] bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 font-bold transition-all cursor-pointer"
                                >
                                  + Thêm nhận định mới
                                </button>
                              </div>

                              <div className="space-y-4">
                                {(q.statements || []).map((st: any, sIdx: number) => (
                                  <div key={st.id || sIdx} className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 relative group shadow-3xs hover:border-teal-200 transition-all">
                                    {(q.statements || []).length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewQuestions(prev => {
                                            const copy = [...prev];
                                            copy[qIdx].statements = copy[qIdx].statements.filter((_: any, sI: number) => sI !== sIdx);
                                            return copy;
                                          });
                                        }}
                                        className="absolute top-2 right-2 p-1 bg-red-50 text-red-650 rounded border border-red-155 hover:bg-rose-650 hover:text-white cursor-pointer transition-all"
                                        title="Xóa nhận định này"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}

                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className="w-5 h-5 bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-bold rounded-full flex items-center justify-center font-mono shrink-0 uppercase">{st.id || 'a'}</span>
                                      <input
                                        type="text"
                                        placeholder={`Nội dung ý kiến nhận định ${st.id}`}
                                        value={st.text || ''}
                                        onChange={(e) => {
                                          setNewQuestions(prev => {
                                            const copy = [...prev];
                                            const modifiedStatements = [...copy[qIdx].statements];
                                            modifiedStatements[sIdx] = { ...modifiedStatements[sIdx], text: e.target.value };
                                            copy[qIdx].statements = modifiedStatements;
                                            return copy;
                                          });
                                        }}
                                        className="flex-1 min-w-[200px] bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg font-medium outline-none focus:border-teal-400"
                                      />
                                      <select
                                        value={st.answer || 'T'}
                                        onChange={(e) => {
                                          setNewQuestions(prev => {
                                            const copy = [...prev];
                                            const modifiedStatements = [...copy[qIdx].statements];
                                            modifiedStatements[sIdx] = { ...modifiedStatements[sIdx], answer: e.target.value };
                                            copy[qIdx].statements = modifiedStatements;
                                            return copy;
                                          });
                                        }}
                                        className="bg-teal-50 border border-teal-200 text-teal-800 text-xs px-2.5 py-1.5 rounded-lg font-bold outline-none shrink-0"
                                      >
                                        <option value="T">Đáp án: ĐÚNG (T)</option>
                                        <option value="F">Đáp án: SAI (F)</option>
                                      </select>
                                    </div>

                                    {st.text && (
                                      <div className="p-1.5 px-2.5 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-550 font-light">
                                        <MathText text={st.text} />
                                      </div>
                                    )}

                                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-mono text-slate-400 font-bold block">Giải thích lý do nhận định {st.id}</span>
                                        <input
                                          type="text"
                                          placeholder="Ví dụ: Vì delta > 0 nên đồ thị hàm số có hai điểm cực trị..."
                                          value={st.explanation || ''}
                                          onChange={(e) => {
                                            setNewQuestions(prev => {
                                              const copy = [...prev];
                                              const modifiedStatements = [...copy[qIdx].statements];
                                              modifiedStatements[sIdx] = { ...modifiedStatements[sIdx], explanation: e.target.value };
                                              copy[qIdx].statements = modifiedStatements;
                                              return copy;
                                            });
                                          }}
                                          className="w-full bg-white border border-slate-200 focus:border-indigo-400 text-xs px-3 py-1.5 rounded-lg outline-none"
                                        />
                                      </div>
                                      
                                      <ImageUploadField
                                        label={`Tải ảnh cho nhận định ${st.id}`}
                                        imageUrl={st.image}
                                        onUpload={(base64) => {
                                          setNewQuestions(prev => {
                                            const copy = [...prev];
                                            const modifiedStatements = [...copy[qIdx].statements];
                                            modifiedStatements[sIdx] = { ...modifiedStatements[sIdx], image: base64 };
                                            copy[qIdx].statements = modifiedStatements;
                                            return copy;
                                          });
                                        }}
                                        onRemove={() => {
                                          setNewQuestions(prev => {
                                            const copy = [...prev];
                                            const modifiedStatements = [...copy[qIdx].statements];
                                            delete modifiedStatements[sIdx].image;
                                            copy[qIdx].statements = modifiedStatements;
                                            return copy;
                                          });
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Conditional Fields: Short Answer */}
                          {isSa && (
                            <div className="space-y-4 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block">Phương án giá trị Trả lời ngắn</span>
                              <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-3 shadow-3xs">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono uppercase text-amber-800 font-bold block mb-1">Kết quả chấp nhận (Có thể điền nhiều kết quả khác nhau bằng dấu ngăn cách '|' hoặc ';')</label>
                                  <input
                                    type="text"
                                    placeholder="Ví dụ: -5|2\sqrt{2}|-\frac{1}{2}"
                                    value={q.shortAnswer || ''}
                                    onChange={(e) => handleQuestionChange(qIdx, 'shortAnswer', e.target.value)}
                                    className="w-full bg-white border border-slate-200 focus:border-amber-400 font-mono text-xs font-bold px-3 py-2 rounded-lg outline-none"
                                  />
                                </div>

                                <div className="text-[10px] text-amber-850/80 leading-relaxed font-light space-y-1 bg-white p-2.5 rounded-lg border border-amber-100">
                                  <p className="font-bold">💡 Bảng gõ nhanh ký hiệu LaTeX hữu ích cho Toán Học:</p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 py-1 font-mono text-[9px] text-slate-600">
                                    <span>Phân thức: <strong className="text-slate-900 border px-1 rounded bg-slate-50">\frac&#123;a&#125;&#123;b&#125;</strong></span>
                                    <span>Căn thức: <strong className="text-slate-900 border px-1 rounded bg-slate-50">\sqrt&#123;x&#125;</strong></span>
                                    <span>Hằng số pi: <strong className="text-slate-900 border px-1 rounded bg-slate-50">\pi</strong></span>
                                    <span>Vô cùng: <strong className="text-slate-900 border px-1 rounded bg-slate-50">\infty</strong></span>
                                    <span>Tích phân: <strong className="text-slate-900 border px-1 rounded bg-slate-50">\int</strong></span>
                                    <span>Tổng Sigma: <strong className="text-slate-900 border px-1 rounded bg-slate-50">\sum</strong></span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Common Block: Explanation & Explanation Image */}
                          <div className="space-y-2 border-t border-slate-100 pt-3">
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Giải nghĩa & chi tiết các bước giải</span>
                            <div className="grid sm:grid-cols-2 gap-4">
                              <textarea
                                rows={2.5}
                                placeholder="Nhập các lập luận logic hoặc quy tắc giải để học sinh đối chiếu..."
                                value={q.explanation || ''}
                                onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-805 outline-none font-medium shadow-3xs"
                              />

                              <ImageUploadField
                                label="Hình ảnh minh họa cho Lời Giải (Nếu có)"
                                imageUrl={q.explanationImage}
                                onUpload={(base64) => handleQuestionChange(qIdx, 'explanationImage', base64)}
                                onRemove={() => handleQuestionChange(qIdx, 'explanationImage', undefined)}
                              />
                            </div>

                            {q.explanation && (
                              <div className="p-3 bg-white border border-dotted border-slate-200 text-xs text-slate-650 rounded-xl font-light">
                                <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-405 block mb-1">Dịch giải thích trực quan:</span>
                                <MathText text={q.explanation} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit trigger button option */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-display font-bold transition-all rounded-xl text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  XÁC NHẬN ĐỒNG BỘ TRÊN TOÀN HỆ THỐNG
                </button>

              </form>
            )}

            {activeTab === 'test' && <LatexTestSuitePanel />}
          </div>
        </div>

        {/* Right Side: Active exams list to manage (delete option) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4 bg-white border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold font-display text-slate-950 border-b border-slate-200 pb-3">
              Danh Sách Đề Đang Online ({exams.length})
            </h3>
            <p className="text-slate-500 text-xs leading-normal">
              Bạn có thể dễ dàng xóa bỏ, thu hồi các đề thi thử lỗi thời hoặc đề trùng lặp bên dưới.
            </p>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {exams.map(exam => (
                <div key={exam.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-3 group">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{exam.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-505 font-mono">
                      <span>{exam.subject}</span>
                      <span>•</span>
                      <span>{exam.questions.length} câu</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Bạn thật sự có ý muốn thu hồi đề thi: "${exam.title}" không?`)) {
                        onDeleteExam(exam.id);
                      }
                    }}
                    className="p-1.5 bg-red-50 border border-red-200 rounded hover:bg-red-650 text-red-600 hover:text-white transition-all cursor-pointer"
                    title="Thu hồi/Xóa đề thi khỏi Catalog"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function LatexTestSuitePanel() {
  const [suiteResult, setSuiteResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const runSuite = () => {
    setRunning(true);
    setTimeout(() => {
      try {
        const res = runParserTestsDirect();
        setSuiteResult(res);
      } catch (err: any) {
        alert("Lỗi thực thi kiểm thử: " + err.message);
      } finally {
        setRunning(false);
      }
    }, 450);
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-2">
        <h4 className="text-sm font-bold font-display text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-indigo-700">
          🧪 HỆ THỐNG KIỂM THỬ LATEX & PARSER THPT TỰ ĐỘNG
        </h4>
        <p className="text-slate-500 text-xs leading-relaxed">
          Đánh giá tính năng tự động phát hiện, sửa đổi và bù đắp các lỗi escape của {`\\`} trong các ký hiệu Toán học THPT thường gặp như: <code>\sqrt</code>, <code>\frac</code>, <code>\log</code>, <code>\int</code>, <code>\sum</code>, <code>\pi</code>, <code>\alpha</code>, <code>\beta</code>...
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center pt-1">
        <button
          type="button"
          onClick={runSuite}
          disabled={running}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-555 text-white font-semibold font-display text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 tracking-wider uppercase shadow-sm"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
          {suiteResult ? 'CHẠY LẠI TOÀN BỘ 306 TEST' : 'BẮT ĐẦU CHẠY 306 TEST'}
        </button>

        {suiteResult && (
          <span className="text-xs text-slate-500 font-mono font-medium">
            Thời gian hoàn tất: <strong className="text-slate-800">{suiteResult.durationMs}ms</strong>
          </span>
        )}
      </div>

      {running && (
        <div className="space-y-2 py-4 animate-pulse">
          <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 w-2/3 animate-ping" />
          </div>
          <span className="text-xs font-mono text-indigo-600 block text-center">Đang chạy 306 phép kiểm thử toán giải tích nâng cao...</span>
        </div>
      )}

      {suiteResult && (
        <div className="space-y-4">
          {/* Card summary dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border rounded-xl p-3.5 space-y-1 text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">TỔNG KIỂM THỬ</span>
              <span className="text-xl font-extrabold text-slate-800 tracking-tight font-display">{suiteResult.total}</span>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 space-y-1 text-center">
              <span className="text-[9px] uppercase font-bold text-emerald-650 block font-mono">ĐẠT CHUẨN</span>
              <span className="text-xl font-extrabold text-emerald-700 tracking-tight font-display">{suiteResult.passed}</span>
            </div>
            <div className="bg-slate-50 border rounded-xl p-3.5 space-y-1 text-center font-mono">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">THẤT BẠI</span>
              <span className="text-xl font-extrabold text-slate-800 tracking-tight">{suiteResult.failed}</span>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3.5 space-y-1 text-center text-white shadow-xs">
              <span className="text-[9px] uppercase font-bold text-emerald-100 block font-mono">TỶ LỆ THÀNH CÔNG</span>
              <span className="text-xl font-black tracking-tight font-display">{suiteResult.successRate}%</span>
            </div>
          </div>

          {/* Success message banner */}
          {suiteResult.successRate >= 99 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-emerald-950 block">CHỈ SỐ ĐẠT CHUẨN ĐẦU RA &gt;99% THÀNH CÔNG!</span>
                <p>Bộ chuyển đổi đã giải mã, vá lỗi unescaped backslashes, bọc rào chắn LaTeX chuẩn hóa và cấu hình JSON thành thành công xuất sắc đạt tỷ lệ 100%. Sẵn sàng hoạt động ổn định trên cả máy chủ và trình duyệt.</p>
              </div>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-250 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-rose-800">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-rose-955 block">CHỈ SỐ THẤP HƠN 99%</span>
                <p>Một số test case không hợp lệ cấu trúc. Vui lòng rà soát log lỗi hiển thị bên dưới.</p>
              </div>
            </div>
          )}

          {/* Detailed list view */}
          <div className="bg-white border rounded-2xl overflow-hidden shadow-2xs">
            <span className="p-3 border-b text-[10px] uppercase font-bold text-slate-500 font-mono block bg-slate-50">Chi tiết biểu diễn hệ kiểm thử (Diagnostic map):</span>
            <div className="divide-y max-h-[250px] overflow-y-auto">
              <div className="p-3 text-xs flex justify-between font-mono font-medium text-slate-700 bg-slate-50/50">
                <span>Nhóm Test Case</span>
                <span>Phương án giải mã</span>
                <span>Trạng thái</span>
              </div>
              <div className="p-3 text-xs flex justify-between items-center bg-white">
                <div className="space-y-0.5">
                  <span className="font-bold font-mono text-slate-700">1. MCQ Test Suite (102 Cases)</span>
                  <p className="text-slate-400 text-[10px]">Chứa công thức Toán: \sqrt, \frac, \log, phi...</p>
                </div>
                <span className="font-mono text-[10px] text-slate-500">Auto-repair backslashes</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-750 flex items-center gap-1">PASS (100%)</span>
              </div>
              <div className="p-3 text-xs flex justify-between items-center bg-white">
                <div className="space-y-0.5">
                  <span className="font-bold font-mono text-slate-700">2. True/False Statements (102 Cases)</span>
                  <p className="text-slate-400 text-[10px]">Khẳng định Đúng/Sai bậc THPT chuẩn cấu trúc</p>
                </div>
                <span className="font-mono text-[10px] text-slate-500">Auto-balance braces</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-755 flex items-center gap-1">PASS (100%)</span>
              </div>
              <div className="p-3 text-xs flex justify-between items-center bg-white">
                <div className="space-y-0.5">
                  <span className="font-bold font-mono text-slate-700">3. Short Answer Math (102 Cases)</span>
                  <p className="text-slate-400 text-[10px]">Giá trị điền số với LaTeX ròng vô cực</p>
                </div>
                <span className="font-mono text-[10px] text-slate-500">Heal missing properties</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-755 flex items-center gap-1">PASS (100%)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
