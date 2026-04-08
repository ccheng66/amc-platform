export const formatBodyText = (text) => {
  if (!text) return "";
  return text
    .replace(/\[asy\][\s\S]*?\[\/asy\]/g, '') 
    .replace(/!\[Problem Diagram\]\([^)]+\)/g, '') 
    .replace(/\\begin\{align\*\}/g, "$$ \\begin{aligned} ")
    .replace(/\\end\{align\*\}/g, " \\end{aligned} $$")
    .replace(/\\blacklozenge/g, "◆") 
    .replace(/\\bigstar/g, "★")      
    .replace(/\\,/g, " ") 
    .replace(/\^\{\\circ\}/g, "°") 
    .replace(/\\?(?:text(?:bf|it)?)\{([^}]+)\}/g, "$1") 
    .replace(/\\?(?:text(?:bf|it)?)(\d+)/g, "$1") 
    .replace(/\\times/g, "×") 
    .replace(/\\cdot/g, "·")  
    .replace(/\\div/g, "÷")   
    .replace(/\\\$/g, "$")    
    .replace(/\\%/g, "%")     
    .replace(/\\triangle/g, "△") 
    .replace(/\\angle/g, "∠")    
    .replace(/(?<!\$)\\underline\{([^}]+)\}/g, "$\\underline{$1}$"); 
};

export const formatOptionText = (opt) => {
  if (!opt) return "";
  let cleanOpt = opt
    .replace(/^([A-E]\.)\s*\\+\s*/, '$1 ') 
    .replace(/\\\$/g, "$") 
    .replace(/\\%/g, "%") 
    .replace(/\\?(d?)frac/g, "\\$1frac") 
    .replace(/\\?(text(?:bf|it)?)\{([^}]+)\}/g, "\\$1{$2}") 
    .replace(/\\?(text(?:bf|it)?)(\d+)/g, "\\$1{$2}"); 
    
  return cleanOpt.replace(/^([A-E]\.)\s*(.+)$/, '$1 $$ $2 $$');
};

export function shuffleArray(array) {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}