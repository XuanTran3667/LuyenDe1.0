import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathRendererProps {
  math: string;
  block?: boolean;
}

/**
 * Renders a single clean LaTeX math string using KaTeX.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ math, block = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        // Clean up math string before rendering
        let cleanMath = math.trim();
        // Remove enclosing delimiters if they accidentally leak in
        if (cleanMath.startsWith('\\(') && cleanMath.endsWith('\\)')) {
          cleanMath = cleanMath.slice(2, -2);
        } else if (cleanMath.startsWith('\\[') && cleanMath.endsWith('\\]')) {
          cleanMath = cleanMath.slice(2, -2);
        } else if (cleanMath.startsWith('$$') && cleanMath.endsWith('$$')) {
          cleanMath = cleanMath.slice(2, -2);
        } else if (cleanMath.startsWith('$') && cleanMath.endsWith('$')) {
          cleanMath = cleanMath.slice(1, -1);
        }

        katex.render(cleanMath, containerRef.current, {
          displayMode: block,
          throwOnError: false,
          trust: true,
        });
      } catch (err) {
        containerRef.current.textContent = math;
      }
    }
  }, [math, block]);

  return (
    <span 
      ref={containerRef} 
      className={block 
        ? "block overflow-x-auto py-3 my-2 max-w-full text-center scrollbar-thin scrollbar-thumb-slate-300" 
        : "inline-block max-w-full overflow-x-auto py-1 px-0.5 align-middle scrollbar-none"
      } 
    />
  );
};

/**
 * Converts raw math text (e.g. x^2, log_3, sqrt(x), Ohm) into beautiful clean LaTeX.
 */
export function convertRawToLaTeX(raw: string): string {
  if (!raw) return '';

  let text = raw;

  // 1. Double superscript or subscription cleanup
  // Let's protect existing LaTeX commands first so we don't double convert
  if (text.includes('\\log') || text.includes('\\sqrt') || text.includes('\\frac')) {
    // Already contains standard LaTeX components. Keep parsing simple exponents/subscripts if any thô patterns remain.
  }

  // log_sqrt(3)(x - 1) -> \log_{\sqrt{3}}(x - 1)
  text = text.replace(/log_sqrt\((.*?)\)\((.*?)\)/g, '\\log_{\\sqrt{$1}}($2)');
  text = text.replace(/log_sqrt\((.*?)\)/g, '\\log_{\\sqrt{$1}}');
  text = text.replace(/log_sqrt\s+(\d+)/g, '\\log_{\\sqrt{$1}}');

  // log_3(x^2 - 2x + m) -> \log_{3}(x^2 - 2x + m)
  text = text.replace(/log_([0-9a-zA-Z]+)\((.*?)\)/g, '\\log_{$1}($2)');
  text = text.replace(/log_([0-9a-zA-Z]+)/g, '\\log_{$1}');

  // sqrt(3) -> \sqrt{3}, căn(2) -> \sqrt{2}
  text = text.replace(/sqrt\((.*?)\)/g, '\\sqrt{$1}');
  text = text.replace(/căn\((.*?)\)/g, '\\sqrt{$1}');
  text = text.replace(/căn\s+(\d+|[a-zA-Z])/g, '\\sqrt{$1}');

  // Greek letters bounded by whitespace or non-alphabetic chars
  text = text.replace(/\bpi\b/g, '\\pi');
  text = text.replace(/\blambda\b/g, '\\lambda');
  text = text.replace(/\bomega\b/g, '\\omega');
  text = text.replace(/\bDelta\b/g, '\\Delta');
  text = text.replace(/\bdelta\b/g, '\\delta');
  text = text.replace(/\balpha\b/g, '\\alpha');
  text = text.replace(/\bbeta\b/g, '\\beta');
  text = text.replace(/\bgamma\b/g, '\\gamma');

  // Trigonometric functions
  text = text.replace(/\bcos\b/g, '\\cos');
  text = text.replace(/\bsin\b/g, '\\sin');
  text = text.replace(/\btan\b/g, '\\tan');
  text = text.replace(/\bcot\b/g, '\\cot');

  // Multiplications *
  text = text.replace(/\s*\*\s*/g, ' \\cdot ');

  // Ohm symbol for electrical questions
  text = text.replace(/\bOhm\b/g, '\\,\\Omega');

  // exponents x^3 -> x^{3}, (2x+1)^2 -> (2x+1)^{2}
  text = text.replace(/([0-9a-zA-Z\)\}\]]+)\^([0-9a-zA-Z]+)/g, '$1^{$2}');
  text = text.replace(/([0-9a-zA-Z\)\}\]]+)\^\((.*?)\)/g, '$1^{$2}');

  // subscripts u_1 -> u_{1}, a_n -> a_{n}
  text = text.replace(/([0-9a-zA-Z]+)_([0-9a-zA-Z]+)/g, '$1_{$2}');
  text = text.replace(/([0-9a-zA-Z]+)_\((.*?)\)/g, '$1_{$2}');

  // Fractions: "a / b" -> "\frac{a}{b}" (only for explicit numeric/variable pairs to avoid breaking general slashes)
  text = text.replace(/(\b[0-9a-zA-Z\\\{\}\(\)\pi\sqrt]+)\s*\/\s*(\b[0-9a-zA-Z\\\{\}\(\)\pi\sqrt]+)/g, '\\frac{$1}{$2}');

  // Decimals formatting for Vietnamese notation, e.g. 1,1 -> 1{,}1 to avoid wide spacing in LaTeX
  text = text.replace(/(\d+),(\d+)/g, '$1{,}$2');

  // Convert units to beautiful \text{...} inside KaTeX
  text = text.replace(/\s+(cm|m\/s|m|s|V|A|H|F)\b/g, '\\,\\text{$1}');

  // Set operators
  text = text.replace(/\s*->\s*/g, ' \\to ');
  text = text.replace(/\bthực R\b/i, '\\mathbb{R}');
  text = text.replace(/\btập R\b/i, '\\mathbb{R}');
  text = text.replace(/\btrên R\b/i, 'trên \\mathbb{R}');

  // Let's refine chemical formulas like C4H8O2
  text = text.replace(/\bC(\d+)H(\d+)O(\d+)\b/g, '\\text{C}_{$1}\\text{H}_{$2}\\text{O}_{$3}');
  text = text.replace(/\b(HCOO|CH3COO)(\w+)\b/g, '\\text{$1}\\text{$2}');

  return text;
}

/**
 * Checks if the entire text option should be styled and wrapped as a LaTeX inline block.
 */
export function shouldWrapEntireStringInLaTeX(text: string): boolean {
  if (!text) return false;
  
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Already contains delimiters?
  if (trimmed.includes('\\(') || trimmed.includes('\\[') || trimmed.includes('$$') || trimmed.includes('$')) {
    return false;
  }

  // 1. Explicit LaTeX syntax indicators
  const latexSignals = [
    '\\frac', '\\sqrt', '\\pi', '\\omega', '\\Omega', '\\delta', '\\Delta', 
    '\\alpha', '\\beta', '\\gamma', '\\lambda', '\\theta', '\\cos', '\\sin', 
    '\\tan', '\\cot', '\\mathbb', '\\text', '\\widehat', '\\perp', '\\Leftrightarrow', 
    '\\cdot', '\\to', '\\left', '\\right', '\\approx', '\\pm', '\\le', '\\ge', '\\neq', '\\,'
  ];
  if (latexSignals.some(sig => trimmed.includes(sig))) {
    return true;
  }

  // 2. Contains exponent caret or subscripts with numbers/letters
  if (/\^/.test(trimmed) || /_/.test(trimmed)) {
    if (/[\^]/.test(trimmed)) return true;
    if (/_([0-9a-zA-Z]+)/.test(trimmed)) return true;
  }

  // 3. Simple mathematical structures like "căn(2)" or "căn 3" or similar
  if (/căn\s*\(/.test(trimmed) || /căn\s+\d+/.test(trimmed) || /sqrt\s*\(/.test(trimmed)) {
    return true;
  }

  // 4. Assignments or comparisons commonly used in math / physics / chemistry
  const hasVietnameseProseCap = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i.test(trimmed);

  if (!hasVietnameseProseCap) {
    // Starts with assignment e.g. "V = " or "A =" or "m ="
    if (/^[a-zA-Z0-9_{\s}]+\s*=\s*/.test(trimmed)) return true;
    // Comparisons like "m < 2"
    if (/[a-zA-Z0-9_{\s}]+\s*[<>=]\s*/.test(trimmed)) return true;
    // Basic combinations of math characters
    if (/^[a-zA-Z0-9\s\+\-\*\/\(\)]+$/.test(trimmed) && /[\+\-\*\/]/.test(trimmed)) return true;
  }

  return false;
}

/**
 * Intelligent helper that scans plain text for math formulas and wraps them in LaTeX standard delimiters,
 * while respecting existing LaTeX blocks.
 */
export function wrapRawMathInLaTeXDelimiters(text: string): string {
  if (!text) return '';

  const trimmed = text.trim();

  // If text is already highly marked up, just return
  if (trimmed.includes('\\(') || trimmed.includes('\\[') || trimmed.includes('$$') || trimmed.includes('$')) {
    return trimmed;
  }

  // Check if we should math-wrap the entire option/statement
  if (shouldWrapEntireStringInLaTeX(trimmed)) {
    const converted = convertRawToLaTeX(trimmed);
    return `\\(${converted}\\)`;
  }

  // Identify equations, formula signatures and separate them
  // We identify common mathematical substrings to format as inline formulas:
  // E.g., y = f(x), f'(x) = ..., ax^2 + bx + c = ..., log_3(x^2 - 2x + m) = ..., a căn 3, Z = căn(...)
  let modifiedText = trimmed;

  // Let's extract expressions like formula containing variables and operators
  // E.g. y = f(x) or log_3(x^2 - 2x + m) = log_sqrt(3)(x - 1)
  const mathPatterns = [
    /log_sqrt\(\d+\)\(x\s*-\s*\d+\)/g,
    /log_\d+\(x\^2\s*[-+]\s*\d+x\s*[-+]\s*[a-zA-Z0-9]+\)\s*=\s*log_sqrt\(\d+\)\(x\s*-\s*\d+\)/g,
    /y\s*=\s*f\(x\)\s*=\s*x\^3\s*-\s*3x\^2\s*\+\s*\d+/g,
    /f'\(x\)\s*=\s*\(x\s*-\s*\d+\)\^2\s*\*\s*\(x\^2\s*-\s*\d+\)/g,
    /f'\(x\)\s*=\s*3x\^2\s*-\s*6x/g,
    /y_CĐ\s*\*\s*y_CT\s*<\s*\d+/g,
    /y_\{CĐ\}\s*\*\s*y_\{CT\}\s*<\s*\d+/g,
    /f\(2\)\s*=\s*2\^3\s*-\s*3\*2\^2\s*\+\s*\d+\s*=\s*\d+\s*-\s*\d+\s*\+\s*\d+\s*=\s*-\d+/g,
    /V\s*=\s*\(9\s*\*\s*pi\s*\*\s*a\^3\s*\*\s*căn\s*3\)\s*\/\s*\d+/g,
    /V\s*=\s*\(9\s*\*\s*pi\s*\*\s*a\^3\)\s*\/\s*\d+/g,
    /V\s*=\s*3\s*\*\s*pi\s*\*\s*a\^3/g,
    /V\s*=\s*\(27\s*\*\s*pi\s*\*\s*a\^3\s*\*\s*căn\s*3\)\s*\/\s*\d+/g,
    /L_max\s*-\s*L_min/gi,
    /L_max/gi,
    /L_min/gi,
    /lambda\s*=\s*v\s*\*\s*T\s*=\s*\d+\s*\*\s*0,2\s*=\s*\d+\s*m/g,
    /u\s*=\s*\d+\s*căn\(2\)\s*cos\(\d+\*pi\*t\)/g,
    /Z_L\s*=\s*omega\s*\*\s*L\s*=\s*\d+\s*\*\s*pi\s*\*\s*\(1\/pi\)\s*=\s*\d+\s*Ohm/gi,
    /Z_C\s*=\s*1\s*\/\s*\(omega\s*\*\s*C\)\s*=\s*\d+\s*Ohm/gi,
    /Z\s*=\s*căn\(R\^2\s*\+\s*\(Z_L\s*-\s*Z_C\)\^2\)/gi,
    /C4H8O2/g,
    /HCOOCH2CH2CH3/g,
    /HCOOCH\(CH3\)2/g,
    /CH3COOCH2CH3/g,
    /CH3CH2COOCH3/g,
    /\b[xXyY]\s*=\s*[fF]\([xX]\)/g,
    /\b[xXyY]\^3\b/g,
    /\b[xXyY]\^2\b/g,
    /\b[a-zA-Z0-9_]+\s*=\s*[a-zA-Z0-9_\-\+\*\^/\\\s\(\)\pi\sqrt\Omega]+\b/g // Any general formula assignment
  ];

  // Apply math patterns wrap inside inline latex \( ... \)
  // We use standard placeholder system to avoid double-processing
  const placeholders: string[] = [];
  
  // Custom exact formulas matching:
  mathPatterns.forEach((pattern) => {
    modifiedText = modifiedText.replace(pattern, (match) => {
      const latex = convertRawToLaTeX(match);
      placeholders.push(`\\(${latex}\\)`);
      return `___MATH_PLACEHOLDER_${placeholders.length - 1}___`;
    });
  });

  // Re-substitute placeholders
  placeholders.forEach((ph, index) => {
    modifiedText = modifiedText.replace(`___MATH_PLACEHOLDER_${index}___`, ph);
  });

  return modifiedText;
}

/**
 * Highly polished component that renders mixed texts containing Vietnamese text and Math equations/formulas.
 * It automatically parses either LaTeX standard delimiters or formats raw text on-the-fly.
 */
export const MathText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  if (!text) return null;

  // Step 1: Wrap raw math inputs cleanly into LaTeX delimiters
  const wrappedText = wrapRawMathInLaTeXDelimiters(text);

  // Step 2: Split text into plain-text and math segments based on both block & inline delimiters
  // Delimiters handled:
  // $$ ... $$ (Block)
  // \[ ... \] (Block)
  // $ ... $ (Inline)
  // \( ... \) (Inline)
  const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/g;
  const segments = wrappedText.split(regex);

  return (
    <span className={`inline leading-relaxed ${className}`}>
      {segments.map((segment, index) => {
        if (!segment) return null;

        // Check if block delimiter
        if (segment.startsWith('$$') && segment.endsWith('$$')) {
          const rawFormula = segment.slice(2, -2);
          return <MathRenderer key={index} math={rawFormula} block />;
        }
        if (segment.startsWith('\\[') && segment.endsWith('\\]')) {
          const rawFormula = segment.slice(2, -2);
          return <MathRenderer key={index} math={rawFormula} block />;
        }

        // Check if inline delimiter
        if (segment.startsWith('$') && segment.endsWith('$')) {
          const rawFormula = segment.slice(1, -1);
          return <MathRenderer key={index} math={rawFormula} />;
        }
        if (segment.startsWith('\\(') && segment.endsWith('\\)')) {
          const rawFormula = segment.slice(2, -2);
          return <MathRenderer key={index} math={rawFormula} />;
        }

        // Otherwise render plain text normally
        return <span key={index}>{segment}</span>;
      })}
    </span>
  );
};
