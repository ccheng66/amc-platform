import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import Latex from "react-latex-next";
import { formatBodyText, formatOptionText, shuffleArray } from "../utils/helpers";

export default function DiagnosticTab({ session }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    async function fetchBlueprint() {
      const blueprint = [
        { keyword: 'Algebra', count: 8 }, 
        { keyword: 'Geometry', count: 6 }, 
        { keyword: 'Number', count: 5 }, 
        { keyword: 'Count', count: 4 }, 
        { keyword: 'Logic', count: 2 }
      ];
      try {
        const promises = blueprint.map(async (req) => {
          const { data, error } = await supabase
            .from("problems")
            .select("*")
            .ilike("domain", `%${req.keyword}%`)
            .limit(50);
          if (error || !data) return [];
          return shuffleArray(data).slice(0, req.count);
        });
        const results = await Promise.all(promises);
        let finalExam = results.flat();
        finalExam.sort((a, b) => a.difficulty - b.difficulty);
        setProblems(finalExam);
      } catch (err) { 
        console.error("Blueprint failed", err); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchBlueprint();
  }, []); 

  const handleOptionClick = (problemId, letter) => { 
    if (isSubmitted) return; 
    setUserAnswers((prev) => ({ ...prev, [problemId]: letter })); 
  };

  const handleSubmit = async () => {
    let calculatedScore = 0; 
    let domainStats = {}; 
    let mistakesToSave = [];

    problems.forEach((prob) => {
      const domain = prob.domain || "Unknown";
      if (!domainStats[domain]) domainStats[domain] = { total: 0, correct: 0 };
      domainStats[domain].total += 1;
      
      if (userAnswers[prob.id] === prob.correct_answer) { 
        calculatedScore += 1; 
        domainStats[domain].correct += 1; 
      } else if (session?.user) {
        mistakesToSave.push({ user_id: session.user.id, problem_id: prob.id });
      }
    });

    let strengths = []; 
    let weaknesses = []; 
    let breakdown = [];
    
    Object.keys(domainStats).forEach(domain => {
      const stats = domainStats[domain];
      const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      breakdown.push({ domain, percentage, correct: stats.correct, total: stats.total });
      if (percentage >= 70) strengths.push(domain); 
      else if (percentage <= 40) weaknesses.push(domain);
    });
    
    breakdown.sort((a, b) => b.percentage - a.percentage);
    setScore(calculatedScore); 
    setAnalysis({ breakdown, strengths, weaknesses }); 
    setIsSubmitted(true);
    
    if (session?.user) {
      await supabase.from('exam_results').insert({ 
        user_id: session.user.id, 
        score: calculatedScore, 
        total_questions: problems.length, 
        analysis: { breakdown, strengths, weaknesses } 
      });
      if (mistakesToSave.length > 0) {
        await supabase.from('mistakes').upsert(mistakesToSave, { onConflict: 'user_id, problem_id' });
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <div style={{ padding: '60px 20px', fontSize: '20px', textAlign: 'center', color: '#666' }}>Generating your diagnostic exam... ⏳</div>;
  }

  if (problems.length === 0) {
    return <div style={{ padding: '60px 20px', fontSize: '20px', textAlign: 'center', color: '#d9534f' }}>No problems found. Check your database!</div>;
  }

  return (
    <div>
      {isSubmitted && analysis && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ background: '#d4edda', color: '#155724', padding: '24px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', border: '1px solid #c3e6cb' }}>
            You scored {score} out of {problems.length} ({Math.round(score/problems.length * 100)}%)
          </div>
          <div style={{ padding: '24px', border: '1px solid #eaeaea', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', background: '#fff' }}>
            <h2 style={{ fontSize: '22px', marginTop: 0, marginBottom: '20px' }}>Diagnostic Analysis</h2>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: '#f8fff9', border: '1px solid #c3e6cb', borderRadius: '8px' }}>
                <h3 style={{ color: '#2e7d32', margin: '0 0 8px 0', fontSize: '16px' }}>✨ Strongest Areas</h3>
                <p style={{ margin: 0, fontSize: '15px' }}>{analysis.strengths.length > 0 ? analysis.strengths.join(", ") : "Keep practicing!"}</p>
              </div>
              <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: '#fffafa', border: '1px solid #f5c6cb', borderRadius: '8px' }}>
                <h3 style={{ color: '#c62828', margin: '0 0 8px 0', fontSize: '16px' }}>🎯 Focus Areas</h3>
                <p style={{ margin: 0, fontSize: '15px' }}>{analysis.weaknesses.length > 0 ? analysis.weaknesses.join(", ") : "Solid performance!"}</p>
              </div>
            </div>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px' }}>Topic Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {analysis.breakdown.map((topic, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>
                    <span>{topic.domain}</span>
                    <span>{topic.correct} / {topic.total} ({topic.percentage}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#e9ecef', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${topic.percentage}%`, height: '100%', background: topic.percentage >= 70 ? '#28a745' : topic.percentage <= 40 ? '#dc3545' : '#ffc107', transition: 'width 1s ease-in-out' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {problems.map((prob, index) => (
          <div key={prob.id} data-problem-id={prob.id} style={{ padding: '24px', border: '1px solid #eaeaea', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '20px' }}>Question {index + 1}</span>
              <span style={{ fontSize: '14px', color: '#555', background: '#f5f5f5', padding: '6px 12px', borderRadius: '16px' }}>{prob.domain} • Difficulty: {prob.difficulty}</span>
            </div>
            <div style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
              <Latex>{formatBodyText(prob.body)}</Latex>
            </div>
            {prob.images && ( 
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                {Array.isArray(prob.images) ? prob.images.map((imgUrl, i) => <img key={i} src={imgUrl} alt={`Diagram`} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />) : <img src={prob.images} alt={`Diagram`} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />}
              </div> 
            )}
            
            {/* Options */}
            {prob.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(Array.isArray(prob.options) ? prob.options : JSON.parse(prob.options || "[]")).map((opt, i) => {
                  let cleanOpt = formatOptionText(opt);
                  const optionLetter = cleanOpt.charAt(0);
                  const isSelected = userAnswers[prob.id] === optionLetter;
                  const isCorrectAnswer = prob.correct_answer === optionLetter;
                  let bgColor = '#fafafa'; 
                  let borderColor = '#ddd';
                  
                  if (isSubmitted) { 
                    if (isCorrectAnswer) { bgColor = '#d4edda'; borderColor = '#c3e6cb'; } 
                    else if (isSelected && !isCorrectAnswer) { bgColor = '#f8d7da'; borderColor = '#f5c6cb'; } 
                  } else if (isSelected) { 
                    bgColor = '#e2e8f0'; borderColor = '#cbd5e1'; 
                  }
                  
                  return (
                    <div key={i} onClick={() => handleOptionClick(prob.id, optionLetter)} style={{ padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '6px', background: bgColor, fontSize: '16px', cursor: isSubmitted ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                      <Latex>{cleanOpt}</Latex>
                    </div>
                  );
                })}
              </div>
            )}

            {/* NEW: Solution Reveal Box */}
            {isSubmitted && prob.solution && (
              <div style={{ marginTop: '24px', padding: '16px', background: '#f8f9fa', borderLeft: '4px solid #0070f3', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#0070f3', fontSize: '16px' }}>Solution Explanation</h4>
                <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#333', overflowX: 'auto' }}>
                  <Latex>{formatBodyText(prob.solution)}</Latex>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>
      {!isSubmitted && problems.length > 0 && (
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <button onClick={handleSubmit} style={{ padding: '16px 32px', fontSize: '18px', fontWeight: 'bold', color: '#fff', backgroundColor: '#0070f3', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)', transition: 'background 0.2s ease' }}>
            Submit Exam & Get Score
          </button>
        </div>
      )}
    </div>
  );
}