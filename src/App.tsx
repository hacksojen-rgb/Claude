import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { getSupabase } from './lib/supabase';
import { StaticInitialContent } from './components/StaticContent';

// Mermaid component for rendering diagrams
const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.removeAttribute('data-processed');
      mermaid.initialize({ 
        startOnLoad: true, 
        theme: 'base', 
        themeVariables: { 
          primaryColor: '#f3f4f6', 
          primaryTextColor: '#1f2937', 
          primaryBorderColor: '#d1d5db', 
          lineColor: '#6b7280' 
        } 
      });
      mermaid.contentLoaded();
    }
  }, [chart]);

  return <div className="mermaid my-6 p-4 bg-white rounded-lg border border-gray-200 overflow-hidden" ref={ref}>{chart}</div>;
};

// Chat Entry data structure for Supabase
interface ChatEntry {
  id: string;
  prompt: string;
  response: string;
  created_at: string;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [responseInput, setResponseInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [supabaseConfigMissing, setSupabaseConfigMissing] = useState(false);

  // Auth listener
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setSupabaseConfigMissing(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabase fetch and Real-time listener
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const fetchChats = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching chats:', error);
      } else {
        setChats(data || []);
      }
    };

    fetchChats();

    // Set up real-time subscription
    const channel = supabase
      .channel('chats-changes')
      .on(
        'postgres_changes',
        { event: '*', table: 'chats', schema: 'public' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setChats((prev) => [...prev, payload.new as ChatEntry]);
          } else if (payload.eventType === 'DELETE') {
            setChats((prev) => prev.filter((chat) => chat.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setChats((prev) => prev.map((chat) => chat.id === payload.new.id ? payload.new as ChatEntry : chat));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogin = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        alert('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Login error:', error);
      alert(`Login failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAddChat = async () => {
    if (!promptInput.trim() || !responseInput.trim()) {
      alert('Please provide both prompt and response.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      alert('Supabase is not configured.');
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('chats')
        .insert([
          { 
            prompt: promptInput, 
            response: responseInput 
          }
        ]);
      
      if (error) throw error;

      setPromptInput('');
      setResponseInput('');
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 500);
    } catch (error: any) {
      console.error('Error adding chat:', error);
      alert(`Error saving: ${error.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!window.confirm('Are you sure you want to delete this chat entry?')) return;
    
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      alert(`Error deleting: ${error.message}`);
    }
  };

  const user = session?.user;
  const isAdmin = user?.email === 'davidwashington7us@gmail.com';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 hidden lg:flex">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-white tracking-tight">Claude Strategy</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Navigation</div>
          <a href="#" className="flex items-center gap-3 px-3 py-2 bg-indigo-600 text-white rounded-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 rounded-md transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Sessions
          </a>
          <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Project info</div>
          <div className="px-3 py-2 text-xs text-slate-400">
            Current: YouTube Strategy
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800 flex items-center gap-3 text-sm">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            {user ? user.email?.[0].toUpperCase() : '?'}
          </div>
          <div className="overflow-hidden">
            <div className="text-white font-medium truncate">{user ? user.email?.split('@')[0] : 'Guest'}</div>
            <div className="text-slate-500 text-xs truncate">{user ? 'Admin' : 'Viewer'}</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-40 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hover:text-indigo-600 cursor-pointer">Application</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-900 font-medium">Strategy Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-2 ${supabaseConfigMissing ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'} px-3 py-1 rounded-full text-xs font-medium`}>
              <span className={`w-2 h-2 ${supabaseConfigMissing ? 'bg-red-500' : 'bg-emerald-500'} rounded-full`}></span>
              {supabaseConfigMissing ? 'Supabase Missing' : 'Supabase Online'}
            </span>
            {user ? (
              <button 
                onClick={handleLogout}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Logout
              </button>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Admin Login
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-12 pb-80">
            {supabaseConfigMissing && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495a1 1 0 011.03 0l7.07 4.083a1 1 0 01.5 1.705L10.03 17.512a1 1 0 01-1.03 0L1.97 12.283a1 1 0 01.5-1.705l7.07-4.083z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-700 font-medium">
                      Supabase Configuration Missing:
                    </p>
                    <p className="text-sm text-amber-600 mt-1">
                      Dynamic content (additional prompts) will not load. Please set <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in your environment variables.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <StaticInitialContent />
            
            {/* Render Dynamic Chats from Supabase */}
            {chats.map((chat) => (
              <React.Fragment key={chat.id}>
                {/* User Prompt */}
                <div className="flex justify-end pl-12">
                  <div className="flex flex-col items-end max-w-3xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-700">Sobuj</span>
                      <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">S</div>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteChat(chat.id)}
                          className="ml-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Delete Chat"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="prompt-bubble p-5 text-base md:text-lg whitespace-pre-wrap tracking-wide">
                      {chat.prompt}
                    </div>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start pr-12">
                  <div className="flex flex-col items-start max-w-4xl w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600 text-xs font-bold border border-slate-200">C</div>
                      <span className="text-sm font-semibold text-slate-700">Claude Sonnet 4.6</span>
                    </div>
                    <div className="response-bubble p-6 md:p-8 w-full block prose prose-indigo max-w-none">
                      {/* Handling Mermaid diagrams specifically */}
                      {chat.response.split('\n').some(line => line.includes('```mermaid')) ? (
                        chat.response.split('```mermaid').map((part, index) => {
                          if (index === 0) return <ReactMarkdown key={index}>{part}</ReactMarkdown>;
                          const [chart, ...rest] = part.split('```');
                          return (
                            <React.Fragment key={index}>
                              <Mermaid chart={chart} />
                              <ReactMarkdown>{rest.join('```')}</ReactMarkdown>
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <ReactMarkdown>{chat.response}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Admin Dashboard */}
        {isAdmin && (
          <div className="bg-white border-t border-slate-200 shadow-2xl z-50">
            <div className="max-w-5xl mx-auto p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                  নতুন কনভারসেশন যোগ করুন (Admin)
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">আপনার প্রম্পট (Sobuj)</label>
                  <textarea 
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none text-sm resize-none transition-all shadow-inner" 
                    placeholder="ক্লডকে যেই প্রম্পট দিয়েছেন তা এখানে পেস্ট করুন..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ক্লডের রেসপন্স (Claude Sonnet 4.6)</label>
                  <textarea 
                    value={responseInput}
                    onChange={(e) => setResponseInput(e.target.value)}
                    className="w-full h-32 p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none text-sm resize-none font-mono transition-all shadow-inner" 
                    placeholder="ক্লড যেই রেসপন্স দিয়েছে (Markdown সাপোর্টেড) তা এখানে পেস্ট করুন..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleAddChat}
                  disabled={isAdding}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-8 rounded-lg transition duration-200 shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isAdding ? (
                    'যোগ করা হচ্ছে...'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      পেইজে যোগ করুন
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
