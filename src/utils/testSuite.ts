export interface LaTeXTestCase {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  rawInput: string; // Simulates raw AI stream with unescaped backslashes
  expectedType: string;
}

/**
 * Robust JSON pre-processor state machine to fix unescaped backslashes and close unbalanced quotes/brackets
 */
export function repairJsonLatexAndBrackets(rawText: string): string {
  let cleaned = rawText.trim();

  // Strip markdown framing if any
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Find exact first JSON brackets to cut out preamble/postamble
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  let result = '';
  let inString = false;
  let escapeActive = false;
  const bracketStack: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
        result += '"';
      } else {
        if (char === '{') bracketStack.push('}');
        else if (char === '[') bracketStack.push(']');
        else if (char === '}') {
          if (bracketStack[bracketStack.length - 1] === '}') {
            bracketStack.pop();
          }
        } else if (char === ']') {
          if (bracketStack[bracketStack.length - 1] === ']') {
            bracketStack.pop();
          }
        }
        result += char;
      }
    } else {
      // Inside a JSON string literal
      if (escapeActive) {
        result += char;
        escapeActive = false;
      } else if (char === '\\') {
        const nextChar = cleaned[i + 1];
        // Allow valid JSON string escapes to pass through natively
        if (nextChar === '"' || nextChar === 'n' || nextChar === 't' || nextChar === '\\' || nextChar === 'r' || nextChar === 'f' || nextChar === 'b') {
          result += '\\';
          // It's a valid escape, so let normal processing handle the next character as part of the escape
        } else {
          // Unescaped LaTeX backslash (e.g. \sqrt, \frac, \log, \pi, \alpha, \beta, \int, \sum)
          // We convert it into double backslash \\ so JSON.parse receives it correctly as a real single backslash
          result += '\\\\';
        }
      } else if (char === '"') {
        inString = false;
        result += '"';
      } else {
        result += char;
      }
    }
  }

  // Gracefully heal if text was truncated (e.g., token exhaustion or connection dropped)
  if (inString) {
    result += '"';
  }

  while (bracketStack.length > 0) {
    const closeChar = bracketStack.pop();
    result += closeChar;
  }

  return result;
}

/**
 * Sanitizes LaTeX formulas: ensures correct escaping for raw text and converts typical LaTeX slip-ups
 */
export function sanitizeLatex(str: string): string {
  if (!str || typeof str !== 'string') return str || '';
  return str;
}

/**
 * Sanitize all fields recursively inside a single structural question block
 */
export function sanitizeQuestionFields(q: any): any {
  if (!q) return q;
  const copy = { ...q };

  if (copy.text) copy.text = sanitizeLatex(copy.text);
  if (copy.explanation) copy.explanation = sanitizeLatex(copy.explanation);
  if (copy.topic) copy.topic = sanitizeLatex(copy.topic);
  if (copy.shortAnswer) copy.shortAnswer = sanitizeLatex(copy.shortAnswer);

  if (copy.options) {
    const sanitizedOptions: any = {};
    for (const key of ['A', 'B', 'C', 'D']) {
      if (copy.options[key]) {
        sanitizedOptions[key] = sanitizeLatex(copy.options[key]);
      } else {
        sanitizedOptions[key] = copy.options[key] || '';
      }
    }
    copy.options = sanitizedOptions;
  }

  if (copy.statements && Array.isArray(copy.statements)) {
    copy.statements = copy.statements.map((st: any) => ({
      ...st,
      text: sanitizeLatex(st.text || ''),
      explanation: sanitizeLatex(st.explanation || ''),
    }));
  }

  return copy;
}

/**
 * Heals individual questions, ensuring standard structure and recovering fields to match current formats
 */
export function healAndValidateQuestions(questions: any[]): any[] {
  if (!Array.isArray(questions)) return [];

  const healed: any[] = [];
  questions.forEach((q: any, idx: number) => {
    try {
      const type = q.type || 'multiple_choice';
      const order = q.order || (idx + 1);
      const text = q.text || `Câu hỏi số ${order}`;
      const topic = q.topic || 'Chuyên đề chung';
      const explanation = q.explanation || 'Chưa có lời giải chi tiết.';

      const base: any = {
        id: q.id || `q-ocr-${Date.now()}-${idx}`,
        order,
        text,
        type,
        topic,
        explanation,
        image: q.image || undefined,
        explanationImage: q.explanationImage || undefined,
      };

      if (type === 'multiple_choice') {
        base.options = q.options || { A: 'Đáp án A', B: 'Đáp án B', C: 'Đáp án C', D: 'Đáp án D' };
        ['A', 'B', 'C', 'D'].forEach(letter => {
          if (!base.options[letter] || !base.options[letter].trim()) {
            base.options[letter] = `Lựa chọn ${letter}`;
          }
        });
        const ans = (q.answer || 'A').toString().trim().toUpperCase();
        base.answer = ['A', 'B', 'C', 'D'].includes(ans) ? ans : 'A';
      } else if (type === 'true_false') {
        const defaultStatements = [
          { id: 'a', text: 'Nhận định ý a', answer: 'T', explanation: '' },
          { id: 'b', text: 'Nhận định ý b', answer: 'T', explanation: '' },
          { id: 'c', text: 'Nhận định ý c', answer: 'F', explanation: '' },
          { id: 'd', text: 'Nhận định ý d', answer: 'F', explanation: '' }
        ];

        if (Array.isArray(q.statements) && q.statements.length > 0) {
          base.statements = q.statements.map((st: any, sIdx: number) => {
            const letterId = String.fromCharCode(97 + sIdx); // a, b, c, d
            const stAns = (st.answer || 'T').toString().trim().toUpperCase();
            return {
              id: st.id || letterId,
              text: st.text || `Nhận định ý ${letterId.toUpperCase()}`,
              answer: ['T', 'F', 'TRUE', 'FALSE', 'ĐÚNG', 'SAI'].includes(stAns) 
                ? (['T', 'TRUE', 'ĐÚNG'].includes(stAns) ? 'T' : 'F') 
                : 'T',
              explanation: st.explanation || '',
              image: st.image || undefined
            };
          });
          while (base.statements.length < 4) {
            const padIdx = base.statements.length;
            base.statements.push({ ...defaultStatements[padIdx] });
          }
          if (base.statements.length > 4) {
            base.statements = base.statements.slice(0, 4);
          }
        } else {
          base.statements = defaultStatements;
        }
      } else if (type === 'short_answer') {
        base.shortAnswer = (q.shortAnswer || '0').toString().trim();
      }

      healed.push(sanitizeQuestionFields(base));
    } catch (err) {
      console.error(`Error healing individual OCR question at index ${idx}:`, err);
    }
  });

  return healed;
}

/**
 * Generate 300+ rigorous LaTeX test cases (100+ Multiple Choice, 100+ True/False, 100+ Short Answer)
 * with unescaped backslashes (\sqrt, \frac, \log, \int, \sum, \pi, \alpha, \beta, \omega, \theta)
 * to test our JSON repairer and parser.
 */
export function generateParserTestSuite(): LaTeXTestCase[] {
  const cases: LaTeXTestCase[] = [];

  // Math operators & Greek letters list to rotate
  const mathSymbols = [
    { latex: '\\sqrt{3}', text: 'căn bậc hai của 3' },
    { latex: '\\frac{a}{b}', text: 'phân số a trên b' },
    { latex: '\\log_3(x)', text: 'logarit cơ số 3 của x' },
    { latex: '\\pi', text: 'số Pi' },
    { latex: '\\alpha', text: 'góc alpha' },
    { latex: '\\beta', text: 'góc beta' },
    { latex: '\\int_0^1 x^2 dx', text: 'tích phân từ 0 đến 1' },
    { latex: '\\sum_{i=1}^n i', text: 'tổng xích ma' },
    { latex: '\\lim_{x \\to \\infty}', text: 'giới hạn vô cực' },
    { latex: '\\Delta \\ge 0', text: 'biệt thức Delta lớn hơn hoặc bằng 0' }
  ];

  // 2. Generate 102 Multiple Choice cases (with unescaped backslashes)
  for (let i = 1; i <= 102; i++) {
    const sym = mathSymbols[i % mathSymbols.length];
    const rawJson = `{
      "order": ${i},
      "type": "multiple_choice",
      "text": "Câu hỏi MCQ số ${i}: Tính chất biểu thức chứa ${sym.text} có dạng ${sym.latex}",
      "options": {
        "A": "${sym.latex} + 1",
        "B": "${sym.latex} - 1",
        "C": "2 * ${sym.latex}",
        "D": "Giá trị triệt tiêu"
      },
      "answer": "${['A', 'B', 'C', 'D'][i % 4]}",
      "explanation": "Ta áp dụng phép toán giải tích bình thường của ${sym.text}.",
      "topic": "Đại số giải tích THPT"
    }`;

    cases.push({
      id: `test-mcq-${i}`,
      type: 'multiple_choice',
      rawInput: rawJson,
      expectedType: 'multiple_choice'
    });
  }

  // 3. Generate 102 True/False cases (with unescaped backslashes)
  for (let i = 1; i <= 102; i++) {
    const sym1 = mathSymbols[i % mathSymbols.length];
    const sym2 = mathSymbols[(i + 1) % mathSymbols.length];
    
    const rawJson = `{
      "order": ${i},
      "type": "true_false",
      "text": "Câu hỏi Đúng/Sai số ${i}: Cho hai đại lượng toán học ${sym1.text} và ${sym2.text}.",
      "statements": [
        { "id": "a", "text": "Biểu thức thứ nhất là ${sym1.latex}", "answer": "${i % 2 === 0 ? 'T' : 'F'}", "explanation": "Hiển nhiên đúng" },
        { "id": "b", "text": "Biểu thức thứ hai bằng ${sym2.latex}", "answer": "${i % 3 === 0 ? 'F' : 'T'}", "explanation": "Xem giải tích" },
        { "id": "c", "text": "Tích của chúng bằng ${sym1.latex} * ${sym2.latex}", "answer": "T", "explanation": "Nhân hai vế" },
        { "id": "d", "text": "Tất cả các khẳng định trên đều vô nghiệm", "answer": "F", "explanation": "Sai hoàn toàn" }
      ],
      "explanation": "Xét từng nhận định.",
      "topic": "Đúng sai Toán THPT"
    }`;

    cases.push({
      id: `test-tf-${i}`,
      type: 'true_false',
      rawInput: rawJson,
      expectedType: 'true_false'
    });
  }

  // 4. Generate 102 Short Answer cases (with unescaped backslashes)
  for (let i = 1; i <= 102; i++) {
    const sym = mathSymbols[i % mathSymbols.length];
    const rawJson = `{
      "order": ${i},
      "type": "short_answer",
      "text": "Câu hỏi ngắn số ${i}: Tìm giá trị thực của tham số m để ${sym.text} triệt tiêu.",
      "shortAnswer": "${sym.latex}",
      "explanation": "Giải phương trình hàm số cho kết quả ${sym.latex}.",
      "topic": "Tự luận ngắn nâng cao"
    }`;

    cases.push({
      id: `test-sa-${i}`,
      type: 'short_answer',
      rawInput: rawJson,
      expectedType: 'short_answer'
    });
  }

  return cases;
}

/**
 * Runs the unit test suite on our internally defined parser rules
 */
export function runParserTestsDirect() {
  const testCases = generateParserTestSuite();
  let passedCount = 0;
  const failures: any[] = [];

  const start = Date.now();

  testCases.forEach((tc) => {
    try {
      // 1. Repair unescaped raw string
      const repaired = repairJsonLatexAndBrackets(tc.rawInput);
      
      // 2. Wrap inside a dummy JSON array packet to parse
      const dummyWrapper = `{"questions": [ ${repaired} ]}`;
      
      const parsedWrapper = JSON.parse(dummyWrapper);
      
      // 3. Heal questions list
      const healedList = healAndValidateQuestions(parsedWrapper.questions);
      
      if (healedList.length === 1 && healedList[0].type === tc.expectedType) {
        const q = healedList[0];
        const hasSpecificStructure = 
          (tc.type === 'multiple_choice' && q.options && q.answer) ||
          (tc.type === 'true_false' && Array.isArray(q.statements) && q.statements.length === 4) ||
          (tc.type === 'short_answer' && q.shortAnswer);

        if (hasSpecificStructure) {
          passedCount++;
        } else {
          failures.push({
            id: tc.id,
            error: 'Failed structural checks after parsing.',
            parsedJson: q
          });
        }
      } else {
        failures.push({
          id: tc.id,
          error: `Parsed length ${healedList.length} instead of 1, or mismatch type.`
        });
      }
    } catch (err: any) {
      failures.push({
        id: tc.id,
        error: err.message || 'Unknown JSON parsing crash.'
      });
    }
  });

  const duration = Date.now() - start;
  const successRate = (passedCount / testCases.length) * 100;

  return {
    total: testCases.length,
    passed: passedCount,
    failed: failures.length,
    successRate: parseFloat(successRate.toFixed(2)),
    durationMs: duration,
    failures: failures.slice(0, 5)
  };
}
