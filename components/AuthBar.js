import { useState } from "react";
import { supabase } from "../utils/supabase";

export default function AuthBar({ session }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim()) return setAuthMessage("Please provide your first and last name.");
    setAuthMessage("Signing up...");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } }
    });
    if (error) setAuthMessage(error.message);
    else {
      setAuthMessage("Account created! (You can log in now if confirm is off)");
      setFirstName("");
      setLastName("");
    }
  };

  const handleLogin = async () => {
    setAuthMessage("Logging in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMessage(error.message);
    else {
      setAuthMessage("");
      setIsSignUpMode(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthMessage("");
    setIsSignUpMode(false);
  };

  return (
    <>
      <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '32px', border: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {session ? (
          <>
            <span style={{ fontSize: '16px', color: '#333' }}>
              Welcome, <strong>{session.user.user_metadata?.first_name || "Student"} {session.user.user_metadata?.last_name || ""}</strong>!
            </span>
            <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Log Out</button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <span style={{ fontWeight: 'bold', marginRight: 'auto' }}>
              {isSignUpMode ? "Create your account:" : "Log in to access the platform:"}
            </span>
            
            {isSignUpMode && (
              <>
                <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '110px' }} />
                <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '110px' }} />
              </>
            )}
            
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '160px' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '140px' }} />
            
            {isSignUpMode ? (
              <>
                <button onClick={handleSignUp} style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create Account</button>
                <button onClick={() => setIsSignUpMode(false)} style={{ padding: '8px 16px', background: 'transparent', color: '#0070f3', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
              </>
            ) : (
              <>
                <button onClick={handleLogin} style={{ padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Log In</button>
                <button onClick={() => setIsSignUpMode(true)} style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Sign Up</button>
              </>
            )}
          </div>
        )}
      </div>
      {authMessage && <p style={{ color: '#d9534f', fontSize: '14px', marginTop: '-20px', marginBottom: '32px' }}>{authMessage}</p>}
    </>
  );
}