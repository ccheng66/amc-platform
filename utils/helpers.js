export const formatBodyText = (text) => {
  if (!text) return "";

  const mathBlocks = [];
  
  // UPGRADED MASK: Now fully protects \[ ... \] and \( ... \) block math!
  const maskRegex = /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|(?<!\\)\$[\s\S]*?(?<!\\)\$/g;
  
  let safeText = text.replace(maskRegex, (match) => {
    mathBlocks.push(match);
    return `___MATH_${mathBlocks.length - 1}___`;
  });

  safeText = safeText
    .replace(/\[asy\][\s\S]*?\[\/asy\]/g, '') 
    .replace(/!\[Problem Diagram\]\([^)]+\)/g, '') 
    .replace(/\\begin\{align\*\}/g, "$$ \\begin{aligned} ")
    .replace(/\\end\{align\*\}/g, " \\end{aligned} $$")
    .replace(/\\blacklozenge/g, "◆") 
    .replace(/\\bigstar/g, "★")      
    .replace(/\\,/g, " ") 
    .replace(/\^\{\\circ\}/g, "°") 
    .replace(/\\ldots/g, "...") 
    .replace(/\\dots/g, "...") 
    .replace(/\\left(?![a-zA-Z])/g, "") 
    .replace(/\\right(?![a-zA-Z])/g, "")
    
    // Wrap orphaned fraction chains:
    .replace(/(\(?\s*\\frac\{[^{}]+\}\{[^{}]+\}(?:[\-\+\=×÷\s\.\(\)0-9]|\\cdot|\\cdots|\\times|\\dots)*)+/g, "$$ $& $$")
    
    // NEW: Catch orphaned \cdot math chains (e.g., 8!! = 2 \cdot 4 \cdot 6 \cdot 8)
    .replace(/((?:\d+!*\s*=\s*)?(?:\d+\s*\\cdot\s*)+\d+)/g, "$$ $1 $$")

    .replace(/\\boxed\{((?:[^{}]|\{[^{}]*\})*)\}/g, "$1")
    .replace(/\\?(?:text(?:bf|it)?)\{([^}]+)\}/g, "$1") 
    .replace(/\\?(?:text(?:bf|it)?)(\d+)/g, "$1") 
    .replace(/\\\$/g, "$")    
    .replace(/\\%/g, "%")     
    .replace(/\\triangle/g, "△") 
    .replace(/\\angle/g, "∠")    
    .replace(/\\underline\{([^}]+)\}/g, "$\\underline{$1}$"); 

  mathBlocks.forEach((block, i) => {
    safeText = safeText.replace(`___MATH_${i}___`, block);
  });

  return safeText
    .replace(/([.,?!])\$/g, "$$$1")
    .replace(/\$(\d+(?:\.\d+)?)\$/g, "$$$1") 
    .replace(/⋅\s*⋅/g, "\\cdots ")
    .replace(/⋅/g, "\\cdot ");
};

export const formatOptionText = (opt) => {
  if (!opt) return "";
  
  const mathBlocks = [];
  const maskRegex = /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|(?<!\\)\$[\s\S]*?(?<!\\)\$/g;
  
  let safeOpt = opt.replace(maskRegex, (match) => {
    mathBlocks.push(match);
    return `___MATH_${mathBlocks.length - 1}___`;
  });

  safeOpt = safeOpt
    .replace(/^([A-E]\.)\s*\\+\s*/, '$1 ') 
    .replace(/\\%/g, "%") 
    .replace(/\\ldots/g, "...") 
    .replace(/\\dots/g, "...")  
    .replace(/\\left(?![a-zA-Z])/g, "") 
    .replace(/\\right(?![a-zA-Z])/g, "")
    
    .replace(/(\(?\s*\\frac\{[^{}]+\}\{[^{}]+\}(?:[\-\+\=×÷\s\.\(\)0-9]|\\cdot|\\cdots|\\times|\\dots)*)+/g, "$$ $& $$")
    .replace(/((?:\d+!*\s*=\s*)?(?:\d+\s*\\cdot\s*)+\d+)/g, "$$ $1 $$")
    
    .replace(/\\boxed\{((?:[^{}]|\{[^{}]*\})*)\}/g, "$1")
    .replace(/\\\$/g, "$") 
    .replace(/\\?(d?)frac/g, "\\$1frac") 
    .replace(/\\?(text(?:bf|it)?)\{([^}]+)\}/g, "\\$1{$2}") 
    .replace(/\\?(text(?:bf|it)?)(\d+)/g, "\\$1{$2}"); 
    
  mathBlocks.forEach((block, i) => {
    safeOpt = safeOpt.replace(`___MATH_${i}___`, block);
  });

  safeOpt = safeOpt
    .replace(/([.,?!])\$/g, "$$$1")
    .replace(/\$(\d+(?:\.\d+)?)\$/g, "$$$1")
    .replace(/⋅\s*⋅/g, "\\cdots ")
    .replace(/⋅/g, "\\cdot ");

  return safeOpt.replace(/^([A-E]\.)\s*(.+)$/, '$1 $$ $2 $$');
};

export function shuffleArray(array) {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}