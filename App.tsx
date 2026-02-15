
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Plus, 
  Send, 
  Download, 
  Trash2, 
  FileText, 
  Settings, 
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  BrainCircuit,
  Loader2,
  MoreVertical,
  Layers
} from 'lucide-react';
import { ExamMetadata, Question, ExamSet, ChatMessage } from './types';
import { generateExamQuestions, createQuestionChat } from './geminiService';

// Helper Components
const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

interface QuestionCardProps {
  question: Question;
  onUpdate: (q: Question) => void;
  onDelete: (id: string) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onUpdate, onDelete }) => {
  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ ...question, difficulty: e.target.value as any });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm hover:shadow-md transition-shadow group relative">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onDelete(question.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
          <Trash2 size={18} />
        </button>
      </div>
      
      <div className="flex items-center space-x-2 mb-3">
        <select 
          value={question.difficulty}
          onChange={handleDifficultyChange}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-colors ${
            question.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
            question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <span className="text-xs text-slate-400">•</span>
        <span className="text-xs text-slate-500 font-medium">{question.topic}</span>
      </div>

      <h3 className="text-lg font-semibold text-slate-800 mb-4">{question.text}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {question.options.map((option) => (
          <div 
            key={option.label}
            className={`p-3 rounded-xl border flex items-center space-x-3 ${
              option.label === question.correctAnswer 
                ? 'border-green-500 bg-green-50 text-green-800' 
                : 'border-slate-100 bg-slate-50 text-slate-600'
            }`}
          >
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              option.label === question.correctAnswer ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-500'
            }`}>
              {option.label}
            </span>
            <span className="flex-1 text-sm font-medium">{option.text}</span>
            {option.label === question.correctAnswer && <CheckCircle2 size={18} className="text-green-500" />}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50">
        <p className="text-xs text-slate-400 font-bold uppercase mb-1 tracking-wider">Explanation</p>
        <p className="text-sm text-slate-600 italic leading-relaxed">
          {question.explanation}
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [newExamMeta, setNewExamMeta] = useState<ExamMetadata>({
    subject: 'Mathematics',
    topic: 'Calculus',
    gradeLevel: 'Grade 12',
    examType: 'Mid-term'
  });
  const [qCount, setQCount] = useState(5);

  const activeSet = examSets.find(s => s.id === activeSetId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const questions = await generateExamQuestions(newExamMeta, qCount);
      const newSet: ExamSet = {
        id: Math.random().toString(36).substr(2, 9),
        metadata: { ...newExamMeta },
        questions,
        createdAt: Date.now()
      };
      setExamSets(prev => [newSet, ...prev]);
      setActiveSetId(newSet.id);
      
      setChatMessages([{
        role: 'model',
        content: `I've generated ${questions.length} questions for your ${newExamMeta.subject} exam on ${newExamMeta.topic}. How else can I help you refine this set?`
      }]);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    setIsLoading(true);
    try {
      const chat = createQuestionChat(`You are the Danovate CBT Question Architect. 
        Current exam context: ${JSON.stringify(activeSet?.metadata)}. 
        Current questions count: ${activeSet?.questions.length}.
        Assist the educator in refining these questions, adding more, or changing wording.`);
      
      const response = await chat.sendMessage({ message: userMsg });
      setChatMessages(prev => [...prev, { role: 'model', content: response.text || "I'm sorry, I couldn't process that request." }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', content: "Error communicating with AI assistant." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSetAsCSV = (set: ExamSet) => {
    const headers = ['question_text', 'a', 'b', 'c', 'd', 'correct'];
    
    const rows = set.questions.map(q => {
      // Create a map for easy lookup of option texts
      const optionsMap: Record<string, string> = {};
      q.options.forEach(opt => {
        // Sanitize text for CSV: replace double quotes with two double quotes
        optionsMap[opt.label.toLowerCase()] = opt.text.replace(/"/g, '""');
      });

      const sanitizedQuestion = q.text.replace(/"/g, '""');
      const correctOption = q.correctAnswer.toLowerCase();

      return [
        `"${sanitizedQuestion}"`,
        `"${optionsMap['a'] || ''}"`,
        `"${optionsMap['b'] || ''}"`,
        `"${optionsMap['c'] || ''}"`,
        `"${optionsMap['d'] || ''}"`,
        `"${correctOption}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `danovate_exam_${set.metadata.subject.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  };

  const deleteQuestion = (id: string) => {
    if (!activeSetId) return;
    setExamSets(prev => prev.map(set => {
      if (set.id === activeSetId) {
        return { ...set, questions: set.questions.filter(q => q.id !== id) };
      }
      return set;
    }));
  };

  const updateQuestion = (updated: Question) => {
    if (!activeSetId) return;
    setExamSets(prev => prev.map(s => 
      s.id === activeSetId 
        ? { ...s, questions: s.questions.map(curr => curr.id === updated.id ? updated : curr) } 
        : s
    ));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Danovate</h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Question Architect</p>
            </div>
          </div>

          <nav className="space-y-2">
            <SidebarItem icon={Layers} label="Exam Dashboard" active={!activeSetId} onClick={() => setActiveSetId(null)} />
            <SidebarItem icon={FileText} label="Templates" />
            <SidebarItem icon={Settings} label="Settings" />
            <SidebarItem icon={HelpCircle} label="Documentation" />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Recent Exam Sets</p>
            <div className="space-y-3">
              {examSets.slice(0, 5).map(set => (
                <button 
                  key={set.id}
                  onClick={() => setActiveSetId(set.id)}
                  className={`w-full text-left text-sm p-2 rounded-lg transition-colors ${
                    activeSetId === set.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <div className="truncate">{set.metadata.subject} - {set.metadata.topic}</div>
                  <div className="text-[10px] text-slate-400">{new Date(set.createdAt).toLocaleDateString()}</div>
                </button>
              ))}
              {examSets.length === 0 && <p className="text-xs text-slate-400 italic">No exams created yet</p>}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-slate-800 font-semibold">
              {activeSet ? `${activeSet.metadata.subject}: ${activeSet.metadata.topic}` : "Assessment Dashboard"}
            </h2>
            {activeSet && (
              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-lg font-medium">
                {activeSet.questions.length} Questions
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {activeSet && (
              <button 
                onClick={() => downloadSetAsCSV(activeSet)}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-slate-200"
              >
                <Download size={16} />
                <span>Export for Danovate CBT</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Feed */}
          <section className="flex-1 overflow-y-auto p-8 bg-slate-50 relative">
            {!activeSet && !isGenerating ? (
              <div className="max-w-4xl mx-auto py-12">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Set high-quality exams in seconds.</h1>
                  <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                    Leverage advanced AI to generate challenging, CBT-ready questions tailored specifically for the Danovate ecosystem.
                  </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 p-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center space-x-2">
                    <Plus className="text-blue-600" />
                    <span>Generate New Question Set</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-600 ml-1">Subject</label>
                      <input 
                        type="text" 
                        value={newExamMeta.subject}
                        onChange={e => setNewExamMeta(p => ({...p, subject: e.target.value}))}
                        className="w-full px-4 py-3 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                        placeholder="e.g. Mathematics" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-600 ml-1">Topic</label>
                      <input 
                        type="text" 
                        value={newExamMeta.topic}
                        onChange={e => setNewExamMeta(p => ({...p, topic: e.target.value}))}
                        className="w-full px-4 py-3 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                        placeholder="e.g. Quadratic Equations" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-600 ml-1">Grade Level</label>
                      <select 
                        value={newExamMeta.gradeLevel}
                        onChange={e => setNewExamMeta(p => ({...p, gradeLevel: e.target.value}))}
                        className="w-full px-4 py-3 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      >
                        <option>Primary 4-6</option>
                        <option>JSS 1-3</option>
                        <option>SSS 1-3</option>
                        <option>University Level</option>
                        <option>Professional</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-600 ml-1">Question Count</label>
                      <input 
                        type="number" 
                        min="1" max="50" 
                        value={qCount}
                        onChange={e => setQCount(parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all shadow-lg shadow-blue-200"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin" />
                        <span>Generating Smart Questions...</span>
                      </>
                    ) : (
                      <>
                        <BrainCircuit size={20} />
                        <span>Generate Exam Set</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">Validated Accuracy</h4>
                    <p className="text-sm text-slate-500">Every question is cross-referenced with educational standards.</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Layers />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">CBT Ready</h4>
                    <p className="text-sm text-slate-500">Native CSV export format for direct upload to Danovate CBT software.</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MoreVertical />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">Granular Control</h4>
                    <p className="text-sm text-slate-500">Refine difficulty, topics, and wording with our integrated AI chat.</p>
                  </div>
                </div>
              </div>
            ) : isGenerating ? (
               <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                 <div className="relative">
                   <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                   <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={32} />
                 </div>
                 <div>
                   <h2 className="text-2xl font-bold text-slate-800 mb-2">Architecting your exam set...</h2>
                   <p className="text-slate-500 animate-pulse">Consulting educational models and generating distractor options.</p>
                 </div>
               </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-800">Previewing Questions</h3>
                  <button 
                    onClick={() => setActiveSetId(null)}
                    className="text-sm text-blue-600 font-bold hover:underline"
                  >
                    Back to Dashboard
                  </button>
                </div>
                
                {activeSet?.questions.map((q) => (
                  <QuestionCard 
                    key={q.id} 
                    question={q} 
                    onUpdate={updateQuestion}
                    onDelete={deleteQuestion}
                  />
                ))}

                <button 
                  onClick={() => handleGenerate()}
                  className="w-full py-6 border-2 border-dashed border-slate-300 rounded-3xl text-slate-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center space-y-2 mt-8"
                >
                  <Plus size={32} />
                  <span className="font-bold">Generate More Questions</span>
                </button>
              </div>
            )}
          </section>

          {/* Chat Sidebar Panel */}
          <aside className="w-96 bg-white border-l border-slate-200 flex flex-col hidden xl:flex">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center space-x-2">
                <BrainCircuit size={18} className="text-blue-600" />
                <span>AI Assistant</span>
              </h3>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                    <BrainCircuit size={32} />
                  </div>
                  <h4 className="font-bold text-slate-700 mb-2">Need a hand?</h4>
                  <p className="text-sm text-slate-500">Ask me to rephrase questions, generate more of a specific difficulty, or change topics.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 px-4 py-3 rounded-2xl text-slate-400 flex items-center space-x-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs">Architect thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()}
                  placeholder="Ask for question refinements..."
                  className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button 
                  onClick={handleChat}
                  disabled={isLoading || !chatInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 disabled:text-slate-300"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
