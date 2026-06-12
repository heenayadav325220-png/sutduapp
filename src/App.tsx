import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { 
  Home, 
  MessageSquare, 
  BookOpen, 
  PenTool, 
  Calendar, 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle,
  ChevronRight,
  BrainCircuit,
  GraduationCap,
  LayoutDashboard,
  Search,
  Send,
  Loader2,
  Mic,
  Camera,
  Image as ImageIcon,
  Trophy,
  Award,
  Star,
  X,
  Users,
  MessageCircle,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getStudyAnswer, generateQuiz, generateStudyDiagram } from './services/geminiService';
import type { Note, ScheduleItem, Progress, ChatMessage, Subject, User as UserType, LeaderboardEntry, Group, GroupMessage, GroupNote } from './types';

const SUBJECTS: Subject[] = ['Mathematics', 'Science', 'Biology', 'Physics', 'Chemistry', 'English'];

const KEYS = {
  USER: 'studybuddy_user',
  LEADERBOARD: 'studybuddy_leaderboard',
  NOTES: 'studybuddy_notes',
  SCHEDULE: 'studybuddy_schedule',
  PROGRESS: 'studybuddy_progress',
  GROUPS: 'studybuddy_groups',
  GROUP_MESSAGES: 'studybuddy_group_messages',
  GROUP_NOTES: 'studybuddy_group_notes',
  CHAT_HISTORY: 'studybuddy_chat_history',
};

// Default Mock Data if LocalStorage is empty.
const DEFAULT_USER: UserType = {
  id: 1,
  name: 'Rohit Yadav',
  points: 120,
  level: 2,
  badges: [
    { id: 1, badge_name: 'Quick Start', icon: '🚀', date_earned: new Date().toLocaleDateString() }
  ]
};

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { name: 'Alice Johnson', points: 340, level: 4 },
  { name: 'Bob Smith', points: 280, level: 3 },
  { name: 'Rohit Yadav', points: 120, level: 2 },
  { name: 'Sarah Connor', points: 90, level: 1 }
];

const DEFAULT_NOTES: Note[] = [
  { 
    id: 1, 
    title: 'Math Derivative Formulas', 
    content: 'd/dx(sin x) = cos x\nd/dx(cos x) = -sin x\nd/dx(tan x) = sec^2 x\nd/dx(ln x) = 1/x', 
    subject: 'Mathematics', 
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() 
  },
  { 
    id: 2, 
    title: "Newton's Laws of Motion", 
    content: "1. Inertia: Objects stay at rest/uniform motion unless a net external force acts.\n2. Acceleration: Force = mass x acceleration (F=ma).\n3. Action & Reaction: Forces are equal & opposite.", 
    subject: 'Physics', 
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() 
  }
];

const DEFAULT_SCHEDULE: ScheduleItem[] = [
  { id: 1, task: 'Math Assignment Review', time: '14:00', day: 'Monday', completed: false },
  { id: 2, task: 'Physics Lab Report', time: '16:30', day: 'Tuesday', completed: true },
  { id: 3, task: 'Organic Chemistry Revision', time: '10:00', day: 'Wednesday', completed: false }
];

const DEFAULT_PROGRESS: Progress[] = [
  { id: 1, subject: 'Mathematics', score: 4, total: 5, date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
  { id: 2, subject: 'Physics', score: 5, total: 5, date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
];

const DEFAULT_GROUPS: Group[] = [
  { id: 1, name: 'Science Wizards', description: 'Group for studying Chemistry and Biology together', created_by: 2, created_at: new Date().toISOString(), member_count: 3 },
  { id: 2, name: 'Math Squad', description: 'Solving calculus homework step-by-step', created_by: 3, created_at: new Date().toISOString(), member_count: 2 }
];

const DEFAULT_GROUP_MESSAGES: Record<number, GroupMessage[]> = {
  1: [
    { id: 1, group_id: 1, user_id: 2, user_name: 'Alice Johnson', text: 'Hey everyone! Anyone free to review Chemistry Chapter 3?', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, group_id: 1, user_id: 3, user_name: 'Bob Smith', text: 'Yes! I am free to discuss the periodic trends.', created_at: new Date(Date.now() - 1800000).toISOString() }
  ],
  2: [
    { id: 1, group_id: 2, user_id: 3, user_name: 'Bob Smith', text: 'Did anyone solve question 4 on calculus integration?', created_at: new Date(Date.now() - 7200000).toISOString() }
  ]
};

const DEFAULT_GROUP_NOTES: Record<number, GroupNote[]> = {
  1: [
    { id: 1, group_id: 1, title: 'Periodic Table Trends Note', content: 'Atomic Radius decreases across a period and increases down a group. Electronegativity increases across a period.', updated_by: 2, updated_by_name: 'Alice Johnson', updated_at: new Date().toISOString() }
  ],
  2: [
    { id: 1, group_id: 2, title: 'Integration Formulas', content: 'integral of (x^n) dx = (x^(n+1))/(n+1) + C. integral of (e^x) dx = e^x + C.', updated_by: 3, updated_by_name: 'Bob Smith', updated_at: new Date().toISOString() }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  // Load state from LocalStorage or fallback to default mock data
  const [user, setUser] = useState<UserType>(() => {
    const stored = localStorage.getItem(KEYS.USER);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(KEYS.USER, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const stored = localStorage.getItem(KEYS.LEADERBOARD);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(KEYS.LEADERBOARD, JSON.stringify(DEFAULT_LEADERBOARD));
    return DEFAULT_LEADERBOARD;
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const stored = localStorage.getItem(KEYS.NOTES);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(KEYS.NOTES, JSON.stringify(DEFAULT_NOTES));
    return DEFAULT_NOTES;
  });

  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const stored = localStorage.getItem(KEYS.SCHEDULE);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(DEFAULT_SCHEDULE));
    return DEFAULT_SCHEDULE;
  });

  const [progress, setProgress] = useState<Progress[]>(() => {
    const stored = localStorage.getItem(KEYS.PROGRESS);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(DEFAULT_PROGRESS));
    return DEFAULT_PROGRESS;
  });

  const [groups, setGroups] = useState<Group[]>(() => {
    const stored = localStorage.getItem(KEYS.GROUPS);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(DEFAULT_GROUPS));
    return DEFAULT_GROUPS;
  });

  const [groupMessagesDict, setGroupMessagesDict] = useState<Record<number, GroupMessage[]>>(() => {
    const stored = localStorage.getItem(KEYS.GROUP_MESSAGES);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(KEYS.GROUP_MESSAGES, JSON.stringify(DEFAULT_GROUP_MESSAGES));
    return DEFAULT_GROUP_MESSAGES;
  });

  const [groupNotesDict, setGroupNotesDict] = useState<Record<number, GroupNote[]>>(() => {
    const stored = localStorage.getItem(KEYS.GROUP_NOTES);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(KEYS.GROUP_NOTES, JSON.stringify(DEFAULT_GROUP_NOTES));
    return DEFAULT_GROUP_NOTES;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const stored = localStorage.getItem(KEYS.CHAT_HISTORY);
    return stored ? JSON.parse(stored) : [];
  });

  // Chat input and visual helper states
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notes Modals and Form fields helper states
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', subject: 'Mathematics' as Subject });

  // Planner form fields helper states
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ task: '', time: '', day: 'Monday' });

  // Quiz helper states
  const [quizSubject, setQuizSubject] = useState<Subject | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  // Group views helper states
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groupTab, setGroupTab] = useState<'chat' | 'notes'>('chat');
  const [groupChatInput, setGroupChatInput] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [isAddingGroupNote, setIsAddingGroupNote] = useState(false);
  const [newGroupNote, setNewGroupNote] = useState({ title: '', content: '' });

  // Sync state modifications to LocalStorage
  useEffect(() => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(KEYS.LEADERBOARD, JSON.stringify(leaderboard));
  }, [leaderboard]);

  useEffect(() => {
    localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem(KEYS.GROUP_MESSAGES, JSON.stringify(groupMessagesDict));
  }, [groupMessagesDict]);

  useEffect(() => {
    localStorage.setItem(KEYS.GROUP_NOTES, JSON.stringify(groupNotesDict));
  }, [groupNotesDict]);

  useEffect(() => {
    localStorage.setItem(KEYS.CHAT_HISTORY, JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Utility to award points, level up, and check for syncs
  const awardPointsAndCheckBadges = (amount: number, checkBadgeType?: 'question' | 'note' | 'planner' | 'quiz', extraPayload?: any) => {
    setUser(prev => {
      const newPoints = prev.points + amount;
      const newLevel = Math.floor(newPoints / 100) + 1;
      const updatedBadges = [...prev.badges];

      if (checkBadgeType === 'question') {
        const userQuestionsCount = chatMessages.filter(m => m.role === 'user').length + 1;
        if (userQuestionsCount >= 5 && !updatedBadges.some(b => b.badge_name === 'Quick Learner')) {
          updatedBadges.push({
            id: Date.now() + 1,
            badge_name: 'Quick Learner',
            icon: '⚡',
            date_earned: new Date().toLocaleDateString()
          });
        }
      }

      if (checkBadgeType === 'note') {
        const currentNotesCount = notes.length + 1;
        if (currentNotesCount >= 3 && !updatedBadges.some(b => b.badge_name === 'Note Taker')) {
          updatedBadges.push({
            id: Date.now() + 2,
            badge_name: 'Note Taker',
            icon: '📝',
            date_earned: new Date().toLocaleDateString()
          });
        }
      }

      if (checkBadgeType === 'planner') {
        const completedTasksCount = schedule.filter(s => s.completed).length + 1;
        if (completedTasksCount >= 5 && !updatedBadges.some(b => b.badge_name === 'Planner')) {
          updatedBadges.push({
            id: Date.now() + 3,
            badge_name: 'Planner',
            icon: '📅',
            date_earned: new Date().toLocaleDateString()
          });
        }
      }

      if (checkBadgeType === 'quiz') {
        const finalQuizScore = extraPayload?.score || 0;
        const questionsLen = extraPayload?.total || 5;

        if (finalQuizScore === questionsLen && !updatedBadges.some(b => b.badge_name === 'Quiz Master')) {
          updatedBadges.push({
            id: Date.now() + 4,
            badge_name: 'Quiz Master',
            icon: '🏆',
            date_earned: new Date().toLocaleDateString()
          });
        }

        const today = new Date().toISOString().split('T')[0];
        const quizzesTodayCount = progress.filter(p => {
          const checkDate = p.date ? p.date.split('T')[0] : '';
          return checkDate === today;
        }).length + 1;

        if (quizzesTodayCount >= 1 && !updatedBadges.some(b => b.badge_name === 'Early Bird')) {
          updatedBadges.push({
            id: Date.now() + 5,
            badge_name: 'Early Bird',
            icon: '🌅',
            date_earned: new Date().toLocaleDateString()
          });
        }
      }

      const updatedUser = {
        ...prev,
        points: newPoints,
        level: newLevel,
        badges: updatedBadges
      };

      setLeaderboard(lPrev => {
        const hasUser = lPrev.some(entry => entry.name === prev.name);
        if (hasUser) {
          return lPrev.map(entry => entry.name === prev.name ? { ...entry, points: newPoints, level: newLevel } : entry)
                      .sort((a, b) => b.points - a.points);
        } else {
          return [...lPrev, { name: prev.name, points: newPoints, level: newLevel }]
                 .sort((a, b) => b.points - a.points);
        }
      });

      return updatedUser;
    });
  };

  // Chat Actions
  const handleSendMessage = async () => {
    if (!chatInput.trim() && !selectedImage) return;

    const userMsg: ChatMessage = { 
      role: 'user', 
      text: chatInput,
      image: selectedImage || undefined
    };

    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    const currentImage = selectedImage;

    setChatInput('');
    setSelectedImage(null);
    setIsChatLoading(true);

    try {
      const answer = await getStudyAnswer(currentInput || "Analyze this image", currentImage || undefined);

      let aiImage: string | null = null;
      if (currentInput.toLowerCase().includes('diagram') || currentInput.toLowerCase().includes('visualize')) {
        aiImage = await generateStudyDiagram(currentInput);
      }

      setChatMessages(prev => [...prev, { 
        role: 'model', 
        text: answer || 'Sorry, I couldn\'t find an answer.',
        image: aiImage || undefined
      }]);

      awardPointsAndCheckBadges(10, 'question');

    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition not supported in this browser.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(prev => prev + ' ' + transcript);
    };

    recognition.start();
  };

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

  // Notes Actions
  const handleAddNote = () => {
    if (!newNote.title.trim()) return;

    const addedNote: Note = {
      id: Date.now(),
      title: newNote.title,
      content: newNote.content,
      subject: newNote.subject,
      updated_at: new Date().toISOString()
    };

    setNotes(prev => [addedNote, ...prev]);
    setIsAddingNote(false);
    setNewNote({ title: '', content: '', subject: 'Mathematics' });

    awardPointsAndCheckBadges(20, 'note');
  };

  const handleDeleteNote = (id: number) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  // Planner actions
  const handleToggleSchedule = (item: ScheduleItem) => {
    setSchedule(prev => prev.map(s => {
      if (s.id === item.id) {
        const isNowCompleted = !s.completed;
        if (isNowCompleted) {
          setTimeout(() => {
            awardPointsAndCheckBadges(15, 'planner');
          }, 100);
        }
        return { ...s, completed: isNowCompleted };
      }
      return s;
    }));
  };

  const handleAddSchedule = () => {
    if (!newSchedule.task.trim()) return;

    const addedItem: ScheduleItem = {
      id: Date.now(),
      task: newSchedule.task,
      time: newSchedule.time || '12:00',
      day: newSchedule.day,
      completed: false
    };

    setSchedule(prev => [...prev, addedItem]);
    setIsAddingSchedule(false);
    setNewSchedule({ task: '', time: '', day: 'Monday' });
  };

  const handleDeleteSchedule = (id: number) => {
    setSchedule(prev => prev.filter(item => item.id !== id));
  };

  // Quiz actions
  const startQuiz = async (subject: Subject) => {
    setQuizSubject(subject);
    setIsQuizLoading(true);
    setQuizQuestions([]);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizFinished(false);

    try {
      const questions = await generateQuiz(subject);
      setQuizQuestions(questions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleQuizAnswer = (index: number) => {
    const isAnswerCorrect = index === quizQuestions[currentQuizIndex].answer;
    const addedScore = isAnswerCorrect ? 1 : 0;
    const newScore = quizScore + addedScore;

    if (currentQuizIndex + 1 < quizQuestions.length) {
      setQuizScore(newScore);
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setQuizScore(newScore);
      setQuizFinished(true);

      const finalProgress: Progress = {
        id: Date.now(),
        subject: quizSubject!,
        score: newScore,
        total: quizQuestions.length,
        date: new Date().toISOString()
      };
      setProgress(prev => [finalProgress, ...prev]);

      awardPointsAndCheckBadges(newScore * 10, 'quiz', { score: newScore, total: quizQuestions.length });
    }
  };

  // Study Groups actions
  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) return;

    const addedGroup: Group = {
      id: Date.now(),
      name: newGroup.name,
      description: newGroup.description,
      created_by: user.id,
      created_at: new Date().toISOString(),
      member_count: 1
    };

    setGroups(prev => [...prev, addedGroup]);
    setGroupMessagesDict(prev => ({ ...prev, [addedGroup.id]: [] }));
    setGroupNotesDict(prev => ({ ...prev, [addedGroup.id]: [] }));

    setIsAddingGroup(false);
    setNewGroup({ name: '', description: '' });
  };

  const handleJoinGroup = (groupId: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, member_count: (g.member_count || 1) + 1 };
      }
      return g;
    }));
  };

  const openGroup = (group: Group) => {
    setActiveGroup(group);
  };

  const handleSendGroupMessage = () => {
    if (!groupChatInput.trim() || !activeGroup) return;

    const addedMsg: GroupMessage = {
      id: Date.now(),
      group_id: activeGroup.id,
      user_id: user.id,
      user_name: user.name,
      text: groupChatInput,
      created_at: new Date().toISOString()
    };

    const currentGroupId = activeGroup.id;

    setGroupMessagesDict(prev => {
      const existing = prev[currentGroupId] || [];
      return { ...prev, [currentGroupId]: [...existing, addedMsg] };
    });
    setGroupChatInput('');

    setTimeout(() => {
      const mockReplies = [
        `Thanks for sharing! Let's check this out.`,
        `Oh great, I was just reading about that topic as well!`,
        `That makes so much sense! Let's schedule a study call tonight.`,
        `Cool study tip, Rohit! Added it to my planner too.`
      ];
      const randomReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];

      const classmateMsg: GroupMessage = {
        id: Date.now() + 10,
        group_id: currentGroupId,
        user_id: 2,
        user_name: 'Alice Johnson',
        text: randomReply,
        created_at: new Date().toISOString()
      };

      setGroupMessagesDict(prev => {
        const existing = prev[currentGroupId] || [];
        return { ...prev, [currentGroupId]: [...existing, classmateMsg] };
      });
    }, 1500);
  };

  const handleAddGroupNote = () => {
    if (!newGroupNote.title.trim() || !activeGroup) return;

    const addedGNote: GroupNote = {
      id: Date.now(),
      group_id: activeGroup.id,
      title: newGroupNote.title,
      content: newGroupNote.content,
      updated_by: user.id,
      updated_by_name: user.name,
      updated_at: new Date().toISOString()
    };

    setGroupNotesDict(prev => {
      const existing = prev[activeGroup.id] || [];
      return { ...prev, [activeGroup.id]: [addedGNote, ...existing] };
    });

    setIsAddingGroupNote(false);
    setNewGroupNote({ title: '', content: '' });
  };

  // Rendering individual tab components
  const renderHome = () => (
    <div className="space-y-6 pb-20 select-none">
      <header className="flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Hello, {user.name}! 👋</h1>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-slate-500 text-sm">Level {user.level}</p>
            <div className="flex-1 max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-505" 
                style={{ width: `${user.points % 100}%` }}
              />
            </div>
            <p className="text-slate-400 text-[10px]">{user.points} pts</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-indigo-200 shrink-0">
          <User className="text-indigo-600" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setActiveTab('chat')}
          className="p-4 bg-indigo-600 rounded-2xl text-white flex flex-col items-start space-y-2 shadow-lg shadow-indigo-200 hover:opacity-90 active:scale-95 transition-all text-left"
        >
          <BrainCircuit className="w-6 h-6" />
          <span className="font-semibold">AI Assistant</span>
        </button>
        <button 
          onClick={() => setActiveTab('quiz')}
          className="p-4 bg-emerald-500 rounded-2xl text-white flex flex-col items-start space-y-2 shadow-lg shadow-emerald-200 hover:opacity-90 active:scale-95 transition-all text-left"
        >
          <GraduationCap className="w-6 h-6" />
          <span className="font-semibold">Practice Quiz</span>
        </button>
      </div>

      <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <Trophy className="w-5 h-5 text-amber-500 mr-2" />
            Leaderboard
          </h2>
          <button onClick={() => setActiveTab('profile')} className="text-indigo-600 text-xs font-bold">View Rank</button>
        </div>
        <div className="space-y-3">
          {leaderboard.slice(0, 3).map((entry, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  entry.name === user.name ? 'bg-indigo-600 text-white' :
                  i === 0 ? 'bg-amber-100 text-amber-600' : 
                  i === 1 ? 'bg-slate-100 text-slate-600' : 
                  'bg-orange-100 text-orange-600'
                }`}>
                  {i + 1}
                </span>
                <span className={`text-sm font-medium ${entry.name === user.name ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>{entry.name}</span>
              </div>
              <span className="text-xs font-bold text-slate-400">{entry.points} pts</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Recent Notes</h2>
          <button onClick={() => setActiveTab('notes')} className="text-indigo-600 text-sm font-medium">View All</button>
        </div>
        <div className="space-y-3">
          {notes.slice(0, 2).map(note => (
            <div key={note.id} className="p-4 bg-white rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
              <div>
                <h3 className="font-semibold text-slate-800">{note.title}</h3>
                <p className="text-xs text-slate-400">{note.subject} • {new Date(note.updated_at).toLocaleDateString()}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-xs italic">No notes created yet. Go to Notes Maker!</div>
          )}
        </div>
      </section>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full max-h-[calc(100vh-160px)]">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-hide">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm'}`}>
              {msg.image && (
                <img src={msg.image} alt="Upload" className="w-full rounded-xl mb-2 max-h-48 object-cover" />
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center space-x-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="text-xs text-slate-500">AI is analyzing...</span>
            </div>
          </div>
        )}
        {chatMessages.length === 0 && (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BrainCircuit className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Study Assistant</h2>
            <p className="text-slate-500 text-sm px-10">Ask by text, voice, or photo! I can even generate diagrams for you.</p>
          </div>
        )}
      </div>

      <div className="pt-4 space-y-3">
        {selectedImage && (
          <div className="relative inline-block">
            <img src={selectedImage} alt="Selected" className="w-20 h-20 rounded-xl object-cover border-2 border-indigo-500" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-2xl px-3 py-1 focus-within:ring-2 focus-within:ring-indigo-500 shadow-sm relative overflow-hidden">
            {isListening && (
              <div className="absolute inset-0 bg-red-50/80 backdrop-blur-[1px] flex items-center px-4 space-x-2 z-10">
                <div className="flex space-x-1">
                  {[1, 2, 3].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ height: [4, 12, 4] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 bg-red-500 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-red-600 animate-pulse">Listening...</span>
              </div>
            )}
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type or use voice..."
              className="flex-1 p-2 bg-transparent focus:outline-none text-sm"
            />
            <button 
              onClick={handleVoiceInput}
              className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <button 
            onClick={handleSendMessage}
            disabled={isChatLoading}
            className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-105"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">My Notes</h2>
        <button 
          onClick={() => setIsAddingNote(true)}
          className="p-2 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {notes.map(note => (
          <div key={note.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm relative group">
            <div className="flex justify-between items-start mb-2">
              <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                {note.subject}
              </span>
              <button 
                onClick={() => handleDeleteNote(note.id)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{note.title}</h3>
            <p className="text-sm text-slate-500 line-clamp-3 whitespace-pre-wrap">{note.content}</p>
            <p className="text-[10px] text-slate-400 mt-3">{new Date(note.updated_at).toLocaleString()}</p>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-center py-10 text-slate-400 italic">No notes created yet. Click the + icon to write your first note!</div>
        )}
      </div>

      <AnimatePresence>
        {isAddingNote && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-white p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">New Note</h3>
              <button onClick={() => setIsAddingNote(false)} className="text-slate-400">Cancel</button>
            </div>
            <div className="space-y-4 flex-1">
              <input 
                type="text" 
                placeholder="Title"
                value={newNote.title}
                onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                className="w-full text-2xl font-bold focus:outline-none"
              />
              <select 
                value={newNote.subject}
                onChange={(e) => setNewNote({...newNote, subject: e.target.value as Subject})}
                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200"
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea 
                placeholder="Start writing..."
                value={newNote.content}
                onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                className="w-full flex-1 resize-none focus:outline-none text-slate-700"
              />
            </div>
            <button 
              onClick={handleAddNote}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 mt-4"
            >
              Save Note
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderQuiz = () => (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-slate-800">Practice Quizzes</h2>
      
      {!quizSubject ? (
        <div className="grid grid-cols-2 gap-4">
          {SUBJECTS.map(subject => (
            <button 
              key={subject}
              onClick={() => startQuiz(subject)}
              className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-505 transition-all text-center group"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-600 transition-colors">
                <BookOpen className="w-6 h-6 text-indigo-600 group-hover:text-white" />
              </div>
              <span className="font-bold text-slate-700">{subject}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
          {isQuizLoading ? (
            <div className="py-20 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
              <p className="text-slate-505">Generating your {quizSubject} quiz...</p>
            </div>
          ) : quizFinished ? (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Quiz Completed!</h3>
                <p className="text-slate-505">You scored {quizScore} out of {quizQuestions.length}</p>
                <p className="text-indigo-600 font-bold mt-2">+{quizScore * 10} Points Earned!</p>
              </div>
              <button 
                onClick={() => setQuizSubject(null)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
              >
                Back to Subjects
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{quizSubject} Quiz</span>
                <span className="text-xs text-slate-400">Question {currentQuizIndex + 1}/{quizQuestions.length}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300" 
                  style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{quizQuestions[currentQuizIndex]?.question}</h3>
              <div className="space-y-3">
                {quizQuestions[currentQuizIndex]?.options.map((option: string, i: number) => (
                  <button 
                    key={i}
                    onClick={() => handleQuizAnswer(i)}
                    className="w-full p-4 text-left border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-indigo-505 transition-all text-slate-700"
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
  );

  const renderPlanner = () => (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-slate-800">Study Planner</h2>
      
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
          <button 
            key={day}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
              new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-100 text-slate-505'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {schedule.map(item => (
          <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => handleToggleSchedule(item)}>
                {item.completed ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-slate-300" />}
              </button>
              <div>
                <h4 className={`font-bold ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.task}</h4>
                <p className="text-xs text-slate-400">{item.time} • {item.day}</p>
              </div>
            </div>
            <button 
              onClick={() => handleDeleteSchedule(item.id)}
              className="text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {schedule.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm italic">Planner is empty. Schedule tasks to stay ahead!</div>
        )}
        <button 
          onClick={() => setIsAddingSchedule(true)}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium flex items-center justify-center space-x-2 hover:border-indigo-400 hover:text-indigo-600 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Study Session</span>
        </button>
      </div>

      <AnimatePresence>
        {isAddingSchedule && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">New Session</h3>
                <button onClick={() => setIsAddingSchedule(false)} className="text-slate-400"><X /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Task Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Math Homework"
                    value={newSchedule.task}
                    onChange={(e) => setNewSchedule({...newSchedule, task: e.target.value})}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Time</label>
                    <input 
                      type="time" 
                      value={newSchedule.time}
                      onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Day</label>
                    <select 
                      value={newSchedule.day}
                      onChange={(e) => setNewSchedule({...newSchedule, day: e.target.value})}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleAddSchedule}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 mt-6 hover:bg-indigo-700 transition"
              >
                Add to Schedule
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-8 pb-20">
      <div className="text-center">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg relative">
          <User className="w-12 h-12 text-indigo-600" />
          <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white">
            LVL {user.level}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
        <div className="max-w-[200px] mx-auto mt-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
            <span>Progress to Lvl {user.level + 1}</span>
            <span>{user.points % 100}/100</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-1000" 
              style={{ width: `${user.points % 100}%` }}
            />
          </div>
        </div>
        <p className="text-slate-505 mt-2 text-sm">{user.points} Total Points</p>
      </div>

      <section>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <Award className="w-5 h-5 text-indigo-600 mr-2" />
          Badges Earned
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {user.badges.map((badge) => (
            <div key={badge.id} className="flex flex-col items-center space-y-1">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
                <span className="text-xl">{badge.icon}</span>
              </div>
              <span className="text-[10px] text-slate-505 text-center font-medium">{badge.badge_name}</span>
            </div>
          ))}
          {(!user.badges || user.badges.length === 0) && (
            <div className="col-span-4 py-4 text-center text-slate-400 text-sm italic">
              Solve quizzes & plan studies to earn badges!
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Learning Progress</h3>
        <div className="space-y-4">
          {SUBJECTS.map(subject => {
            const subProgress = progress.filter(p => p.subject === subject);
            const totalScore = subProgress.reduce((acc, curr) => acc + curr.score, 0);
            const totalPossible = subProgress.reduce((acc, curr) => acc + curr.total, 0);
            const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;

            return (
              <div key={subject} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{subject}</span>
                  <span className="text-slate-400">{Math.round(percentage)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Star className="w-5 h-5 mr-2" />
          Daily Challenge
        </h3>
        <p className="text-indigo-100 text-sm mb-4">Complete 1 practice quiz today to earn the "Early Bird" badge!</p>
        <button 
          onClick={() => setActiveTab('quiz')}
          className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition"
        >
          Start Challenge
        </button>
      </section>
    </div>
  );

  const renderGroups = () => {
    const currentGroupMessages = activeGroup ? (groupMessagesDict[activeGroup.id] || []) : [];
    const currentGroupNotes = activeGroup ? (groupNotesDict[activeGroup.id] || []) : [];

    return (
      <div className="space-y-6 pb-20 h-full flex flex-col select-none">
        {!activeGroup ? (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Study Groups</h2>
              <button 
                onClick={() => setIsAddingGroup(true)}
                className="p-2 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 active:scale-95 transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 scrollbar-hide">
              {groups.map(group => (
                <div key={group.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800">{group.name}</h3>
                    <p className="text-xs text-slate-400">{group.member_count || 1} members • {group.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => openGroup(group)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold active:scale-95 transition-all hover:bg-indigo-100"
                    >
                      Enter
                    </button>
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="text-center py-10 text-slate-400 italic">
                  No groups found. Create one to start collaborating!
                </div>
              )}
            </div>

            <AnimatePresence>
              {isAddingGroup && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-6"
                >
                  <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Create Group</h3>
                      <button onClick={() => setIsAddingGroup(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Group Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Physics Study Squad"
                          value={newGroup.name}
                          onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-205 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Description</label>
                        <textarea 
                          placeholder="What's this group about?"
                          value={newGroup.description}
                          onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-205 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleCreateGroup}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 mt-6 active:scale-95 transition-all hover:bg-indigo-700"
                    >
                      Create Group
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex flex-col h-full max-h-[calc(100vh-160px)]">
            <div className="flex items-center space-x-4 mb-4 border-b border-slate-100 pb-3">
              <button onClick={() => setActiveGroup(null)} className="p-2 bg-slate-100 rounded-xl text-slate-600 active:scale-95 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-800 truncate">{activeGroup.name}</h2>
                <div className="flex space-x-4 mt-1">
                  <button 
                    onClick={() => setGroupTab('chat')}
                    className={`text-xs font-bold uppercase tracking-widest ${groupTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-slate-400'}`}
                  >
                    Chat
                  </button>
                  <button 
                    onClick={() => setGroupTab('notes')}
                    className={`text-xs font-bold uppercase tracking-widest ${groupTab === 'notes' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-slate-400'}`}
                  >
                    Shared Notes
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
              {groupTab === 'chat' ? (
                <div className="space-y-4 pb-4">
                  {currentGroupMessages.map((msg, i) => (
                    <div key={msg.id || i} className={`flex ${msg.user_id === user.id ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[85%]">
                        <p className="text-[10px] font-bold text-slate-400 mb-1 px-1">{msg.user_name}</p>
                        <div className={`p-3 rounded-2xl ${msg.user_id === user.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm'}`}>
                          <p className="text-sm">{msg.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {currentGroupMessages.length === 0 && (
                    <div className="text-center py-10 text-slate-400 italic">No messages yet. Say hello to your group!</div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm">Group Shared Study Notes</h3>
                    <button 
                      onClick={() => setIsAddingGroupNote(true)}
                      className="p-1.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-lg flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-[10px] font-bold">New Note</span>
                    </button>
                  </div>
                  {currentGroupNotes.map(note => (
                    <div key={note.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="font-bold text-slate-800 mb-1">{note.title}</h4>
                      <p className="text-sm text-slate-500 whitespace-pre-wrap">{note.content}</p>
                      <div className="flex justify-between items-center mt-3 border-t border-slate-50 pt-2">
                        <span className="text-[10px] text-slate-400">Updated by {note.updated_by_name}</span>
                        <span className="text-[10px] text-slate-400">{new Date(note.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {currentGroupNotes.length === 0 && (
                    <div className="text-center py-10 text-slate-400 italic">No shared notes yet. Click 'New Note' to create one!</div>
                  )}
                </div>
              )}
            </div>

            {groupTab === 'chat' && (
              <div className="pt-4 flex items-center space-x-2">
                <input 
                  type="text" 
                  value={groupChatInput}
                  onChange={(e) => setGroupChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendGroupMessage()}
                  placeholder="Message group..."
                  className="flex-1 p-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button 
                  onClick={handleSendGroupMessage}
                  className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )}

            <AnimatePresence>
              {isAddingGroupNote && (
                <motion.div 
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 100 }}
                  className="fixed inset-0 z-50 bg-white p-6 flex flex-col"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">New Group Note</h3>
                    <button onClick={() => setIsAddingGroupNote(false)} className="text-slate-400 hover:text-slate-600 font-medium">Cancel</button>
                  </div>
                  <div className="space-y-4 flex-1">
                    <input 
                      type="text" 
                      placeholder="Note Title"
                      value={newGroupNote.title}
                      onChange={(e) => setNewGroupNote({...newGroupNote, title: e.target.value})}
                      className="w-full text-2xl font-bold focus:outline-none"
                    />
                    <textarea 
                      placeholder="Start collaborating with your teammates..."
                      value={newGroupNote.content}
                      onChange={(e) => setNewGroupNote({...newGroupNote, content: e.target.value})}
                      className="w-full flex-1 resize-none focus:outline-none text-slate-700"
                    />
                  </div>
                  <button 
                    onClick={handleAddGroupNote}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 mt-4 active:scale-95 transition-all hover:bg-indigo-700"
                  >
                    Save to Group
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'home' && renderHome()}
              {activeTab === 'chat' && renderChat()}
              {activeTab === 'groups' && renderGroups()}
              {activeTab === 'notes' && renderNotes()}
              {activeTab === 'quiz' && renderQuiz()}
              {activeTab === 'planner' && renderPlanner()}
              {activeTab === 'profile' && renderProfile()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-40">
          <button onClick={() => { setActiveTab('home'); setActiveGroup(null); }} className={`p-2 rounded-xl transition-colors ${activeTab === 'home' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
            <Home className="w-6 h-6" />
          </button>
          <button onClick={() => { setActiveTab('chat'); setActiveGroup(null); }} className={`p-2 rounded-xl transition-colors ${activeTab === 'chat' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
            <MessageSquare className="w-6 h-6" />
          </button>
          <button onClick={() => { setActiveTab('groups'); setActiveGroup(null); }} className={`p-2 rounded-xl transition-colors ${activeTab === 'groups' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
            <Users className="w-6 h-6" />
          </button>
          <button onClick={() => { setActiveTab('notes'); setActiveGroup(null); }} className={`p-2 rounded-xl transition-colors ${activeTab === 'notes' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
            <BookOpen className="w-6 h-6" />
          </button>
          <button onClick={() => { setActiveTab('quiz'); setActiveGroup(null); }} className={`p-2 rounded-xl transition-colors ${activeTab === 'quiz' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
            <GraduationCap className="w-6 h-6" />
          </button>
          <button onClick={() => { setActiveTab('planner'); setActiveGroup(null); }} className={`p-2 rounded-xl transition-colors ${activeTab === 'planner' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
            <Calendar className="w-6 h-6" />
          </button>
          <button onClick={() => { setActiveTab('profile'); setActiveGroup(null); }} className={`p-2 rounded-xl transition-colors ${activeTab === 'profile' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
            <User className="w-6 h-6" />
          </button>
        </nav>
      </div>
    </div>
  );
}
