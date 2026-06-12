import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { 
  Home, 
  MessageSquare, 
  BookOpen, 
  Calendar, 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle,
  ChevronRight,
  BrainCircuit,
  GraduationCap,
  Send,
  Loader2,
  Mic,
  Camera,
  Award,
  Star,
  X,
  Users,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getStudyAnswer, generateQuiz, generateStudyDiagram } from './services/geminiService';
import type { Note, ScheduleItem, Progress, ChatMessage, Subject, User as UserType, Group, GroupMessage, GroupNote } from './types';

const SUBJECTS: Subject[] = ['Mathematics', 'Science', 'Biology', 'Physics', 'Chemistry', 'English'];

const KEYS = {
  USER: 'studybuddy_user',
  NOTES: 'studybuddy_notes',
  SCHEDULE: 'studybuddy_schedule',
  PROGRESS: 'studybuddy_progress',
  GROUPS: 'studybuddy_groups',
  GROUP_MESSAGES: 'studybuddy_group_messages',
  GROUP_NOTES: 'studybuddy_group_notes',
  CHAT_HISTORY: 'studybuddy_chat_history',
};

const DEFAULT_USER: UserType = {
  id: 1,
  name: 'Rohit Yadav',
  points: 120,
  level: 2,
  badges: [{ id: 1, badge_name: 'Quick Start', icon: '🚀', date_earned: new Date().toLocaleDateString() }]
};

const DEFAULT_NOTES: Note[] = [
  { id: 1, title: 'Derivative Basics', content: 'd/dx(sin x) = cos x\nd/dx(cos x) = -sin x', subject: 'Mathematics', updated_at: new Date().toISOString() },
  { id: 2, title: "Newton's Laws", content: 'F = ma. Action & Reaction are equal and opposite.', subject: 'Physics', updated_at: new Date().toISOString() }
];

const DEFAULT_SCHEDULE: ScheduleItem[] = [
  { id: 1, task: 'Math Review', time: '14:00', day: 'Monday', completed: false },
  { id: 2, task: 'Chemistry Revision', time: '10:00', day: 'Wednesday', completed: true }
];

const DEFAULT_PROGRESS: Progress[] = [
  { id: 1, subject: 'Mathematics', score: 4, total: 5, date: new Date().toISOString() }
];

const DEFAULT_GROUPS: Group[] = [
  { id: 1, name: 'Science Squad', description: 'Collaborative biology & chemistry studies', created_by: 2, created_at: new Date().toISOString(), member_count: 3 },
  { id: 2, name: 'Calc Warriors', description: 'Solving calculus step-by-step', created_by: 3, created_at: new Date().toISOString(), member_count: 2 }
];

const PEER_PRESENCE = [
  { id: 101, name: 'Alice Johnson', subject: 'Biology', online: true, waveResponse: "Hey Rohit! Let's conquer Biology today! 🔬" },
  { id: 102, name: 'Bob Smith', subject: 'Mathematics', online: true, waveResponse: "Nice to see you! Check out my new math note! ✏️" },
  { id: 103, name: 'Sarah Connor', subject: 'Physics', online: false, waveResponse: "Just reading about Einstein! See you in group class later!" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); 
  const [notebookTab, setNotebookTab] = useState<'notes' | 'planner'>('notes');
  const [waveToast, setWaveToast] = useState<{ name: string; response: string; points: number } | null>(null);

  // Core local states
  const [user, setUser] = useState<UserType>(() => {
    const stored = localStorage.getItem(KEYS.USER);
    return stored ? JSON.parse(stored) : DEFAULT_USER;
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    const stored = localStorage.getItem(KEYS.NOTES);
    return stored ? JSON.parse(stored) : DEFAULT_NOTES;
  });
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const stored = localStorage.getItem(KEYS.SCHEDULE);
    return stored ? JSON.parse(stored) : DEFAULT_SCHEDULE;
  });
  const [progress, setProgress] = useState<Progress[]>(() => {
    const stored = localStorage.getItem(KEYS.PROGRESS);
    return stored ? JSON.parse(stored) : DEFAULT_PROGRESS;
  });
  const [groups, setGroups] = useState<Group[]>(() => {
    const stored = localStorage.getItem(KEYS.GROUPS);
    return stored ? JSON.parse(stored) : DEFAULT_GROUPS;
  });

  // Chat & interactive history states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const stored = localStorage.getItem(KEYS.CHAT_HISTORY);
    return stored ? JSON.parse(stored) : [];
  });
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group views helper states
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groupTab, setGroupTab] = useState<'chat' | 'notes'>('chat');
  const [groupChatInput, setGroupChatInput] = useState('');
  const [groupMessages, setGroupMessages] = useState<Record<number, GroupMessage[]>>(() => {
    const stored = localStorage.getItem(KEYS.GROUP_MESSAGES);
    return stored ? JSON.parse(stored) : {
      1: [{ id: 1, group_id: 1, user_id: 2, user_name: 'Alice Johnson', text: 'Hey guys! Anyone ready to review Bio Chapter 5?', created_at: new Date().toISOString() }],
      2: [{ id: 1, group_id: 2, user_id: 3, user_name: 'Bob Smith', text: 'Integral calculus questions are tricky!', created_at: new Date().toISOString() }]
    };
  });
  const [groupNotes, setGroupNotes] = useState<Record<number, GroupNote[]>>(() => {
    const stored = localStorage.getItem(KEYS.GROUP_NOTES);
    return stored ? JSON.parse(stored) : {
      1: [{ id: 1, group_id: 1, title: 'Mitosis Recap', content: 'Prophase, Metaphase, Anaphase, Telophase. Easy to remember with PMAT!', updated_by: 2, updated_by_name: 'Alice Johnson', updated_at: new Date().toISOString() }]
    };
  });

  // Modal helpers
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', subject: 'Mathematics' as Subject });
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ task: '', time: '', day: 'Monday' });
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [isAddingGroupNote, setIsAddingGroupNote] = useState(false);
  const [newGroupNote, setNewGroupNote] = useState({ title: '', content: '' });

  // Quiz helper states
  const [quizSubject, setQuizSubject] = useState<Subject | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  // Persists states in localStorage
  useEffect(() => { localStorage.setItem(KEYS.USER, JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem(KEYS.NOTES, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule)); }, [schedule]);
  useEffect(() => { localStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress)); }, [progress]);
  useEffect(() => { localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups)); }, [groups]);
  useEffect(() => { localStorage.setItem(KEYS.CHAT_HISTORY, JSON.stringify(chatMessages)); }, [chatMessages]);
  useEffect(() => { localStorage.setItem(KEYS.GROUP_MESSAGES, JSON.stringify(groupMessages)); }, [groupMessages]);
  useEffect(() => { localStorage.setItem(KEYS.GROUP_NOTES, JSON.stringify(groupNotes)); }, [groupNotes]);

  // Points & Badge System
  const awardPoints = (amount: number, checkBadgeType?: string) => {
    setUser(prev => {
      const newPoints = prev.points + amount;
      const newLevel = Math.floor(newPoints / 100) + 1;
      const updatedBadges = [...prev.badges];

      if (checkBadgeType === 'quiz' && !updatedBadges.some(b => b.badge_name === 'Quiz Master')) {
        updatedBadges.push({ id: Date.now(), badge_name: 'Quiz Master', icon: '🏆', date_earned: new Date().toLocaleDateString() });
      }
      if (checkBadgeType === 'note' && !updatedBadges.some(b => b.badge_name === 'Note Taker')) {
        updatedBadges.push({ id: Date.now() + 1, badge_name: 'Note Taker', icon: '📝', date_earned: new Date().toLocaleDateString() });
      }

      return { ...prev, points: newPoints, level: newLevel, badges: updatedBadges };
    });
  };

  // Interactive Buddy Waving System (Bringing People Up)
  const handleWaveToPeer = (peer: typeof PEER_PRESENCE[0]) => {
    setWaveToast({ name: peer.name, response: peer.waveResponse, points: 5 });
    awardPoints(5);
    setTimeout(() => {
      setWaveToast(null);
    }, 4500);
  };

  // AI Assistant trigger
  const handleSendMessage = async () => {
    if (!chatInput.trim() && !selectedImage) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput, image: selectedImage || undefined };
    setChatMessages(prev => [...prev, userMsg]);
    
    const inputCopy = chatInput;
    const imageCopy = selectedImage;
    setChatInput('');
    setSelectedImage(null);
    setIsChatLoading(true);

    try {
      const answer = await getStudyAnswer(inputCopy || "Discuss this homework task", imageCopy || undefined);
      let aiImage: string | undefined = undefined;

      if (inputCopy.toLowerCase().includes('diagram') || inputCopy.toLowerCase().includes('visualize')) {
        const diagram = await generateStudyDiagram(inputCopy);
        if (diagram) aiImage = diagram;
      }

      setChatMessages(prev => [...prev, { role: 'model', text: answer, image: aiImage }]);
      awardPoints(10);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Voice handler
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setChatInput(prev => prev + ' ' + text);
    };
    recognition.start();
  };

  // Image Helper
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Action methods
  const handleAddNote = () => {
    if (!newNote.title.trim()) return;
    const noteItem: Note = { id: Date.now(), title: newNote.title, content: newNote.content, subject: newNote.subject, updated_at: new Date().toISOString() };
    setNotes(prev => [noteItem, ...prev]);
    setIsAddingNote(false);
    setNewNote({ title: '', content: '', subject: 'Mathematics' });
    awardPoints(15, 'note');
  };

  const handleDeleteNote = (id: number) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleToggleSchedule = (item: ScheduleItem) => {
    setSchedule(prev => prev.map(s => {
      if (s.id === item.id) {
        if (!s.completed) awardPoints(10);
        return { ...s, completed: !s.completed };
      }
      return s;
    }));
  };

  const handleAddSchedule = () => {
    if (!newSchedule.task.trim()) return;
    const item: ScheduleItem = { id: Date.now(), task: newSchedule.task, time: newSchedule.time || '12:00', day: newSchedule.day, completed: false };
    setSchedule(prev => [...prev, item]);
    setIsAddingSchedule(false);
    setNewSchedule({ task: '', time: '', day: 'Monday' });
    awardPoints(5);
  };

  const handleDeleteSchedule = (id: number) => {
    setSchedule(prev => prev.filter(s => s.id !== id));
  };

  // Quiz launcher
  const startQuiz = async (subject: Subject) => {
    setQuizSubject(subject);
    setIsQuizLoading(true);
    setQuizQuestions([]);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizFinished(false);

    try {
      const res = await generateQuiz(subject);
      setQuizQuestions(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleQuizAnswer = (selectedIdx: number) => {
    const isCorrect = selectedIdx === quizQuestions[currentQuizIndex].answer;
    const gain = isCorrect ? 1 : 0;
    const nextScore = quizScore + gain;

    if (currentQuizIndex + 1 < quizQuestions.length) {
      setQuizScore(nextScore);
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setQuizScore(nextScore);
      setQuizFinished(true);
      const quizRes: Progress = { id: Date.now(), subject: quizSubject!, score: nextScore, total: quizQuestions.length, date: new Date().toISOString() };
      setProgress(prev => [quizRes, ...prev]);
      awardPoints(nextScore * 10, 'quiz');
    }
  };

  // Group controls
  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) return;
    const grp: Group = { id: Date.now(), name: newGroup.name, description: newGroup.description, created_by: user.id, created_at: new Date().toISOString(), member_count: 1 };
    setGroups(prev => [grp, ...prev]);
    setGroupMessages(prev => ({ ...prev, [grp.id]: [] }));
    setGroupNotes(prev => ({ ...prev, [grp.id]: [] }));
    setIsAddingGroup(false);
    setNewGroup({ name: '', description: '' });
    awardPoints(10);
  };

  const handleSendGroupMessage = () => {
    if (!groupChatInput.trim() || !activeGroup) return;
    const msg: GroupMessage = { id: Date.now(), group_id: activeGroup.id, user_id: user.id, user_name: user.name, text: groupChatInput, created_at: new Date().toISOString() };
    const gid = activeGroup.id;
    setGroupMessages(prev => ({ ...prev, [gid]: [...(prev[gid] || []), msg] }));
    setGroupChatInput('');

    // Peer message triggers auto response
    setTimeout(() => {
      const replies = ["Fabulous study tip! Let's conquer this calculation.", "Totally agree with those points!", "Oh perfect, adding that to my review list."];
      const botResponse: GroupMessage = {
        id: Date.now() + 1,
        group_id: gid,
        user_id: 101, // Alice
        user_name: 'Alice Johnson',
        text: replies[Math.floor(Math.random() * replies.length)],
        created_at: new Date().toISOString()
      };
      setGroupMessages(prev => ({ ...prev, [gid]: [...(prev[gid] || []), botResponse] }));
    }, 1200);
  };

  const handleCreateGroupNote = () => {
    if (!newGroupNote.title.trim() || !activeGroup) return;
    const nNote: GroupNote = { id: Date.now(), group_id: activeGroup.id, title: newGroupNote.title, content: newGroupNote.content, updated_by: user.id, updated_by_name: user.name, updated_at: new Date().toISOString() };
    const gid = activeGroup.id;
    setGroupNotes(prev => ({ ...prev, [gid]: [nNote, ...(prev[gid] || [])] }));
    setIsAddingGroupNote(false);
    setNewGroupNote({ title: '', content: '' });
    awardPoints(10);
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-900 font-sans text-slate-800 flex justify-center items-center overflow-hidden py-0 md:py-6 relative" id="applet_canvas">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none z-0" />

      {/* Main Apple Container (Absolutely locked viewport) */}
      <div className="w-full max-w-md h-screen md:h-[90vh] bg-slate-50 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative z-10 border border-slate-800/25">
        
        {/* Wave Animation Interactive Toast Message */}
        <AnimatePresence>
          {waveToast && (
            <motion.div 
              initial={{ y: -60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -60, opacity: 0, scale: 0.95 }}
              className="absolute top-3 left-3 right-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl p-4 shadow-xl z-50 flex items-start space-x-3 border border-indigo-400"
              id="wave_toast"
            >
              <div className="text-2xl pt-1">👋</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-200">Wave Received!</p>
                <p className="text-sm font-semibold">{waveToast.name} waved back!</p>
                <p className="text-xs text-indigo-100 italic mt-0.5">"{waveToast.response}"</p>
              </div>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 text-white">+{waveToast.points} XP</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Nav View Render */}
        <main className="flex-1 w-full overflow-hidden flex flex-col relative" id="main_pane">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex-1 w-full flex flex-col overflow-hidden"
              id={`tab_${activeTab}`}
            >
              
              {/* HOME SCREEN */}
              {activeTab === 'home' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
                  
                  {/* Dashboard Welcome Header */}
                  <header className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100/40">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Dashboard</p>
                      <h1 className="text-xl font-bold text-slate-900">Hello, {user.name}!</h1>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 bg-indigo-100 rounded-full">LVL {user.level}</span>
                        <div className="flex-1 h-2 bg-indigo-100/60 rounded-full overflow-hidden max-w-[120px]">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${user.points % 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{user.points % 100}/100 pts</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                      <span className="text-lg font-bold text-white">RY</span>
                    </div>
                  </header>

                  {/* Active Buddies Online Row (Bring People Up!) */}
                  <section className="space-y-3" id="social_feed">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center">
                        <Users className="w-4 h-4 text-indigo-500 mr-1.5" />
                        Online Study Buddies
                      </h2>
                      <span className="text-[10px] font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-full uppercase tracking-wider">Social Feed</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {PEER_PRESENCE.map(peer => (
                        <div key={peer.id} className="bg-white p-3.5 rounded-2xl border border-slate-100/80 flex justify-between items-center shadow-sm">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="relative">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-indigo-600 text-sm border border-indigo-50">
                                {peer.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${peer.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-slate-800 leading-none mb-1">{peer.name}</h3>
                              <p className="text-[11px] text-slate-400 font-medium truncate">Studying {peer.subject}</p>
                            </div>
                          </div>
                          {peer.online ? (
                            <button 
                              onClick={() => handleWaveToPeer(peer)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 transition-all text-indigo-600 font-bold rounded-xl text-xs flex items-center space-x-1 border border-indigo-100"
                              id={`wave_btn_${peer.id}`}
                            >
                              <span className="animate-bounce">👋</span>
                              <span>Wave</span>
                            </button>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-400 font-medium px-2 py-1 rounded-lg">Offline</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Highlights and Quick Links Grid */}
                  <section className="grid grid-cols-2 gap-3 pb-2" id="quick_panel">
                    <button 
                      onClick={() => setActiveTab('chat')}
                      className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl text-left shadow-lg shadow-indigo-100/50 hover:shadow-indigo-200 transition-all active:scale-95 flex flex-col justify-between h-28"
                    >
                      <BrainCircuit className="w-6 h-6 opacity-90 stroke-[2]" />
                      <div>
                        <h3 className="font-bold text-sm">AI Tutor</h3>
                        <p className="text-[10px] text-indigo-100 font-medium mt-0.5">Instant Homework Helper</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => setActiveTab('quiz')}
                      className="p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-3xl text-left shadow-lg shadow-emerald-100/50 hover:shadow-emerald-200 transition-all active:scale-95 flex flex-col justify-between h-28"
                    >
                      <GraduationCap className="w-6 h-6 opacity-90 stroke-[2]" />
                      <div>
                        <h3 className="font-bold text-sm">Practice Quiz</h3>
                        <p className="text-[10px] text-emerald-500/10 font-medium mt-0.5">Gemini Subject Quizzes</p>
                      </div>
                    </button>
                  </section>

                  {/* Badges and Progress Statistics from Profile */}
                  <section className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center">
                      <Award className="w-4 h-4 text-indigo-500 mr-2" />
                      Academic Badges
                    </h2>
                    <div className="grid grid-cols-4 gap-2">
                      {user.badges.map((b) => (
                        <div key={b.id} className="flex flex-col items-center text-center p-2 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <span className="text-2xl">{b.icon}</span>
                          <span className="text-[9px] text-slate-600 font-bold mt-1 line-clamp-1">{b.badge_name}</span>
                        </div>
                      ))}
                      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-300">
                        <span className="text-xs font-bold leading-none">+ More</span>
                      </div>
                    </div>
                  </section>

                  {/* Subject Mastery Performance */}
                  <section className="space-y-3 pb-8">
                    <h2 className="text-sm font-bold text-slate-800">Learning Progress</h2>
                    <div className="space-y-2">
                      {progress.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100/60 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{item.subject}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Checked: {new Date(item.date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{item.score}/{item.total} Correct</span>
                          </div>
                        </div>
                      ))}
                      {progress.length === 0 && (
                        <p className="text-center text-xs text-slate-400 py-3 italic">Quizzes track subject metrics here.</p>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* AI CHAT SCREEN (STUCK VIEWPORT CONSTRAINED) */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  
                  {/* Chat header */}
                  <header className="p-4 border-b border-slate-100 shrink-0 flex items-center bg-white justify-between">
                    <div className="flex items-center space-x-2">
                      <BrainCircuit className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h2 className="font-bold text-slate-800 text-sm">AI Study Helper</h2>
                        <span className="text-[10px] text-emerald-500 font-semibold animate-pulse flex items-center">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1" /> Gemini 3.5 Flash Connected
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setChatMessages([])} className="text-slate-400 hover:text-red-500 text-xs font-bold px-2 py-1 bg-slate-50 rounded-lg">Clear Chats</button>
                  </header>

                  {/* Chat messages queue */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50" id="chat_scroll">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-10 max-w-[240px] mx-auto">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BrainCircuit className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">Ask Gemini Assistant</h3>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">Solve Homework, explain science, draft diagrams inside direct threads!</p>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} id={`chat_item_${i}`}>
                        <div className={`max-w-[85%] rounded-3xl p-3.5 shadow-sm text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                          {msg.image && (
                            <img src={msg.image} alt="Uploaded problem" className="w-full rounded-2xl mb-2 max-h-40 object-cover" />
                          )}
                          <p className="whitespace-pre-line leading-relaxed text-xs md:text-sm">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-100 px-4 py-2.5 rounded-3xl rounded-tl-none flex items-center space-x-2 shadow-sm text-xs text-slate-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span className="font-medium animate-pulse">Gemini is solving...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Absolute pinned and locked bottom entry area */}
                  <div className="p-3 border-t border-slate-100 bg-white shrink-0 space-y-2">
                    {selectedImage && (
                      <div className="relative inline-block" id="image_preview">
                        <img src={selectedImage} alt="Problem sketch" className="w-16 h-16 rounded-xl object-cover border border-indigo-500" />
                        <button onClick={() => setSelectedImage(null)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-3 py-1 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 relative overflow-hidden">
                        {isListening && (
                          <div className="absolute inset-0 bg-red-50 flex items-center px-3 space-x-2 z-10">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            <span className="text-xs font-bold text-red-600 animate-pulse">Listening...</span>
                          </div>
                        )}
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask a question or request a diagram..."
                          className="flex-1 p-2 bg-transparent focus:outline-none text-xs text-slate-800"
                        />
                        <button onClick={handleVoiceInput} className="text-slate-400 hover:text-red-500 p-1">
                          <Mic className="w-4 h-4" />
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-indigo-600 p-1">
                          <Camera className="w-4 h-4" />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                      </div>
                      <button 
                        onClick={handleSendMessage}
                        disabled={isChatLoading}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl disabled:opacity-50 transition active:scale-95"
                        id="send_btn"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* GROUPS SCREEN & TEAMS */}
              {activeTab === 'groups' && (
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  {!activeGroup ? (
                    <div className="flex-1 flex flex-col overflow-hidden p-5">
                      <header className="flex justify-between items-center shrink-0 mb-4">
                        <div>
                          <h2 className="text-lg font-bold text-slate-800">Study Groups</h2>
                          <p className="text-xs text-slate-400">Classrooms & team shared chats</p>
                        </div>
                        <button onClick={() => setIsAddingGroup(true)} className="p-2 bg-indigo-600 text-white rounded-full shadow-md">
                          <Plus className="w-5 h-5" />
                        </button>
                      </header>

                      {/* Scrollable list of cooperative study groups */}
                      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-hide">
                        {groups.map(group => (
                          <div key={group.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-stretch justify-between">
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="font-bold text-slate-800 text-sm leading-tight">{group.name}</h3>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2 pr-4">{group.description}</p>
                              </div>
                              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 self-start px-2 py-0.5 rounded-lg mt-3">
                                {group.member_count || 1} members active
                              </span>
                            </div>
                            <button 
                              onClick={() => setActiveGroup(group)}
                              className="px-4 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 transition active:scale-95 self-end py-2"
                            >
                              Enter
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden h-full">
                      
                      {/* Active group inside header */}
                      <header className="p-4 border-b border-slate-100 flex items-center bg-white space-x-3 shrink-0">
                        <button onClick={() => setActiveGroup(null)} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600">
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 text-sm leading-none truncate">{activeGroup.name}</h3>
                          <div className="flex space-x-4 mt-2">
                            <button onClick={() => setGroupTab('chat')} className={`text-xs font-bold leading-none pb-1 ${groupTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Chat</button>
                            <button onClick={() => setGroupTab('notes')} className={`text-xs font-bold leading-none pb-1 ${groupTab === 'notes' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Shared Notes</button>
                          </div>
                        </div>
                      </header>

                      {/* Inner Group View Tabs */}
                      <div className="flex-1 overflow-y-auto p-4 bg-slate-50" id="group_tab_pane">
                        {groupTab === 'chat' ? (
                          <div className="space-y-3.5">
                            {(groupMessages[activeGroup.id] || []).map((msg, idx) => (
                              <div key={idx} className={`flex ${msg.user_id === user.id ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[85%]">
                                  <p className="text-[10px] text-slate-400 font-semibold mb-1 px-1">{msg.user_name}</p>
                                  <div className={`p-3 rounded-2xl ${msg.user_id === user.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm'}`}>
                                    <p className="text-xs leading-relaxed">{msg.text}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Class Lecture Library</h4>
                              <button onClick={() => setIsAddingGroupNote(true)} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-[10px] font-bold flex items-center">
                                <Plus className="w-3 h-3 mr-1" /> New Note
                              </button>
                            </div>
                            {(groupNotes[activeGroup.id] || []).map(note => (
                              <div key={note.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative">
                                <h4 className="font-bold text-slate-800 text-xs mb-1">{note.title}</h4>
                                <p className="text-xs text-slate-500 whitespace-pre-wrap">{note.content}</p>
                                <div className="flex justify-between items-center border-t border-slate-50 pt-2.5 mt-3 text-[9px] text-slate-400">
                                  <span>Contributor: {note.updated_by_name}</span>
                                  <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Group Bottom Chat Controls */}
                      {groupTab === 'chat' && (
                        <div className="p-3 border-t border-slate-100 bg-white flex items-center space-x-2 shrink-0">
                          <input 
                            type="text" 
                            value={groupChatInput}
                            onChange={(e) => setGroupChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendGroupMessage()}
                            placeholder="Message study mates..."
                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 outline-none"
                          />
                          <button onClick={handleSendGroupMessage} className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow active:scale-95">
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CONSOLIDATED STUDY NOTEBOOK TAB (NOTES & PLANNER TOGETHER IN ITS PLACE) */}
              {activeTab === 'notebook' && (
                <div className="flex-1 flex flex-col overflow-hidden p-5">
                  <header className="flex justify-between items-center shrink-0 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Study Notebook</h2>
                      <p className="text-xs text-slate-400">Class notes & study agenda</p>
                    </div>
                    {notebookTab === 'notes' ? (
                      <button onClick={() => setIsAddingNote(true)} className="p-2 bg-indigo-600 text-white rounded-full shadow">
                        <Plus className="w-5 h-5" />
                      </button>
                    ) : (
                      <button onClick={() => setIsAddingSchedule(true)} className="p-2 bg-indigo-600 text-white rounded-full shadow">
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                  </header>

                  {/* Sub-tab Switcher Header Controls */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl mb-4 shrink-0">
                    <button 
                      onClick={() => setNotebookTab('notes')} 
                      className={`py-2 text-xs font-bold rounded-xl transition ${notebookTab === 'notes' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Sticky Notes
                    </button>
                    <button 
                      onClick={() => setNotebookTab('planner')} 
                      className={`py-2 text-xs font-bold rounded-xl transition ${notebookTab === 'planner' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Dailies & Planner
                    </button>
                  </div>

                  {/* Scrollable workspace core */}
                  <div className="flex-1 overflow-y-auto scrollbar-hide pr-1" id="notebook_content">
                    {notebookTab === 'notes' ? (
                      <div className="space-y-3">
                        {notes.map(note => (
                          <div key={note.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative group">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">{note.subject}</span>
                              <button onClick={() => handleDeleteNote(note.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mt-2">{note.title}</h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-4 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          </div>
                        ))}
                        {notes.length === 0 && <p className="text-center text-xs text-slate-400 py-10 italic">Create some study cards!</p>}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {schedule.map(item => (
                          <div key={item.id} className="p-3.5 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center space-x-3.5">
                              <button onClick={() => handleToggleSchedule(item)}>
                                {item.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
                              </button>
                              <div>
                                <p className={`text-xs font-bold ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.task}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">{item.day} • {item.time}</p>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteSchedule(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                        {schedule.length === 0 && <p className="text-center text-xs text-slate-400 py-10 italic">Schedule assignments today.</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PRACTICE & SUBJECT QUIZZES */}
              {activeTab === 'quiz' && (
                <div className="flex-1 flex flex-col overflow-hidden p-5">
                  <header className="mb-4 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">Practice Academy</h2>
                    <p className="text-xs text-slate-400">Generate tests on subjects dynamically via Gemini</p>
                  </header>

                  <div className="flex-1 overflow-y-auto scrollbar-hide" id="quiz_feed">
                    {!quizSubject ? (
                      <div className="grid grid-cols-2 gap-3.5 pb-2">
                        {SUBJECTS.map(sub => (
                          <button
                            key={sub}
                            onClick={() => startQuiz(sub)}
                            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow transition duration-150 text-left flex flex-col justify-between h-32 active:scale-95"
                          >
                            <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider bg-indigo-50 self-start px-2 py-0.5 rounded-lg">{sub}</span>
                            <span className="font-bold text-slate-800 text-sm leading-tight mt-3">Start Gemini Test</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        {isQuizLoading ? (
                          <div className="py-12 text-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                            <p className="text-xs text-slate-500">Formulating your {quizSubject} challenge...</p>
                          </div>
                        ) : quizFinished ? (
                          <div className="text-center py-6 space-y-5">
                            <span className="text-4xl">🎓</span>
                            <div>
                              <h3 className="text-base font-bold text-slate-800">Test Completed!</h3>
                              <p className="text-xs text-slate-500 mt-1">Great job! You scored {quizScore} / {quizQuestions.length}</p>
                              <p className="text-indigo-600 font-bold text-xs mt-2">+{quizScore * 10} XP Reward Added!</p>
                            </div>
                            <button onClick={() => setQuizSubject(null)} className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold">Back to Topics</button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
                              <span>{quizSubject} Practice</span>
                              <span>{currentQuizIndex + 1} / {quizQuestions.length}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm">{quizQuestions[currentQuizIndex]?.question}</h3>
                            <div className="space-y-2.5 pt-2">
                              {quizQuestions[currentQuizIndex]?.options.map((option: string, opIdx: number) => (
                                <button
                                  key={opIdx}
                                  onClick={() => handleQuizAnswer(opIdx)}
                                  className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20 text-slate-700 text-xs font-bold text-left transition"
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

        {/* Dynamic Mobile Standard App Bottom Tab Bar (ALIGNED PINNED NO CLIP) */}
        <nav className="bg-white border-t border-slate-150 py-3.5 px-4 shrink-0 flex justify-around items-center z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]" id="tab_bar">
          <button 
            onClick={() => { setActiveTab('home'); setActiveGroup(null); }}
            className={`p-2 rounded-2xl transition ${activeTab === 'home' ? 'text-indigo-600 bg-indigo-50/70 font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Dashboard"
            id="tab_btn_home"
          >
            <Home className="w-5.5 h-5.5" />
          </button>
          
          <button 
            onClick={() => { setActiveTab('chat'); setActiveGroup(null); }}
            className={`p-2 rounded-2xl transition ${activeTab === 'chat' ? 'text-indigo-600 bg-indigo-50/70 font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
            title="AI Helper"
            id="tab_btn_chat"
          >
            <MessageSquare className="w-5.5 h-5.5" />
          </button>

          <button 
            onClick={() => { setActiveTab('groups'); setActiveGroup(null); }}
            className={`p-2 rounded-2xl transition ${activeTab === 'groups' ? 'text-indigo-600 bg-indigo-50/70 font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Classrooms"
            id="tab_btn_groups"
          >
            <Users className="w-5.5 h-5.5" />
          </button>

          <button 
            onClick={() => { setActiveTab('notebook'); setActiveGroup(null); }}
            className={`p-2 rounded-2xl transition ${activeTab === 'notebook' ? 'text-indigo-600 bg-indigo-50/70 font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Notes"
            id="tab_btn_notebook"
          >
            <BookOpen className="w-5.5 h-5.5" />
          </button>

          <button 
            onClick={() => { setActiveTab('quiz'); setActiveGroup(null); }}
            className={`p-2 rounded-2xl transition ${activeTab === 'quiz' ? 'text-indigo-600 bg-indigo-50/70 font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
            title="Lessons"
            id="tab_btn_quiz"
          >
            <GraduationCap className="w-5.5 h-5.5" />
          </button>
        </nav>

        {/* MODAL SYSTEM (LIGHTWEIGHT CONTEXT DIALOG BACKDROPS) */}
        <AnimatePresence>
          {isAddingNote && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center" id="new_note_modal">
              <motion.div initial={{ y: "15%" }} animate={{ y: 0 }} exit={{ y: "15%" }} className="bg-white w-full rounded-t-3xl p-5 space-y-4 shadow-xl border-t border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-800 text-sm">Add Sticky Note</h3>
                  <button onClick={() => setIsAddingNote(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Cancel</button>
                </div>
                <input type="text" placeholder="Note Title" value={newNote.title} onChange={(e) => setNewNote({...newNote, title: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold outline-none" />
                <select value={newNote.subject} onChange={(e) => setNewNote({...newNote, subject: e.target.value as Subject})} className="w-full p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold outline-none text-slate-700">
                  {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
                <textarea placeholder="Write subject content here..." value={newNote.content} onChange={(e) => setNewNote({...newNote, content: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs h-28 resize-none outline-none text-slate-700" />
                <button onClick={handleAddNote} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold active:scale-95 transition">Save Note</button>
              </motion.div>
            </motion.div>
          )}

          {isAddingSchedule && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center" id="new_planner_modal">
              <motion.div initial={{ y: "15%" }} animate={{ y: 0 }} exit={{ y: "15%" }} className="bg-white w-full rounded-t-3xl p-5 space-y-4 shadow-xl border-t border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-800 text-sm">Add Assignment Task</h3>
                  <button onClick={() => setIsAddingSchedule(false)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold">Cancel</button>
                </div>
                <input type="text" placeholder="Task description..." value={newSchedule.task} onChange={(e) => setNewSchedule({...newSchedule, task: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="time" value={newSchedule.time} onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})} className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold outline-none" />
                  <select value={newSchedule.day} onChange={(e) => setNewSchedule({...newSchedule, day: e.target.value})} className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold outline-none text-slate-700">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <button onClick={handleAddSchedule} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold active:scale-95 transition">Add Session</button>
              </motion.div>
            </motion.div>
          )}

          {isAddingGroup && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center" id="new_group_modal">
              <motion.div initial={{ y: "15%" }} animate={{ y: 0 }} exit={{ y: "15%" }} className="bg-white w-full rounded-t-3xl p-5 space-y-4 shadow-xl border-t border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-800 text-sm">Create New Classroom</h3>
                  <button onClick={() => setIsAddingGroup(false)} className="text-slate-400 text-xs font-semibold">Cancel</button>
                </div>
                <input type="text" placeholder="Classroom Title" value={newGroup.name} onChange={(e) => setNewGroup({...newGroup, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold outline-none" />
                <textarea placeholder="Classroom description..." value={newGroup.description} onChange={(e) => setNewGroup({...newGroup, description: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs h-20 resize-none outline-none text-slate-700" />
                <button onClick={handleCreateGroup} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold active:scale-95 transition">Create Team</button>
              </motion.div>
            </motion.div>
          )}

          {isAddingGroupNote && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center" id="new_team_note_modal">
              <motion.div initial={{ y: "15%" }} animate={{ y: 0 }} exit={{ y: "15%" }} className="bg-white w-full rounded-t-3xl p-5 space-y-4 shadow-xl border-t border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-800 text-sm">Share Lecture Note</h3>
                  <button onClick={() => setIsAddingGroupNote(false)} className="text-slate-400 text-xs font-semibold">Cancel</button>
                </div>
                <input type="text" placeholder="Topic Title" value={newGroupNote.title} onChange={(e) => setNewGroupNote({...newGroupNote, title: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold outline-none" />
                <textarea placeholder="Write note content..." value={newGroupNote.content} onChange={(e) => setNewGroupNote({...newGroupNote, content: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs h-24 resize-none outline-none text-slate-700" />
                <button onClick={handleCreateGroupNote} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold active:scale-95 transition">Share with Team</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
