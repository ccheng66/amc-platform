import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import Latex from "react-latex-next";
import { formatBodyText, formatOptionText, shuffleArray } from "../utils/helpers";

export default function MistakeBookTab({ session }) {
  const [mistakeProblems, setMistakeProblems] = useState([]);
  const [mistakeAnswers, setMistakeAnswers] = useState({});
  const [mistakeLoading, setMistakeLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchMistakes();
    }
  }, [session]);

  const fetchMistakes = async () => {
    setMistakeLoading(true); 
    setMistakeAnswers({});
    
    const { data: mistakeData, error } = await supabase
      .from('mistakes')
      .select('problem_id')
      .eq('user_id', session.user.id)
      .limit(30);
      
    if (!error && mistakeData.length > 0) {
      const shuffledIds = shuffleArray(mistakeData.map(m => m.problem_id)).slice(0, 10);
      const { data: probData } = await supabase
        .from('problems')
        .select('*')
        .in('id', shuffledIds);
      setMistakeProblems(probData || []);
    } else {
      setMistakeProblems([]);
    }
    setMistakeLoading(false);
  };

  const handleMistakeOptionClick = async (problemId, letter) => {
    if (mistakeAnswers[problemId]) return; 
    setMistakeAnswers((prev) => ({ ...prev, [problemId]: letter }));
    
    const prob = mistakeProblems.find(p => p.id === problemId);
    
    if (prob.correct_answer === letter) {
      await supabase
        .from('mistakes')
        .delete()
        .eq('user_id', session.user.id)
        .eq('problem_id', problemId);
    }
  };

  if (mistakeLoading) {
    return <div style={{ padding: '60px 20px', fontSize: '20px', textAlign: 'center', color: '#666' }}>Dusting off your old mistakes... ⏳</div>;
  }

  if (mistakeProblems.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '8px', color: '#155724' }}>
        <h2 style={{ fontSize: '24px', margin: '0 0 16px 0' }}>🎉 Clean Slate!</h2>
        <p style={{ fontSize: '18px', margin: 0 }}>Your Mistake Book is empty. Take a Diagnostic Exam to find areas to improve!</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #eaeaea', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 12px 0', color: '#102a43' }}>Your Mistake Book</h2>
        <p style={{ margin: 0, fontSize: '16px', color: '#486581' }}>
          We pulled past questions you missed. Answer them correctly to permanently delete them from your book!
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {mistakeProblems.map((prob, index) => {
          const isAnswered = !!mistakeAnswers[prob.id]; 
          const isCorrect = mistakeAnswers[prob.id] === prob.correct_answer;
          
          return (
            <div key={prob.id} data-problem-id={prob.id} style={{ padding: '24px', border: '1px solid', borderColor: isAnswered ? (isCorrect ? '#c3e6cb' : '#f5c6cb') : '#eaeaea', borderRadius: '8px', background: isAnswered ? (isCorrect ? '#f8fff9' : '#fffafa') : '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '20px', color: isAnswered && isCorrect ? '#28a745' : '#333' }}>
                  {isAnswered ? (isCorrect ? "✅ Erased from Mistake Book!" : "❌ Still Needs Practice") : `Review Problem ${index + 1}`}
                </span>
                <span style={{ fontSize: '14px', color: '#555', background: '#f5f5f5', padding: '6px 12px', borderRadius: '16px' }}>{prob.domain}</span>
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
                    const isSelected = mistakeAnswers[prob.id] === optionLetter; 
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
                      <div key={i} onClick={() => handleMistakeOptionClick(prob.id, optionLetter)} style={{ padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '6px', background: bgColor, fontSize: '16px', cursor: isAnswered ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                        <Latex>{cleanOpt}</Latex>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* NEW: Solution Reveal Box */}
              {isAnswered && prob.solution && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#f8f9fa', borderLeft: '4px solid #0070f3', borderRadius: '4px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#0070f3', fontSize: '16px' }}>Solution Explanation</h4>
                  <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#333', overflowX: 'auto' }}>
                    <Latex>{formatBodyText(prob.solution)}</Latex>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <button onClick={fetchMistakes} style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', color: '#486581', backgroundColor: '#f0f4f8', border: '1px solid #d9e2ec', borderRadius: '8px', cursor: 'pointer' }}>
          Refresh Mistake Book
        </button>
      </div>
    </div>
  );
}