import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- THE SECRET SAUCE: ASYMPTOTE SANITIZER ---
function sanitizeAsymptote(rawAsy) {
  let code = rawAsy.replace(/^\$|\$$/g, '').trim();
  code = code.replace(/\/\*[\s\S]*?\*\//g, ' ');

  // 1. Protect Functions & Loops (MUST be followed by a parenthesis)
  // We added 'for', 'if', and 'while' to this list!
  const funcRegex = /\b(draw|filldraw|label|size|add|dot|unitsize|fill|clip|anglemark|pathticks|roundedpath|transform|for|if|while)\s*\(/g;
  code = code.replace(funcRegex, (m) => `\n${m}`);
  
  // 2. Protect Variable Declarations
  const varRegex = /\b(path|transform|int|real|pair|string|pen|guide)(\[\])*\s+[a-zA-Z0-9_,]+\s*(=|;)/g;
  code = code.replace(varRegex, (m) => `\n${m}`);
  
  // 3. Protect Safe Keywords (Rarely used as normal English words)
  const keywordRegex = /\b(import|void)\b/g;
  code = code.replace(keywordRegex, (m) => `\n${m}`);

  // 4. Re-serialize & Insulate
  code = code.replace(/;/g, ';\n').replace(/\{/g, '{\n').replace(/\}/g, '\n}\n');
  code = code.replace(/\/\//g, '\n//');

  // 5. Line-by-Line Comment Stripper
  const cleanLines = code.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) return '';
    if (trimmed.includes('//')) return trimmed.split('//')[0];
    return trimmed;
  });

  return cleanLines.filter(l => l.length > 0).join('\n');
}

async function runTest() {
  const targetId = "AMC8_2020_9"; // Change this to test different problems
  console.log(`🔍 Fetching ${targetId}...`);

  const { data: prob, error } = await supabase
    .from("problems")
    .select("body, options")
    .eq("id", targetId)
    .single();

  if (error || !prob) return console.error("Database error:", error);

  // --- THE FRANKENSTEIN STITCHER ---
  let combinedText = prob.body;
  const isMangled = combinedText.includes("[asy]") && !combinedText.includes("[/asy]");

  if (isMangled) {
    // 1. Remove the unclosed dangling $ left by the scraper at the end of the body
    combinedText = combinedText.replace(/\$\s*$/, "");
      
    // 2. Stitch the options back on
    combinedText += " " + prob.options.join(" ");
  }

  // --- EXTRACTION ---
  const asyMatch = combinedText.match(/\[asy\]([\s\S]*?)\[\/asy\]/);
  if (!asyMatch) return console.error("❌ No [asy] tags found in combined text!");

const cleanCode = sanitizeAsymptote(asyMatch[1]);

// --- SMART IMPORTS ---
    let autoImports = "import math;\n";
    
    // 1. Safe Competition Macros
    if (/(anglemark|pathticks|rightanglemark|markangle)/.test(cleanCode) && !cleanCode.includes("import olympiad")) {
      autoImports += "import olympiad;\n";
    }
    if (/roundedpath/.test(cleanCode) && !cleanCode.includes("import roundedpath")) {
      autoImports += "import roundedpath;\n";
    }

    // 2. The Namespace War Resolver (graph vs geometry)
    // If it uses axes, plotting, or ticks, it needs 'graph'.
    if (/(xaxis|yaxis|Ticks|plot|\bgraph\()/.test(cleanCode)) {
      if (!cleanCode.includes("import graph")) autoImports += "import graph;\n";
    } 
    // Otherwise, it is a standard AMC geometry problem, so it needs 'geometry'.
    else {
      if (!cleanCode.includes("import geometry")) autoImports += "import geometry;\n";
    }

  const finalFileContent = `${autoImports}size(300);\n${cleanCode}`;
  
  fs.writeFileSync("final_test.asy", finalFileContent);
  console.log("✅ Wrote cleaned code to 'final_test.asy'. Compiling...");

  try {
    // Compile with a large buffer for long chains
    await execAsync("asy -f svg ./final_test.asy -o final_test.svg", { maxBuffer: 1024 * 1024 * 10 });
    
    // Wait 500ms for file system to catch up
    await new Promise(res => setTimeout(res, 500));

    if (fs.existsSync("final_test.svg")) {
      console.log("🎉 SUCCESS! 'final_test.svg' generated perfectly.");
    } else {
      console.log("⚠️ Command finished, but no SVG found. Check 'final_test.asy' syntax.");
    }
  } catch (err) {
    console.error("❌ Asymptote compilation failed:", err.message);
  }
}

runTest();
