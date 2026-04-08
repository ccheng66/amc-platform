import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

// Crucial: Restores the math formatting!
import "katex/dist/katex.min.css"; 

// Import our modular components
import AuthBar from "../components/AuthBar";
import DiagnosticTab from "../components/DiagnosticTab";
import TrainingTab from "../components/TrainingTab";
import MistakeBookTab from "../components/MistakeBookTab";
import DashboardTab from "../components/DashboardTab";

export default function Home() {
  const [activeTab, setActiveTab] = useState("diagnostic");
  const [session, setSession] = useState(null);
  const [userLevels, setUserLevels] = useState({ Algebra: 1, Geometry: 1, Number: 1, Count: 1, Logic: 1 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setActiveTab("diagnostic"); 
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      supabase.from('profiles').select('domain_levels').eq('id', session.user.id).single()
        .then(({ data }) => { if (data?.domain_levels) setUserLevels(data.domain_levels); });
    }
  }, [session]);

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', fontFamily: 'sans-serif' }}>
      
      <AuthBar session={session} />

      {!session ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f0f4f8', borderRadius: '8px', border: '1px solid #d9e2ec' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '16px', color: '#102a43' }}>Welcome to the AMC Diagnostic Platform</h2>
          <p style={{ fontSize: '18px', color: '#486581', maxWidth: '500px', margin: '0 auto' }}>
            Please log in or sign up above to generate your personalized diagnostic exam, track your scores, and access intensive training.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '2px solid #eaeaea', paddingBottom: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab("diagnostic")} style={{ padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '8px', border: 'none', transition: 'all 0.2s', background: activeTab === "diagnostic" ? '#0070f3' : '#f0f4f8', color: activeTab === "diagnostic" ? '#fff' : '#486581' }}>📊 Diagnostic Exam</button>
            <button onClick={() => setActiveTab("training")} style={{ padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '8px', border: 'none', transition: 'all 0.2s', background: activeTab === "training" ? '#0070f3' : '#f0f4f8', color: activeTab === "training" ? '#fff' : '#486581' }}>🎯 Intensive Training</button>
            <button onClick={() => setActiveTab("mistakes")} style={{ padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '8px', border: 'none', transition: 'all 0.2s', background: activeTab === "mistakes" ? '#0070f3' : '#f0f4f8', color: activeTab === "mistakes" ? '#fff' : '#486581' }}>📚 Mistake Book</button>
            <button onClick={() => setActiveTab("dashboard")} style={{ padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '8px', border: 'none', transition: 'all 0.2s', background: activeTab === "dashboard" ? '#0070f3' : '#f0f4f8', color: activeTab === "dashboard" ? '#fff' : '#486581' }}>📈 Progress Dashboard</button>
          </div>

          {activeTab === "diagnostic" && <DiagnosticTab session={session} />}
          {activeTab === "training" && <TrainingTab session={session} userLevels={userLevels} setUserLevels={setUserLevels} />}
          {activeTab === "mistakes" && <MistakeBookTab session={session} />}
          {activeTab === "dashboard" && <DashboardTab session={session} userLevels={userLevels} />}
        </>
      )}
    </main>
  );
}