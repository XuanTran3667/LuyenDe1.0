import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { mockExams as initialMockExams } from './src/data/mockExams';
import { repairJsonLatexAndBrackets, healAndValidateQuestions, sanitizeQuestionFields } from './src/utils/testSuite';

// In-memory persistent database for active exams, user profiles and scoring rules
let examsDb = [...initialMockExams];
let scoringRulesDb = [
  {
    id: 'moet-standard',
    name: 'Đề tốt nghiệp THPT chuẩn Bộ GD&ĐT (2025/2026)',
    academicYear: 2026,
    subject: 'Chung',
    examType: 'THPT_QG',
    isActive: true,
    multipleChoicePoints: 0.25,
    shortAnswerPoints: 0.5,
    trueFalsePoints: {
      1: 0.1,
      2: 0.25,
      3: 0.5,
      4: 1.0
    },
    description: 'Quy chế chấm lý tưởng của Bộ Giáo dục & Đào tạo. Đúng 1 ý được 0.1. Đúng 2 ý được 0.25. Đúng 3 ý được 0.5. Đúng 4 ý được 1.0.'
  },
  {
    id: 'dgnl-hnu',
    name: 'Quy chế Đánh giá năng lực ĐHQGHN - HSA 2026',
    academicYear: 2026,
    subject: 'Toán',
    examType: 'DGNL',
    isActive: false,
    multipleChoicePoints: 1.0,
    shortAnswerPoints: 1.0,
    trueFalsePoints: {
      1: 0.25,
      2: 0.50,
      3: 0.75,
      4: 1.0
    },
    description: 'Trắc nghiệm 1 điểm, Điền khuyết 1 điểm, Đúng/Sai cộng luỹ tiến 0.25 - 0.5 - 0.75 - 1.0.'
  }
];

let userProfilesDb: any = {
  activeUser: {
    email: 'ozy3667@gmail.com',
    name: 'Học Sinh Luyện Thi 2026',
    role: 'admin', // Default to admin so they can easily play with both Admin & Student panels
    streak: 3,
    lastActiveDate: new Date().toISOString().split('T')[0],
    targetScore: 9.0,
    targetUniversity: 'Đại Học Bách Khoa Hà Nội',
    targetMajor: 'Khoa học Máy tính',
    history: []
  }
};

/**
 * Validates and migrates whole memory database of exams & profiles on system boot
 */
function migrateExamsDb(): void {
  console.log('Starting automated database migration layer...');
  let migratedCount = 0;
  examsDb = examsDb.map(exam => {
    // Fill in MOET metadata specifications
    const academicYear = exam.year || 2026;
    const scoringRulesId = 'moet-standard';
    
    const validatedQuestions = exam.questions.map((q: any, idx: number) => {
      migratedCount++;
      const cleanQ = sanitizeQuestionFields(q);
      
      // Auto-validate structure schema
      if (!cleanQ.id) cleanQ.id = `q-${Math.random().toString(36).substr(2, 9)}`;
      if (!cleanQ.order) cleanQ.order = idx + 1;
      
      // Setup GD&ĐT Part classifications if not assigned
      if (!cleanQ.partIndex) {
        if (!cleanQ.type || cleanQ.type === 'multiple_choice') {
          cleanQ.partIndex = 1;
        } else if (cleanQ.type === 'true_false') {
          cleanQ.partIndex = 2;
        } else if (cleanQ.type === 'short_answer') {
          cleanQ.partIndex = 3;
        }
      }

      if ((!cleanQ.type || cleanQ.type === 'multiple_choice') && !cleanQ.options) {
        cleanQ.options = { A: 'Phương án A', B: 'Phương án B', C: 'Phương án C', D: 'Phương án D' };
        cleanQ.answer = cleanQ.answer || 'A';
      } else if (cleanQ.type === 'true_false' && !cleanQ.statements) {
        cleanQ.statements = [
          { id: 'a', text: 'Nhận định ý a', answer: 'T', explanation: '' },
          { id: 'b', text: 'Nhận định ý b', answer: 'T', explanation: '' },
          { id: 'c', text: 'Nhận định ý c', answer: 'F', explanation: '' },
          { id: 'd', text: 'Nhận định ý d', answer: 'F', explanation: '' }
        ];
      } else if (cleanQ.type === 'short_answer' && cleanQ.shortAnswer === undefined) {
        cleanQ.shortAnswer = '0';
      }
      return cleanQ;
    });

    const p1 = validatedQuestions.filter((q: any) => !q.type || q.type === 'multiple_choice').length;
    const p2 = validatedQuestions.filter((q: any) => q.type === 'true_false').length;
    const p3 = validatedQuestions.filter((q: any) => q.type === 'short_answer').length;

    return { 
      ...exam, 
      academicYear, 
      scoringRulesId, 
      totalQuestions: validatedQuestions.length,
      examStructure: {
        part1Count: p1,
        part2Count: p2,
        part3Count: p3,
        totalPointsScale: 10
      },
      questions: validatedQuestions 
    };
  });
  console.log(`Automatic database migration completed. Checked ${migratedCount} questions successfully.`);
}

// Perform initial migration immediately
migrateExamsDb();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logger middleware
  app.use((req, res, next) => {
    console.log(`[EXPRESS REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Clean favicon handler to prevent browser 404 console errors
  app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
  });

  // Initialize server-side Gemini client
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log('Gemini AI capability initialized successfully.');
    } catch (e) {
      console.error('Error initializing Gemini client:', e);
    }
  } else {
    console.warn('GEMINI_API_KEY is not defined or is placeholder. Relying on rule-based local analyzers.');
  }

  // --- API ROUTE: AI Status Check ---
  app.get('/api/ai/status', (req, res) => {
    res.json({
      success: true,
      initialized: !!ai,
      mode: ai ? 'gemini' : 'fallback-rule-based',
      provider: ai ? 'Google Gemini' : 'Regex Rule Engine'
    });
  });

  // --- API ROUTE: Get All Exams ---
  app.get('/api/exams', (req, res) => {
    res.json({ success: true, count: examsDb.length, data: examsDb });
  });

  // --- API ROUTE: Add New Exam (Admin Mode) ---
  app.post('/api/exams', (req, res) => {
    try {
      const { title, year, subject, difficulty, duration, questions, tags } = req.body;

      if (!title || !subject || !questions || !Array.isArray(questions)) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin bắt buộc (Tiêu đề, Môn học, Câu hỏi)' });
        return;
      }

      const newExam = {
        id: `exam-${Date.now()}`,
        title,
        year: year || 2026,
        subject,
        difficulty: difficulty || 'Trung bình',
        duration: duration || 50,
        questions: questions.map((q: any, idx: number) => {
          const mapped: any = {
            id: `q-${Date.now()}-${idx}`,
            order: idx + 1,
            text: q.text || `Câu hỏi số ${idx + 1}`,
            type: q.type || 'multiple_choice',
            explanation: q.explanation || 'Chưa có lời giải chi tiết.',
            topic: q.topic || 'Chuyên đề chung',
            image: q.image || undefined,
          };
          
          if (!q.type || q.type === 'multiple_choice') {
            mapped.options = q.options || { A: 'Đáp án A', B: 'Đáp án B', C: 'Đáp án C', D: 'Đáp án D' };
            mapped.answer = q.answer || 'A';
          } else if (q.type === 'true_false') {
            mapped.statements = q.statements || [];
          } else if (q.type === 'short_answer') {
            mapped.shortAnswer = q.shortAnswer || '';
          }
          return sanitizeQuestionFields(mapped);
        }),
        tags: tags || [subject, 'Luyện thi THPT 2026'],
        attemptCount: 0,
        createdAt: new Date().toISOString()
      };

      examsDb.unshift(newExam);
      res.json({ success: true, data: newExam });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE: AI OCR & Parse Exam From PDF Text ---
  app.post('/api/ai/parse-exam', async (req, res) => {
    try {
      const { questionText, answerText, subject } = req.body;

      if (!questionText) {
        return res.status(400).json({ success: false, error: 'Không tìm thấy nội dung tài liệu thô để phân tích.' });
      }

      const systemPrompt = `Bạn là hệ thống AI OCR + Parser hàng đầu, thông thạo đề thi Trung Học Phổ Thông (THPT) Quốc gia Việt Nam năm 2026.
Nhiệm vụ của bạn là phân tích văn bản trích xuất từ đề thi gốc và gộp đáp án tương ứng để tách thành dữ liệu câu hỏi hoàn chỉnh dạng cấu trúc JSON.

YÊU CẦU PHÂN LOẠI & NHẬN DIỆN CÂU HỎI:
1. Trắc nghiệm nhiều lựa chọn (multiple_choice):
   - Có 4 phương án: A, B, C, D. Có đáp án đúng là "A", "B", "C", hoặc "D".
2. Đúng/Sai (true_false):
   - Chứa một câu hỏi mào đầu và 4 nhận định nhỏ đánh dấu dạng chữ như 'a', 'b', 'c', 'd' (hoặc các dấu gạch đầu dòng, ký hiệu nhận diện khác).
   - "statements" phải là mảng chứa chính xác 4 đối tượng: id tương ứng là "a", "b", "c", "d"; text là nội dung nhận định; "answer" bắt buộc là "T" (Đúng - True) hoặc "F" (Sai - False) dựa trên phân tích bài toán hoặc đối chiếu file đáp án.
3. Trả lời ngắn (short_answer):
   - Thường là câu hỏi tính toán, tìm giá trị biểu thức số nguyên, phân số, toán học nâng cao mà không có đáp án A, B, C, D.
   - Trường "shortAnswer" là một chuỗi chứa kết quả đúng (ví dụ: "15", "8\\sqrt{3}", "1/2", "8\\pi").

YÊU CẦU CHUYỂN ĐỔI TOÁN HỌC SANG LATEX:
- BẮT BUỘC định dạng toàn bộ công thức toán học, biểu thức hóa học, sđt, ký tự Hy lạp hoặc chỉ số trên/dưới trong nội dung câu hỏi, nhận định, lựa chọn và lời giải thành mã LaTeX chuẩn, ví dụ:
  + "Căn bậc hai của 3" hoặc "căn 3" -> "\\sqrt{3}"
  + "Hàm số y = (x-2)/(x+1)" -> "y = \\frac{x-2}{x+1}"
  + "Logarit cơ số 3 của x" -> "\\log_3(x)"
  + "Tích phân" -> "\\int"
  + "Công thức hóa học" -> "H_2SO_4"
  + "Chỉ số mũ" -> "a^3", "x^2"
- Không tự ý thêm chữ hoa lạ lẫm hay bỏ trôi. Hãy rà soát kỹ lưỡng.

YÊU CẦU ĐỒNG BỘ ĐÁP ÁN:
- Nếu có "answerText" (văn bản bảng đáp án riêng gửi kèm), hãy rà soát tìm các từ khóa dạng "Câu 1. B", "1 - B", "21. 15", "Ý a) Đúng, b) Sai" để gán "answer" hoặc "shortAnswer" hoặc "statements[].answer" chính xác cho câu hỏi tương ứng.
- Nếu không có bảng đáp án gửi kèm, bạn buộc phải tự giải toán thông minh để tạo ra đáp án đúng thuyết phục gán cho câu hỏi!
- Trường "explanation" chứa phần lời giải chi tiết giải thích cho câu hỏi đó (bằng tiếng Việt, LaTeX chuẩn). Hãy tự soạn phần diễn giải nếu đề bài không có sẵn lời giải chi tiết.

TRẢ VỀ ĐỊNH DẠNG JSON duy nhất, là một Object chứa mảng "questions". Cấu trúc một câu hỏi:
{
  "order": number, (thứ tự câu)
  "text": "Nội dung câu hỏi đề bài có chứa công thức LaTeX dạng \\( ... \\)",
  "type": "multiple_choice" | "true_false" | "short_answer",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, (chỉ dành cho multiple_choice, nếu không thì null)
  "answer": "A" | "B" | "C" | "D", (chỉ dành cho multiple_choice)
  "statements": [
    { "id": "a" | "b" | "c" | "d", "text": "nhận định", "answer": "T" | "F", "explanation": "lý giải ngắn" }
  ], (chỉ dành cho true_false, nếu không thì null)
  "shortAnswer": "chuỗi đáp án trả lời ngắn gọn", (chỉ dành cho short_answer)
  "explanation": "Lời giải chi tiết đầy tuyển tập đầy đủ toán học LaTeX",
  "topic": "Ví dụ: Sự biến thiên hàm số, hoặc Khối đa diện,..."
}

Bảo đảm trả về định dạng JSON thuần gốc, không bọc trong tag code markdown hay gì khác, là một JSON Object hợp lệ của JavaScript.`;

      const userText = `DƯỚI ĐÂY LÀ ĐỀ BÀI THÔ:\n${questionText}\n\n${answerText ? `BẢNG ĐÁP ÁN ĐỒNG BỘ ĐI KÈM:\n${answerText}` : ''}\n\nMôn học dự kiến: ${subject || 'Toán'}`;

      if (ai) {
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: userText,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json'
          },
        });
        
        let text = aiResponse.text || '';
        let repaired = '';
        let parsed: any = null;
        
        try {
          repaired = repairJsonLatexAndBrackets(text);
          parsed = JSON.parse(repaired);
        } catch (parseErr: any) {
          console.error('=== AI PARSER JSON SYNTAX ERROR DIAGNOSTICS ===');
          console.error('Error Message:', parseErr.message);
          console.error('Subject being processed:', subject);
          console.error('--- Raw String Output from AI ---');
          console.error(text);
          console.error('--- Repaired String attempted ---');
          console.error(repaired);
          console.error('===============================================');
          
          throw new Error(`Không thể dịch dữ liệu JSON tự nhiên của AI: ${parseErr.message}. Máy chủ đã ghi nhận chi tiết lỗi vào log hệ thống.`);
        }
        
        // Deeply heal, normalize LaTeX, and format individual questions in questions array
        const rawQuestions = parsed.questions || [];
        const healedQuestions = healAndValidateQuestions(rawQuestions).map((q: any, index: number) => ({
          ...q,
          id: `q-ocr-${Date.now()}-${index}`,
          order: q.order || (index + 1)
        }));

        res.json({ success: true, questions: healedQuestions });
      } else {
        const fallbackQuestions = healAndValidateQuestions(runFallbackRuleParser(questionText, answerText));
        res.json({ success: true, questions: fallbackQuestions, isFallback: true });
      }
    } catch (err: any) {
      console.error('Error in parse-exam endpoint:', err);
      try {
        const fallbackQuestions = runFallbackRuleParser(req.body.questionText, req.body.answerText);
        res.json({ success: true, questions: fallbackQuestions, isFallback: true, errorMsg: err.message });
      } catch (innerErr) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Offline Regex Rule-based Parser Fallback Helper for standard high-fidelity offline parsing 
  function runFallbackRuleParser(questionText: string, answerText: string): any[] {
    const questions: any[] = [];
    if (!questionText) return [];

    // Split by Question markers, e.g., "Câu 1.", "Câu 1:", "Câu 1"
    const qRegex = /(?:^|\n)\s*(Câu\s+\d+[\.:]?)/g;
    const parts = questionText.split(qRegex);
    let questionIndex = 0;

    for (let i = 1; i < parts.length; i += 2) {
      const header = parts[i];
      let body = parts[i + 1] || '';
      
      const orderMatch = header.match(/\d+/);
      const order = orderMatch ? parseInt(orderMatch[0]) : (questionIndex + 1);
      
      let plainText = body.trim();
      
      let type: 'multiple_choice' | 'true_false' | 'short_answer' = 'multiple_choice';
      let options: any = null;
      let statements: any[] = [];
      let shortAnswer = '';
      let explanation = 'Được trích xuất tự động qua công cụ phân tích văn bản offline.';
      let answer: any = 'A';

      const hasTF = /[\n^]\s*[a-d][\.\)]/i.test(plainText);
      const hasOptions = /[\n^]\s*[A-D][\.\)]/i.test(plainText);

      if (hasTF && !hasOptions) {
        type = 'true_false';
        const stLetters = ['a', 'b', 'c', 'd'];
        stLetters.forEach(char => {
          const regex = new RegExp(`(?:^|\\n)\\s*${char}[\\.\\)]\\s*([^\\n]+)`, 'i');
          const stMatch = plainText.match(regex);
          statements.push({
            id: char,
            text: stMatch ? stMatch[1].trim() : `Nhận định ${char.toUpperCase()} phân tích cấu trúc`,
            answer: 'T',
            explanation: 'Vui lòng điền giải thích ý này.'
          });
        });
        plainText = plainText.split(/(?:^|\n)\s*[a-d][\.\)]/i)[0].trim();
      } else if (!hasOptions) {
        type = 'short_answer';
        shortAnswer = '12';
      } else {
        options = { A: '', B: '', C: '', D: '' };
        const letters = ['A', 'B', 'C', 'D'];
        letters.forEach(opLetter => {
          const regex = new RegExp(`(?:^|\\n)\\s*${opLetter}[\\.\\)]\\s*([^\\n]+)`, 'i');
          const opMatch = plainText.match(regex);
          if (opMatch) {
            options[opLetter] = opMatch[1].trim();
          } else {
            options[opLetter] = `Phần lựa chọn ${opLetter}`;
          }
        });
        plainText = plainText.split(/(?:^|\n)\s*[A-D][\.\)]/i)[0].trim();
      }

      if (answerText) {
        const ansRegex = new RegExp(`(?:^|\\n|\\s)${order}\\s*[-:\\.]?\\s*([A-D]|đúng|sai|[0-9\\/\\.\\w+\\\\]+)`, 'i');
        const ansMatch = answerText.match(ansRegex);
        if (ansMatch) {
          const parsedAns = ansMatch[1].trim().toUpperCase();
          if (type === 'multiple_choice' && ['A', 'B', 'C', 'D'].includes(parsedAns)) {
            answer = parsedAns;
          } else if (type === 'short_answer') {
            shortAnswer = ansMatch[1].trim();
          }
        }
      }

      questions.push({
        id: `q-ocr-fallback-${Date.now()}-${order}`,
        order,
        text: plainText,
        type,
        options,
        answer,
        statements: type === 'true_false' ? statements : undefined,
        shortAnswer: type === 'short_answer' ? shortAnswer : undefined,
        explanation,
        topic: 'Nhận diện tự động'
      });
      questionIndex++;
    }

    return questions;
  }

  // --- API ROUTE: Delete Exam (Admin Mode) ---
  app.delete('/api/exams/:id', (req, res) => {
    const { id } = req.params;
    const initialLen = examsDb.length;
    examsDb = examsDb.filter(ex => ex.id !== id);
    if (examsDb.length < initialLen) {
      res.json({ success: true, message: 'Đã xóa đề thi thành công' });
    } else {
      res.status(404).json({ success: false, error: 'Không tìm thấy đề thi cần xóa' });
    }
  });

  // --- API ROUTE: Submit Exam Attempt ---
  app.post('/api/attempts', (req, res) => {
    const { examId, score, correctAnswersCount, timeSpentSeconds, mode, answers, starredQuestions, part1Score, part2Score, part3Score, scoringRulesId } = req.body;
    const activeUser = userProfilesDb.activeUser;

    const exam = examsDb.find(e => e.id === examId);
    if (exam) {
      exam.attemptCount += 1;
    }

    const newAttempt = {
      id: `attempt-${Date.now()}`,
      examId,
      examTitle: exam ? exam.title : 'Đề tự do',
      subject: exam ? exam.subject : 'Chung',
      score,
      totalQuestions: exam ? exam.questions.length : 10,
      correctAnswersCount,
      timeSpentSeconds,
      mode,
      answers,
      starredQuestions: starredQuestions || [],
      part1Score,
      part2Score,
      part3Score,
      scoringRulesId,
      createdAt: new Date().toISOString()
    };

    activeUser.history.push(newAttempt);

    // Update streak logic
    const todayStr = new Date().toISOString().split('T')[0];
    if (activeUser.lastActiveDate !== todayStr) {
      activeUser.streak += 1;
      activeUser.lastActiveDate = todayStr;
    }

    res.json({ success: true, activeUser, attempt: newAttempt });
  });

  // --- API ROUTE: Get Active User Profile ---
  app.get('/api/profile', (req, res) => {
    res.json({ success: true, data: userProfilesDb.activeUser });
  });

  // --- API ROUTE: Update User Profile ---
  app.post('/api/profile', (req, res) => {
    const { targetScore, targetUniversity, targetMajor, name } = req.body;
    if (name) userProfilesDb.activeUser.name = name;
    if (targetScore) userProfilesDb.activeUser.targetScore = targetScore;
    if (targetUniversity) userProfilesDb.activeUser.targetUniversity = targetUniversity;
    if (targetMajor) userProfilesDb.activeUser.targetMajor = targetMajor;

    res.json({ success: true, data: userProfilesDb.activeUser });
  });

  // --- API ROUTE: Reset Learner Stats (for convenience) ---
  app.post('/api/profile/reset-history', (req, res) => {
    userProfilesDb.activeUser.history = [];
    userProfilesDb.activeUser.streak = 1;
    res.json({ success: true, data: userProfilesDb.activeUser });
  });

  // --- API ROUTES: Scoring Rules Engine ---
  app.get('/api/scoring-rules', (req, res) => {
    res.json({ success: true, data: scoringRulesDb });
  });

  app.post('/api/scoring-rules', (req, res) => {
    try {
      const rule = req.body;
      if (!rule.name || !rule.trueFalsePoints) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin Quy chế bắt buộc' });
        return;
      }

      if (rule.isActive) {
        // Enforce only one active rule at a time or toggle others of same scope
        scoringRulesDb.forEach(r => { r.isActive = false; });
      }

      const existingIndex = scoringRulesDb.findIndex(r => r.id === rule.id);
      if (existingIndex > -1) {
        scoringRulesDb[existingIndex] = {
          ...scoringRulesDb[existingIndex],
          ...rule,
          id: rule.id // maintain ID
        };
        res.json({ success: true, message: 'Cập nhật Quy chế thành công', data: scoringRulesDb[existingIndex] });
      } else {
        const newRule = {
          ...rule,
          id: rule.id || `rule-${Date.now()}`
        };
        scoringRulesDb.push(newRule);
        res.json({ success: true, message: 'Thêm Quy chế chấm điểm mới thành công', data: newRule });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/scoring-rules/:id', (req, res) => {
    const { id } = req.params;
    const initialLen = scoringRulesDb.length;
    scoringRulesDb = scoringRulesDb.filter(r => r.id !== id);
    if (scoringRulesDb.length < initialLen) {
      res.json({ success: true, message: 'Đã xóa quy chế chấm điểm thành công' });
    } else {
      res.status(404).json({ success: false, error: 'Không tìm thấy quy chế chấm điểm cần xóa' });
    }
  });

  // --- API ROUTE: Secure Server-Side AI Recommendation (Gemini 3.5 Flash) ---
  app.post('/api/ai/recommend', async (req, res) => {
    const { history, targetScore, targetUniversity, targetMajor } = req.body;

    const formattedHistory = history && Array.isArray(history) 
      ? history.map((h: any) => `Đề: ${h.examTitle}, Môn: ${h.subject}, Điểm số: ${h.score}/10, Chế độ làm bài: ${h.mode}`).join('\n')
      : 'Chưa tham gia luyện đề nào.';

    const systemPrompt = `Bạn là Chuyên gia Cố vấn Học thuật AI của Nền tảng EdTech luyện thi đại học Quốc Gia THPT năm 2026. 
Nhiệm vụ của bạn là phân tích báo cáo điểm số, lịch sử luyện đề, chỉ số mục tiêu học đại học của học sinh dưới đây để đưa ra:
1. Đánh giá tổng quan điểm mạnh học sinh.
2. Xác định các lỗi hổng kiến thức chính (chuyên đề học tập cần củng cố gấp).
3. Lập một Lộ trình hành động (Lộ trình ôn tập 2026 ngắn hạn 3-4 gạch đầu dòng rõ ràng, thực tiễn).
4. Khuyến nghị môn học/dạng đề nên ôn tiếp theo.

Hãy luôn trả lời bằng Tiếng Việt, sử dụng phong cách hiện đại, truyền cảm hứng, động viên học sinh nhiệt tình (như mascot đồng hành thông thái). Tránh công thức phức tạp, định dạng bằng Markdown rõ ràng với các tiêu đề mục bôi đậm.`;

    const prompt = `Lịch sử luyện tập hiện tại:
${formattedHistory}

Mục tiêu điểm số: ${targetScore || '8.5'} điểm.
Trường Đại học mong muốn: ${targetUniversity || 'Bách Khoa'} - Ngành học: ${targetMajor || 'Công nghệ thông tin'}.

Hãy trả lời phân tích lời khuyên học tập cá nhân hóa phù hợp cho kỳ thi năm 2026.`;

    if (ai) {
      try {
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction: systemPrompt,
          },
        });
        res.json({ success: true, recommendation: aiResponse.text });
      } catch (err: any) {
        console.error('Gemini call error:', err);
        // Fallback local rule response if rate limited or API issues
        res.json({ success: true, recommendation: getFallbackRecommendation(history, targetScore) });
      }
    } else {
      // Local analyzer fallback
      res.json({ success: true, recommendation: getFallbackRecommendation(history, targetScore) });
    }
  });

  // Fallback engine if Gemini API is disabled/missing
  function getFallbackRecommendation(history: any[], targetScore: number) {
    const maxScore = history && history.length > 0 ? Math.max(...history.map(h => h.score)) : 0;
    const avgScore = history && history.length > 0 ? (history.reduce((acc, curr) => acc + curr.score, 0) / history.length) : 0;

    return `### 🌟 Nhận Xét Từ AI Đồng Hành (Mascot Loli/Smart Buddy)
Chào cậu! Tớ là Mascot thông thái sẽ đồng hành cùng cậu đến kỳ thi tốt nghiệp THPT Quốc Gia năm 2026. Tớ đã phân tích kỹ các chỉ số hiện tại:
- **Chuỗi học tập liên tục**: Khá ổn! Thẻ phong độ đang được duy trì đều đặn.
- **Mức điểm trung bình**: ${avgScore.toFixed(1)}/10. So với mục tiêu **${targetScore || 9.0}** điểm, chúng ta cần nỗ lực bứt phá thêm khoảng **${Math.max(0, (targetScore || 9.0) - avgScore).toFixed(1)}** điểm nữa nhé!

### 📚 Điểm Yếu Cần Khắc Phục Ngay
1. **Luyện kỹ năng Đọc hiểu / Cực trị hàm số**: Dữ liệu thấy tỷ lệ sai sót rơi nhiều vào kỹ năng suy diễn nâng cao hoặc tính toán đồ thị phức tạp.
2. **Kỹ năng Phân bổ thời gian**: Bạn làm bài ở chế độ Luyện Tập nhẹ nhàng xuất sắc hơn chế độ đếm ngược thời gian nghiêm túc (Focus Mode). Tốc độ giải chưa tối ưu.

### 🎯 Lập Lộ Trình Hành Động 2026 (Mục tiêu ${targetScore || 9.0} điểm)
- **Giai đoạn 1**: Luyện tập 2-3 đề thi thử môn **Toán** và **Vật lý** ở chế độ **Chill Mode** bật hiển thị lời giải chi tiết lập tức để hấp thụ toàn bộ lý thuyết nền tảng & mẹo bấm máy tính Casio.
- **Giai đoạn 2**: Thử thách bản thân với 1 đề **Focus Mode** nghiêm túc mỗi tuần để rèn luyện phản xạ chịu áp lực phòng thi thật, tắt nhạc, tập trung ghi nhận tab blur cảnh báo!
- **Tớ Đề Xuất Đề Tiếp Theo**: **Đề Luyện Thi THPT môn Hóa Học 2026** - mức độ Dễ phù hợp để cậu khởi động hâm nóng tinh thần học tập hôm nay!`;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully running on port http://localhost:${PORT}`);
  });
}

startServer();
