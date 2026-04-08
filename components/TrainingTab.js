import { useState } from "react";
import { supabase } from "../utils/supabase";
import Latex from "react-latex-next";
import { formatBodyText, formatOptionText, shuffleArray } from "../utils/helpers";

export default function TrainingTab({ session, userLevels, setUserLevels }) {
  const [trainingDomain, setTrainingDomain] = useState("");
  const [trainingProblems, setTrainingProblems] = useState([]);
  const [trainingAnswers, setTrainingAnswers] = useState({});
  const [isTrainingFinished, setIsTrainingFinished] = useState(false);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingFeedback, setTrainingFeedback] = useState("");

  const handleStartTraining = async () => {
    if (!trainingDomain) return;
    setTrainingLoading(true); 
    setTrainingProblems([]); 
    setTrainingAnswers({}); 
    setIsTrainingFinished(false); 
    setTrainingFeedback("");
    
    const currentLevel = userLevels[trainingDomain] || 1;
    const { data, error } = await supabase
      .from("problems")
      .select("*")
      .ilike("domain", `%${trainingDomain}%`)
      .eq("difficulty", currentLevel)
      .limit(30);
      
    if (!error && data && data.length > 0) {
      setTrainingProblems(shuffleArray(data).slice(0, 10));
    } else {
      alert(`No Level ${currentLevel} questions found for ${trainingDomain}!`);
    }
    setTrainingLoading(false);
  };

  const handleTrainingOptionClick = (problemId, letter) => {
    if (trainingAnswers[problemId] || isTrainingFinished) return;
    setTrainingAnswers((prev) => ({ ...prev, [problemId]: letter }));
  };

  const handleFinishTraining = async () => {
    let correctCount = 0; 
    const totalProblems = trainingProblems.length; 
    let mistakesToSave = [];
    
    trainingProblems.forEach((prob) => {
      if (trainingAnswers[prob.id] === prob.correct_answer) {
        correctCount += 1;
      } else if (session?.user) {
        mistakesToSave.push({ user_id: session.user.id, problem_id: prob.id });
      }
    });
    
    setIsTrainingFinished(true);
    const requiredToPass = Math.ceil(totalProblems * 0.8); 
    
    if (correctCount >= requiredToPass) {
      const currLevel = userLevels[trainingDomain] || 1;
      if (currLevel < 5) { 
        const updatedLevels = { ...userLevels, [trainingDomain]: currLevel + 1 };
        setUserLevels(updatedLevels); 
        setTrainingFeedback(`🎉 Mastered! You leveled up to Level ${currLevel + 1} in ${trainingDomain}!`);
        if (session?.user) {
          await supabase.from('profiles').update({ domain_levels: updatedLevels }).eq('id', session.user.id);
        }
      } else {
        setTrainingFeedback(`🏆 Perfect! You have mastered the highest level of ${trainingDomain}!`);
      }
    } else {
      setTrainingFeedback(`You scored ${correctCount}/${totalProblems}. Review your mistakes below!`);
    }
    
    if (mistakesToSave.length > 0) {
      await supabase.from('mistakes').upsert(mistakesToSave, { onConflict: 'user_id, problem_id' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetTrainingSelection = () => { 
    setTrainingProblems([]); 
    setTrainingAnswers({}); 
    setIsTrainingFinished(false); 
  };

  return (
    <div>
      {trainingProblems.length === 0 ? (
        <div style={{ padding: '40px 20px', background: '#fff', borderRadius: '8px', border: '1px solid #eaeaea', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', color: '#102a43', marginBottom: '16px' }}>Intensive Training Series</h2>
          <p style={{ fontSize: '18px', color: '#486581', marginBottom: '32px' }}>
            Select a domain to challenge your current skill level! Master 80% to level up.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {Object.entries(userLevels).map(([domain, lvl]) => (
              <span key={domain} style={{ background: '#f0f4f8', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', color: '#102a43' }}>
                {domain}: Lvl {lvl}
              </span>
            ))}
          </div>
          <select value={trainingDomain} onChange={(e) => setTrainingDomain(e.target.value)} style={{ padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc', marginRight: '16px', width: '250px' }}>
            <option value="" disabled>Select a Domain...</option>
            <option value="Algebra">Algebra</option>
            <option value="Geometry">Geometry</option>
            <option value="Number">Number Theory</option>
            <option value="Count">Counting & Probability</option>
            <option value="Logic">Logic</option>
          </select>
          <button onClick={handleStartTraining} disabled={!trainingDomain || trainingLoading} style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', color: '#fff', backgroundColor: '#28a745', border: 'none', borderRadius: '8px', cursor: trainingDomain ? 'pointer' : 'not-allowed', opacity: trainingDomain ? 1 : 0.6 }}>
            {trainingLoading ? "Loading..." : "Start Training"}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0 }}>{trainingDomain} Training - Level {userLevels[trainingDomain]}</h2>
            <button onClick={resetTrainingSelection} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Back to Menu</button>
          </div>
          
          {isTrainingFinished && (
            <div style={{ background: trainingFeedback.includes('Mastered') || trainingFeedback.includes('Perfect') ? '#d4edda' : '#fff3cd', color: trainingFeedback.includes('Mastered') || trainingFeedback.includes('Perfect') ? '#155724' : '#856404', padding: '24px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', fontSize: '20px', fontWeight: 'bold', border: `1px solid ${trainingFeedback.includes('Mastered') || trainingFeedback.includes('Perfect') ? '#c3e6cb' : '#ffeeba'}` }}>
              {trainingFeedback}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {trainingProblems.map((prob, index) => (
              <div key={prob.id} data-problem-id={prob.id} style={{ padding: '24px', border: '1px solid #eaeaea', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '20px' }}>Question {index + 1}</span>
                  <span style={{ fontSize: '14px', color: '#555', background: '#f5f5f5', padding: '6px 12px', borderRadius: '16px' }}>Difficulty: {prob.difficulty}</span>
                </div>
                <div style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                  <Latex>{formatBodyText(prob.body)}</Latex>
                </div>
                {prob.images && ( 
                  <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                    {Array.isArray(prob.images) ? prob.images.map((imgUrl, i) => <img key={i} src={imgUrl} alt={`Diagram`} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />) : <img src={prob.images} alt={`Diagram`} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />}
                  </div> 
                )}
                {prob.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(Array.isArray(prob.options) ? prob.options : JSON.parse(prob.options || "[]")).map((opt, i) => {
                      let cleanOpt = formatOptionText(opt);
                      const optionLetter = cleanOpt.charAt(0);
                      const isAnswered = !!trainingAnswers[prob.id]; 
                      const isSelected = trainingAnswers[prob.id] === optionLetter; 
                      const isCorrectAnswer = prob.correct_answer === optionLetter;
                      let bgColor = '#fafafa'; 
                      let borderColor = '#ddd';
                      
                      if (isAnswered) { 
                        if (isCorrectAnswer) { bgColor = '#d4edda'; borderColor = '#c3e6cb'; } 
                        else if (isSelected && !isCorrectAnswer) { bgColor = '#f8d7da'; borderColor = '#f5c6cb'; } 
                      } else if (isSelected) { 
                        bgColor = '#e2e8f0'; borderColor = '#cbd5e1'; 
                      }
                      
                      return (
                        <div key={i} onClick={() => handleTrainingOptionClick(prob.id, optionLetter)} style={{ padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '6px', background: bgColor, fontSize: '16px', cursor: isAnswered ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                          <Latex>{cleanOpt}</Latex>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {!isTrainingFinished && (
            <div style={{ marginTop: '40px', textAlign: 'center' }}>
              <button onClick={handleFinishTraining} disabled={Object.keys(trainingAnswers).length < trainingProblems.length} style={{ padding: '16px 32px', fontSize: '18px', fontWeight: 'bold', color: '#fff', backgroundColor: Object.keys(trainingAnswers).length < trainingProblems.length ? '#ccc' : '#0070f3', border: 'none', borderRadius: '8px', cursor: Object.keys(trainingAnswers).length < trainingProblems.length ? 'not-allowed' : 'pointer', transition: 'background 0.2s ease' }}>
                Finish Training & Check Level
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}