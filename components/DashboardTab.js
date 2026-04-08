import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardTab({ session, userLevels }) {
  const [dashboardExamData, setDashboardExamData] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    const { data: exams, error } = await supabase
      .from('exam_results')
      .select('created_at, score, total_questions')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });
      
    if (!error && exams) {
      const formatted = exams.map((ex, i) => ({
        name: `Exam ${i + 1}`,
        date: new Date(ex.created_at).toLocaleDateString(),
        score: ex.score,
        percentage: Math.round((ex.score / ex.total_questions) * 100)
      }));
      setDashboardExamData(formatted);
    }
    setDashboardLoading(false);
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #eaeaea' }}>
      <h2 style={{ margin: '0 0 24px 0', color: '#102a43', textAlign: 'center', fontSize: '28px' }}>Your Learning Dashboard</h2>
      
      {dashboardLoading ? (
        <div style={{ padding: '60px 20px', fontSize: '20px', textAlign: 'center', color: '#666' }}>Loading your progress... ⏳</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          
          {/* Top Chart: Diagnostic Scores over time */}
          <div>
            <h3 style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '8px', marginBottom: '24px', color: '#333' }}>Diagnostic Exam Performance</h3>
            {dashboardExamData.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
                Take a Diagnostic Exam to see your progress chart!
              </div>
            ) : (
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <LineChart data={dashboardExamData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} stroke="#888" />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Score']}
                      labelFormatter={(label, payload) => payload[0] ? `Date: ${payload[0].payload.date}` : label}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="percentage" stroke="#0070f3" strokeWidth={3} dot={{ r: 6, fill: '#0070f3', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bottom Chart: Domain Skill Levels */}
          <div>
            <h3 style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '8px', marginBottom: '24px', color: '#333' }}>Intensive Training Mastery Levels</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={Object.entries(userLevels).map(([domain, level]) => ({ domain, level }))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="domain" stroke="#888" />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#888" />
                  <Tooltip 
                    cursor={{ fill: '#f0f4f8' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="level" fill="#28a745" radius={[4, 4, 0, 0]} name="Skill Level" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}