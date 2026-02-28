import React, { useState } from "react";
import { FaInfoCircle, FaPaperPlane, FaTimes } from "react-icons/fa";

const ChatBot = ({ context, category }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: `I am your ${category} assistant. How can I help with this report?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input, context, category })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error: Could not reach the assistant." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={chatStyles.wrapper}>
      {isOpen && (
        <div style={chatStyles.window}>
          <div style={chatStyles.header}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
               <FaInfoCircle /> <span>{category} Expert</span>
            </div>
            <FaTimes onClick={() => setIsOpen(false)} style={{cursor:'pointer'}} />
          </div>
          
          <div style={chatStyles.body}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === 'ai' ? chatStyles.aiBubble : chatStyles.userBubble}>
                {m.text}
              </div>
            ))}
            {loading && <div style={chatStyles.aiBubble}>Thinking...</div>}
          </div>

          <div style={chatStyles.footer}>
            <input 
              style={chatStyles.input}
              value={input}
              placeholder="Ask about these ingredients..."
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} style={chatStyles.sendBtn}>
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}
      
      <button onClick={() => setIsOpen(!isOpen)} style={chatStyles.floatingBtn}>
        <FaInfoCircle size={20} /> Talk to Expert
      </button>
    </div>
  );
};

const chatStyles = {
  wrapper: { position: 'fixed', bottom: '40px', right: '40px', zIndex: 9999 },
  floatingBtn: { padding: '15px 30px', borderRadius: '50px', backgroundColor: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontWeight: 'bold' },
  window: { width: '380px', height: '550px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '20px' },
  header: { padding: '20px', backgroundColor: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' },
  body: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc' },
  aiBubble: { padding: '12px 16px', backgroundColor: 'white', borderRadius: '15px', alignSelf: 'flex-start', maxWidth: '85%', fontSize: '14px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: '1.5' },
  userBubble: { padding: '12px 16px', backgroundColor: '#2ecc71', color: 'white', borderRadius: '15px', alignSelf: 'flex-end', maxWidth: '85%', fontSize: '14px', fontWeight: '500' },
  footer: { padding: '15px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', backgroundColor: 'white' },
  input: { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e0', outline: 'none' },
  sendBtn: { backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '12px', padding: '0 15px', cursor: 'pointer' }
};

export default ChatBot;