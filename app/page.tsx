'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  PhoneCall, 
  Clock, 
  ShieldCheck, 
  Wrench, 
  Send, 
  Bot, 
  CheckCircle2,
  Menu,
  X,
  MessageCircle,
  Zap,
  Briefcase,
  Mic,
  Activity,
  ArrowRight,
  Star,
  Settings,
  User,
  Smile,
  Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// import { sendLeadEmail } from './actions'; // Removed for static export
import { GoogleGenAI } from "@google/genai";

// --- BOT CONFIGURATION ---
interface BotSettings {
  name: string;
  greeting: string;
  tone: string;
  avatarType: 'bot' | 'user' | 'smile';
  primaryColor: string;
}

const DEFAULT_SETTINGS: BotSettings = {
  name: "PlumbBot AI",
  greeting: "Hi! I'm PlumbBot AI. How can I help you today?",
  tone: "professional and helpful",
  avatarType: 'bot',
  primaryColor: "blue"
};

// --- KNOWLEDGE BASE ---
// Paste your business information, FAQs, pricing, and service details here.
// The AI will use this to answer customer questions accurately.
const KNOWLEDGE_BASE = `
PlumbBot AI is a professional plumbing service based in the UK.
- Services: Boiler repair (£120+), leak fixing (£80+), blocked drains (£90+), emergency call-outs (24/7).
- Areas Covered: All of London, Kent, and Surrey.
- Pricing: Standard call-out fee is £80 (includes first hour).
- Emergency: We aim to be on-site within 60 minutes for emergencies.
- Goal: Your primary goal is to help customers with plumbing issues and eventually collect their POSTCODE and PHONE NUMBER so an engineer can call them back.
`;

function ChatbotWidget() {
  const [settings, setSettings] = useState<BotSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: DEFAULT_SETTINGS.greeting, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('plumbbot_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        // Update initial message if it hasn't been interacted with
        setMessages([{ role: 'bot', text: parsed.greeting, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  const saveSettings = (newSettings: BotSettings) => {
    setSettings(newSettings);
    localStorage.setItem('plumbbot_settings', JSON.stringify(newSettings));
    setShowSettings(false);
    // Reset conversation to show new greeting
    setMessages([{ role: 'bot', text: newSettings.greeting, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
  };

  // Initialize Gemini AI
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "" });

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-GB';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start recognition", e);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;
    
    const userMsg = input.trim();
    const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg, time: currentTime }]);
    setInput('');
    setIsTyping(true);

    try {
      // Prepare conversation history for Gemini
      const history = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: `
            You are ${settings.name}, a ${settings.tone} plumbing assistant.
            Use the following knowledge base to answer questions:
            ${KNOWLEDGE_BASE}
            
            Guidelines:
            1. Be concise and friendly.
            2. If you don't know the answer, say you'll have an engineer call them.
            3. Always try to naturally guide the conversation toward getting their POSTCODE and PHONE NUMBER.
            4. If they provide a postcode, confirm we cover it.
            5. Once you have both postcode and phone number, tell them an engineer will call shortly.
          `,
          temperature: 0.7,
        },
      });

      const botReply = response.text || "I'm sorry, I'm having a bit of trouble connecting. Please try again in a moment.";
      const botTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      setMessages(prev => [...prev, { role: 'bot', text: botReply, time: botTime }]);
    } catch (error) {
      console.error("Gemini AI Error:", error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: "I'm having a little technical hiccup. Could you try that again?", 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const AvatarIcon = () => {
    switch (settings.avatarType) {
      case 'user': return <User className="w-6 h-6" />;
      case 'smile': return <Smile className="w-6 h-6" />;
      default: return <Bot className="w-6 h-6" />;
    }
  };

  const colorClasses: Record<string, string> = {
    blue: "from-blue-700 to-blue-600",
    indigo: "from-indigo-700 to-indigo-600",
    slate: "from-slate-800 to-slate-700",
    emerald: "from-emerald-700 to-emerald-600"
  };
  const currentHeaderColor = colorClasses[settings.primaryColor] || colorClasses.blue;

  const buttonColorClasses: Record<string, string> = {
    blue: "bg-blue-600 hover:bg-blue-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    slate: "bg-slate-700 hover:bg-slate-800",
    emerald: "bg-emerald-600 hover:bg-emerald-700"
  };
  const currentButtonColor = buttonColorClasses[settings.primaryColor] || buttonColorClasses.blue;

  return (
    <div className="flex flex-col h-[550px] bg-white border border-slate-200/60 rounded-[2rem] shadow-2xl overflow-hidden relative z-10 ring-1 ring-slate-900/5">
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentHeaderColor} px-6 py-5 flex items-center justify-between text-white shrink-0 shadow-sm relative z-20`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm border border-white/10">
              <AvatarIcon />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-blue-600 rounded-full"></span>
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight tracking-tight">{settings.name}</h3>
            <p className="text-blue-100 text-sm font-medium flex items-center gap-1.5 mt-0.5 opacity-90">
              Usually replies instantly
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          title="Admin Settings"
        >
          <Settings className="w-5 h-5 opacity-80 hover:opacity-100" />
        </button>
      </div>
      
      {/* Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 z-30 bg-white p-6 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold text-slate-900">Bot Settings</h4>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bot Name</label>
                <input 
                  type="text" 
                  value={settings.name}
                  onChange={(e) => setSettings({...settings, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Greeting Message</label>
                <textarea 
                  rows={2}
                  value={settings.greeting}
                  onChange={(e) => setSettings({...settings, greeting: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tone of Voice</label>
                <select 
                  value={settings.tone}
                  onChange={(e) => setSettings({...settings, tone: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="professional and helpful">Professional & Helpful</option>
                  <option value="friendly and casual">Friendly & Casual</option>
                  <option value="urgent and direct">Urgent & Direct</option>
                  <option value="humorous and witty">Humorous & Witty</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Avatar Style</label>
                <div className="flex gap-3">
                  {(['bot', 'user', 'smile'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSettings({...settings, avatarType: type})}
                      className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center ${
                        settings.avatarType === type ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {type === 'bot' && <Bot className="w-5 h-5" />}
                      {type === 'user' && <User className="w-5 h-5" />}
                      {type === 'smile' && <Smile className="w-5 h-5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Theme Color</label>
                <div className="flex gap-3">
                  {['blue', 'indigo', 'slate', 'emerald'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setSettings({...settings, primaryColor: color})}
                      className={`w-10 h-10 rounded-full border-4 transition-all ${
                        settings.primaryColor === color ? 'border-white ring-2 ring-slate-900' : 'border-transparent'
                      } ${
                        color === 'blue' ? 'bg-blue-600' : 
                        color === 'indigo' ? 'bg-indigo-600' : 
                        color === 'slate' ? 'bg-slate-700' : 'bg-emerald-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button 
                onClick={() => saveSettings(settings)}
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all mt-4"
              >
                Save & Apply Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 relative" 
        style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? `${currentButtonColor} text-white rounded-br-sm` 
                  : 'bg-white border border-slate-200/60 text-slate-800 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
              <span suppressHydrationWarning className="text-[11px] text-slate-400 mt-1.5 px-1 font-medium">{msg.time}</span>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5, transition: { duration: 0.3, ease: "easeIn" } }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="flex justify-start"
            >
              <div className="bg-white border border-slate-200/60 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                    animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0 relative z-20">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              placeholder={isListening ? "Listening..." : "Type your message..."}
              className={`w-full bg-white border-2 border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 rounded-full pl-6 pr-12 py-3.5 text-[15px] outline-none transition-all placeholder:text-slate-400 shadow-sm disabled:opacity-50 disabled:bg-slate-50 ${isListening ? 'ring-2 ring-red-500/50 border-red-200' : ''}`}
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
                isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
              }`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              <Mic className={`w-5 h-5 ${isListening ? 'fill-current' : ''}`} />
            </button>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className={`${currentButtonColor} text-white p-3.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95 flex-shrink-0`}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
        <div className="text-center mt-3">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Powered by {settings.name}</span>
        </div>
      </div>
    </div>
  );
}

function LeadForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    // For static hosting (like GitHub Pages), you cannot use Server Actions.
    // To get real email submissions, you can use a service like Formspree:
    // 1. Change the form tag to: <form action="https://formspree.io/f/your-id" method="POST">
    // 2. Or use a client-side fetch to your own API endpoint.
    
    // Simulating a successful submission for the demo
    setTimeout(() => {
      setStatus('success');
    }, 1500);
  };

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 md:p-14 rounded-[2.5rem] text-center border border-slate-200/60 shadow-2xl shadow-slate-200/50"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-3xl font-bold mb-4 tracking-tight text-slate-900">You&apos;re on the list!</h3>
        <p className="text-slate-600 text-lg max-w-md mx-auto leading-relaxed">
          Thanks for registering your interest. We&apos;ll be in touch soon with your early access details and next steps.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-200/60 relative z-10">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Claim your area</h3>
        <p className="text-slate-500">Join 50+ UK plumbers already using PlumbBot AI.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
          <input name="name" required type="text" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900" placeholder="John Smith" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name *</label>
          <input name="company" required type="text" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900" placeholder="Smith Plumbing Ltd" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number *</label>
          <input name="phone" required type="tel" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900" placeholder="07700 900000" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</label>
          <input name="email" required type="email" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900" placeholder="john@example.com" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Area Covered (e.g. Postcodes or County) *</label>
          <input name="area" required type="text" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900" placeholder="e.g. Kent, ME1-ME20" />
        </div>
      </div>
      
      <div className="mb-8">
        <label className="block text-sm font-semibold text-slate-700 mb-2">What are you most interested in? *</label>
        <div className="relative">
          <select name="interest" required className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none text-slate-900 font-medium">
            <option value="">Select an option...</option>
            <option value="chatbot">Website Chatbot (Available Now)</option>
            <option value="voice">Voice Agent / Missed Calls (Beta)</option>
            <option value="voice_agent">Voice Agent</option>
            <option value="both">Both</option>
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={status === 'submitting'}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-lg py-4 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {status === 'submitting' ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Registering...
          </>
        ) : (
          <>
            Get Early Access <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
      <p className="text-center text-sm text-slate-500 mt-5 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4" /> No commitment. GDPR Compliant.
      </p>
    </form>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-200 selection:text-blue-900 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PlumbBot AI" className="h-10 w-auto object-contain" />
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-slate-600">
            <a href="#demo" className="hover:text-blue-600 transition-colors">Live Demo</a>
            <a href="#benefits" className="hover:text-blue-600 transition-colors">Benefits</a>
            <a href="#voice" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
              Voice Agent <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Beta</span>
            </a>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <a href="#early-access" className="inline-flex items-center justify-center px-6 py-2.5 text-[15px] font-bold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              Get Started
            </a>
          </div>

          <button 
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-full"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-100 bg-white overflow-hidden shadow-2xl absolute w-full"
            >
              <div className="px-4 pt-4 pb-8 space-y-2">
                <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3.5 text-base font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors">Live Demo</a>
                <a href="#benefits" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3.5 text-base font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors">Benefits</a>
                <a href="#voice" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3.5 text-base font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between">
                  Voice Agent <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Beta</span>
                </a>
                <div className="pt-4">
                  <a href="#early-access" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-5 py-4 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md">
                    Get Early Access
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center overflow-hidden">
          {/* Premium Background Mesh */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-30 pointer-events-none -z-10" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.15), transparent 60%)' }}></div>
          <div className="absolute top-20 right-0 w-[500px] h-[500px] opacity-20 pointer-events-none -z-10" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.15), transparent 60%)' }}></div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200/60 text-slate-700 text-sm font-semibold mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center overflow-hidden">
                    <img src={`https://picsum.photos/seed/plumber${i}/50/50`} alt="User" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <span className="ml-2">Trusted by 50+ UK Plumbers</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-slate-900 mb-6 max-w-4xl mx-auto leading-[1.05]">
              Stop losing <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">£1,000+ boiler jobs</span> to the plumber who answered first.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
              PlumbBot AI answers your website chats instantly, qualifies leads, and books callbacks 24/7. <strong className="text-slate-900 font-semibold">Voice answering coming soon.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#demo" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-full hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5">
                Try Live Demo
              </a>
              <a href="#early-access" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow">
                Claim Your Area
              </a>
            </div>
            
            <div className="mt-10 flex items-center justify-center gap-6 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> 5-min setup</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> No coding required</span>
            </div>
          </motion.div>
        </section>

        {/* Chatbot Demo Section */}
        <section id="demo" className="py-24 md:py-32 bg-white relative">
          <div className="absolute inset-0 bg-slate-50/50 border-y border-slate-200/60 -skew-y-2 transform origin-top-left -z-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-bold uppercase tracking-wider mb-6">
                  Interactive Demo
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
                  The assistant that never sleeps.
                </h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Try chatting with PlumbBot below. Tell it you have a leak, a broken boiler, or a blocked drain. Watch how it professionally qualifies the job and captures contact details.
                </p>
                
                <div className="space-y-6">
                  {[
                    { title: "Instant Responses", desc: "Replies in under 2 seconds, keeping customers engaged." },
                    { title: "Smart Qualification", desc: "Asks the right questions (postcode, urgency, issue type)." },
                    { title: "Lead Capture", desc: "Collects phone numbers and emails automatically." }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="bg-blue-100 p-2 rounded-xl text-blue-600 flex-shrink-0 mt-1">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{item.title}</h4>
                        <p className="text-slate-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              
              {/* Chatbot UI Container */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="relative max-w-md mx-auto w-full"
              >
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 to-cyan-400/20 rounded-[3rem] blur-2xl"></div>
                <ChatbotWidget />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="py-24 md:py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Built specifically for the trade</h2>
              <p className="text-xl text-slate-600 font-medium">Generic chatbots don&apos;t understand plumbing. PlumbBot does.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Clock, title: "24/7 Lead Capture", desc: "Never miss a late-night emergency call or weekend enquiry. Wake up to qualified jobs." },
                { icon: Zap, title: "Beat the Competition", desc: "Customers usually book the first plumber who replies. PlumbBot replies instantly." },
                { icon: Briefcase, title: "Pre-qualify Jobs", desc: "Know the exact issue, postcode, and urgency before you even pick up the phone." },
                { icon: MessageSquare, title: "Zero Setup Required", desc: "We provide a simple line of code. Paste it on your site and you're live in 5 minutes." },
                { icon: ShieldCheck, title: "Look Professional", desc: "Give your business a modern, responsive edge that builds trust with homeowners." },
                { icon: Activity, title: "Dashboard Analytics", desc: "Track how many leads you're getting, common issues, and conversion rates." }
              ].map((benefit, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200/60 hover:shadow-xl hover:border-blue-200 transition-all group"
                >
                  <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    <benefit.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{benefit.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{benefit.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Voice Agent Section (Vapi Placeholder) */}
        <section id="voice" className="py-24 md:py-32 bg-slate-950 text-white relative overflow-hidden">
          {/* Vapi.ai voice widget placeholder integration area */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-bold uppercase tracking-wider mb-6 border border-blue-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Coming Soon (Beta)
                </div>
                <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tighter leading-tight text-white">
                  An AI receptionist that <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">actually sounds human.</span>
                </h2>
                <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                  Missed calls equal missed money. Our upcoming voice agent answers the phone when you&apos;re under a sink, qualifies the job, and books it straight into your calendar.
                </p>
                <ul className="space-y-4 mb-10">
                  {['Natural UK accents', 'Understands plumbing terminology', 'Handles out-of-hours emergencies', 'Transcribes calls instantly'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-blue-400" /> {item}
                    </li>
                  ))}
                </ul>
                <a href="#early-access" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-slate-900 bg-white rounded-full hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                  Join the Voice Beta
                </a>
              </div>

              {/* Voice UI Simulation */}
              <div className="relative max-w-md mx-auto w-full">
                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
                  
                  {/* Simulated Sound Waves */}
                  <div className="flex items-center gap-1.5 mb-12 h-16">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 bg-blue-500 rounded-full"
                        animate={{ height: ['20%', '100%', '20%'] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </div>

                  {/* Pulsing Mic */}
                  <div className="relative mb-8">
                    <motion.div
                      className="absolute inset-0 bg-blue-500 rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="relative bg-gradient-to-b from-blue-500 to-blue-600 w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 border-4 border-slate-900">
                      <Mic className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">PlumbBot Voice</h3>
                  <p className="text-slate-400 font-medium">&quot;Hi, you&apos;ve reached Smith Plumbing...&quot;</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lead Capture Form Section */}
        <section id="early-access" className="py-24 md:py-32 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-5 gap-16 items-center">
              
              <div className="lg:col-span-2">
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Ready to stop missing leads?</h2>
                <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                  Register your interest today. We are rolling out access to UK plumbers area by area to ensure exclusivity.
                </p>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 mb-8">
                  <div className="flex gap-1 text-yellow-400 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-slate-700 italic mb-4">&quot;Since putting PlumbBot on our site, we&apos;ve booked 4 boiler swaps that came in after 9 PM. It pays for itself.&quot;</p>
                  <p className="font-bold text-slate-900">— Dave T., Kent Plumbing Services</p>
                </div>
              </div>

              <div className="lg:col-span-3 relative">
                <div className="absolute -inset-4 bg-gradient-to-b from-blue-100/50 to-transparent rounded-[3rem] blur-xl opacity-50"></div>
                <LeadForm />
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200/60 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="PlumbBot AI" className="h-8 w-auto object-contain" />
              </div>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                The smart AI assistant built exclusively for UK plumbing and heating engineers. Capture leads, qualify jobs, and grow your business.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#demo" className="hover:text-blue-600 transition-colors">Chatbot Demo</a></li>
                <li><a href="#benefits" className="hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#voice" className="hover:text-blue-600 transition-colors">Voice AI (Beta)</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">GDPR Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-4">
            <p suppressHydrationWarning className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} PlumbBot AI. All rights reserved.
            </p>
            <p className="text-slate-400 text-sm flex items-center gap-1">
              Made with <span className="text-red-500">♥</span> in the UK
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button (Simulated) */}
      <a 
        href="#demo" 
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl shadow-[#25D366]/30 hover:bg-[#20bd5a] hover:scale-110 transition-all z-50 flex items-center justify-center group"
        aria-label="Chat with us on WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
          Questions? Chat with us
        </span>
      </a>
    </div>
  );
}
