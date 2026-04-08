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

// --- SANITIZER FUNCTION (Same as test script) ---
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

async function processAllGeometry() {
  console.log("🚀 Starting Geometry Batch Processor...");

  // Fetch all problems that have [asy] in the body
  const { data: problems, error } = await supabase
    .from("problems")
    .select("id, body, options")
    .ilike("body", "%[asy]%");

  if (error) return console.error("Failed to fetch problems:", error);
  console.log(`Found ${problems.length} problems with [asy] tags. Processing...`);

  for (const prob of problems) {
    console.log(`\n▶️ Processing: ${prob.id}`);
    
    let combinedText = prob.body;
    const isMangled = combinedText.includes("[asy]") && !combinedText.includes("[/asy]");

    if (isMangled) {
      // 1. Remove the unclosed dangling $ left by the scraper at the end of the body
      combinedText = combinedText.replace(/\$\s*$/, "");
      
      // 2. Stitch the options back on
      combinedText += " " + prob.options.join(" ");
    }

    // 2. EXTRACT
    const asyMatch = combinedText.match(/\[asy\]([\s\S]*?)\[\/asy\]/);
    if (!asyMatch) {
      console.log(`⏭️ No valid block found for ${prob.id}, skipping.`);
      continue;
    }

  // 3. SANITIZE & WRITE
    const cleanCode = sanitizeAsymptote(asyMatch[1]);

    if (cleanCode.length < 5) {
      console.log(`⏭️ Code too short/empty for ${prob.id}, skipping.`);
      continue;
    }

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

    const fileContent = `${autoImports}size(300);\n${cleanCode}`;
    
    const tempAsy = `${prob.id}.asy`;
    const tempSvg = `${prob.id}.svg`;
    fs.writeFileSync(tempAsy, fileContent);

    try {
      // 4. COMPILE
      await execAsync(`asy -f svg ./${tempAsy} -o ${tempSvg}`, { maxBuffer: 1024 * 1024 * 10 });
      await new Promise(res => setTimeout(res, 500)); // Settling delay

      if (!fs.existsSync(tempSvg)) throw new Error("SVG not generated");

      // 5. UPLOAD TO SUPABASE STORAGE
      const fileBuffer = fs.readFileSync(tempSvg);
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('geometry-images') // Make sure this matches your bucket name!
        .upload(`${prob.id}.svg`, fileBuffer, {
          contentType: 'image/svg+xml',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 6. GET PUBLIC URL
      const { data: publicUrlData } = supabase
        .storage
        .from('geometry-images')
        .getPublicUrl(`${prob.id}.svg`);
      
      const imageUrl = publicUrlData.publicUrl;

      // 7. UPDATE DATABASE ROW
      let updatedBody = prob.body;
      let updatedOptions = prob.options;

      if (isMangled) {
        // 1. Replace the broken [asy] in body with the Image
        updatedBody = prob.body.replace(/\$?\[asy\][\s\S]*/, `\n![Problem Diagram](${imageUrl})\n`);
        
        // 2. Clear the code fragments out of the options entirely
        // Since the SVG contains the 5 histograms, the options just need to be labels.
        updatedOptions = ["A", "B", "C", "D", "E"];
      } else {
        // Normal replacement for non-mangled problems
        updatedBody = prob.body.replace(/\$?\[asy\][\s\S]*?\[\/asy\]\$?/, `\n![Problem Diagram](${imageUrl})\n`);
      }

      const { error: updateError } = await supabase
        .from('problems')
        .update({ 
          images: [imageUrl],
          body: updatedBody,
          options: updatedOptions // <--- Ensure this is explicitly set
        })
        .eq('id', prob.id);

      if (updateError) {
        console.error(`❌ Failed to update Supabase for ${prob.id}:`, updateError.message);
      } else {
        console.log(`✅ Uploaded and updated database for ${prob.id}`);
      }
    } catch (err) {
      console.error(`❌ Failed on ${prob.id}:`, err.message);
    } finally {
      // 8. CLEANUP TEMP FILES
      if (fs.existsSync(tempAsy)) fs.unlinkSync(tempAsy);
      if (fs.existsSync(tempSvg)) fs.unlinkSync(tempSvg);
    }
  }
  console.log("\n🎉 Batch processing complete!");
}

processAllGeometry();
