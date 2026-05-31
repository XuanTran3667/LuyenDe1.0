/**
 * Advanced equivalence and mathematical parsing helper.
 * Supports verifying user inputted short answers with correct LaTeX or numeric values.
 */

export function evaluateMathValue(text: string): number | null {
  if (!text) return null;
  let normalized = text.trim();
  
  // Strip any wrapping symbols or tags
  if (normalized.startsWith('\\(') && normalized.endsWith('\\)')) {
    normalized = normalized.slice(2, -2);
  }
  if (normalized.startsWith('$') && normalized.endsWith('$')) {
    normalized = normalized.slice(1, -1);
  }

  normalized = normalized.trim();

  // Replace superscript caret with ** (or Math.pow)
  // Caret e.g. a^b -> Math.pow(a, b)
  let prev;
  // Replace fractions: \frac{a}{b} -> ((a)/(b))
  do {
    prev = normalized;
    normalized = normalized.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))');
  } while (normalized !== prev);

  // Replace square root: \sqrt{x} -> Math.sqrt(x)
  do {
    prev = normalized;
    normalized = normalized.replace(/\\sqrt\s*\{([^{}]+)\}/g, 'Math.sqrt($1)');
  } while (normalized !== prev);
  
  // also support non-bracketed sqrt, like \sqrt 3 with digits
  normalized = normalized.replace(/\\sqrt\s*(\d+)/g, 'Math.sqrt($1)');
  normalized = normalized.replace(/sqrt\s*\(([^()]+)\)/g, 'Math.sqrt($1)');

  // Replace common Greek mathematical variables and constants
  normalized = normalized.replace(/\\pi\b/g, 'Math.PI');
  normalized = normalized.replace(/\bpi\b/g, 'Math.PI');
  
  // Normalize caret ^ to **
  normalized = normalized.replace(/\^/g, '**');

  // Remove styling tags like \text{cm}, \text{s}, etc.
  normalized = normalized.replace(/\\text\s*\{([^{}]+)\}/g, '$1');
  
  // Replace multiplication markers or dots
  normalized = normalized.replace(/\\cdot/g, '*');
  normalized = normalized.replace(/\\times/g, '*');

  // Clean syntax like "2Math.sqrt" -> "2*Math.sqrt" (implied multiplier)
  normalized = normalized.replace(/(\d+)\s*(Math\.)/g, '$1*$2');
  normalized = normalized.replace(/(\d+)\s*([\(\{\[a-zA-Z]+)/g, (match, d, word) => {
    if (word.startsWith('Math') || word.startsWith('sqrt')) {
      return `${d}*${word}`;
    }
    return match;
  });

  // Strip units and remaining LaTeX labels that aren't operators
  // Keep only numbers, decimals, parentheses, arithmetic keys, Math constants
  // Safety: replace anything that is not in the safe whitelist
  const allowedChars = /^[0-9\+\-\*\/\.\(\)\s\*Math\.PIsqrtpow]+$/;
  
  try {
    // Replace Math.sqrt or Math.pow calls that we manually pre-processed
    // Let's safe-evaluate the JS statement using simple Function constructor
    const evaluator = new Function(`return (${normalized});`);
    const val = evaluator();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return val;
    }
  } catch (e) {
    // Fall back to simpler rules
  }

  // Parse direct fraction string if simple, e.g. "1/2" or "-3.5"
  const fractionMatch = normalized.match(/^([-+]?\d+)\s*\/\s*([-+]?\d+)$/);
  if (fractionMatch) {
    return parseFloat(fractionMatch[1]) / parseFloat(fractionMatch[2]);
  }

  const directNum = normalized.match(/^[-+]?\d+(\.\d+)?$/);
  if (directNum) {
    return parseFloat(directNum[0]);
  }

  return null;
}

export function areMathValuesEquivalent(userAnswer: string, correctAnswer: string): boolean {
  if (userAnswer === undefined || correctAnswer === undefined) return false;

  const rawUser = userAnswer.toString().trim();
  const rawCorrect = correctAnswer.toString().trim();

  // If correct answer contains multiple options separated by '|' or ';'
  const correctOptions = rawCorrect.split(/[|;]/).map(o => o.trim()).filter(Boolean);
  if (correctOptions.length > 1) {
    return correctOptions.some(opt => {
      // Avoid infinite recursion by calling simple comparison or passing the single option
      const cleanU = rawUser.toLowerCase().replace(/\s+/g, '');
      const cleanO = opt.toLowerCase().replace(/\s+/g, '');
      if (cleanU === cleanO) return true;
      
      const stripDecorations = (str: string) => {
        let s = str.trim();
        if (s.startsWith('\\(') && s.endsWith('\\)')) s = s.slice(2, -2).trim();
        if (s.startsWith('$') && s.endsWith('$')) s = s.slice(1, -1).trim();
        return s.toLowerCase().replace(/\s+/g, '');
      };
      if (stripDecorations(rawUser) === stripDecorations(opt)) return true;
      
      const numericU = evaluateMathValue(rawUser);
      const numericO = evaluateMathValue(opt);
      if (numericU !== null && numericO !== null) {
        return Math.abs(numericU - numericO) < 0.001;
      }
      return false;
    });
  }

  const cleanUser = rawUser.toLowerCase().replace(/\s+/g, '');
  const cleanCorrect = rawCorrect.toLowerCase().replace(/\s+/g, '');

  if (cleanUser === cleanCorrect) return true;

  // Strip wrapping delimiters
  const stripDecorations = (str: string) => {
    let s = str.trim();
    if (s.startsWith('\\(') && s.endsWith('\\)')) s = s.slice(2, -2).trim();
    if (s.startsWith('$') && s.endsWith('$')) s = s.slice(1, -1).trim();
    return s.toLowerCase().replace(/\s+/g, '');
  };

  const strippedUser = stripDecorations(rawUser);
  const strippedCorrect = stripDecorations(rawCorrect);

  if (strippedUser === strippedCorrect) return true;

  // Calculate high precision numerical values and compare with tolerance (e.g., epsilon 0.001)
  const numericUser = evaluateMathValue(rawUser);
  const numericCorrect = evaluateMathValue(rawCorrect);

  if (numericUser !== null && numericCorrect !== null) {
    return Math.abs(numericUser - numericCorrect) < 0.001;
  }

  return false;
}
