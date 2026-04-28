import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { MascotState, Task, AudioTrack, View } from './types.ts';
import PixelGuardian from './components/PixelGuardian';
import { Play, Square, RotateCcw, Plus, Trash2, Send, Save, Music, AlertCircle, ArrowLeft, Clock, ClipboardList, MessageSquare } from 'lucide-react';

const DEFAULT_SOUNDS: AudioTrack[] = [
  { id: '1', name: 'TRACK 01: DIGITAL WATCH', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
  { id: '2', name: 'TRACK 02: RETRO BEEP', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
  { id: '3', name: 'TRACK 03: RAD-ALARM', url: 'https://actions.google.com/sounds/v1/alarms/dosimeter_alarm.ogg' },
  { id: '4', name: 'TRACK 04: MECHA RING', url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg' },
  { id: '5', name: 'TRACK 05: COWBELL JOKE', url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg' },
];

export default function App() {
  // Navigation
  const [currentView, setCurrentView] = useState<View>(View.HOME);

  // Clock state
  const [clock, setClock] = useState('');

  // Mascot state
  const [mascotState, setMascotState] = useState<MascotState>(MascotState.IDLE);
  const [speech, setSpeech] = useState('SYSTEM ONLINE. READY FOR MISSION!');

  // Timer state
  const [timerInSeconds, setTimerInSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [minutesInput, setMinutesInput] = useState('');
  const [isAlertActive, setIsAlertActive] = useState(false);

  // Audio state
  const [tracks, setTracks] = useState<AudioTrack[]>(DEFAULT_SOUNDS);
  const [selectedTrackId, setSelectedTrackId] = useState(DEFAULT_SOUNDS[0].id);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Task state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  // AI state
  const [apiKey, setApiKey] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [chatLogs, setChatLogs] = useState<{ sender: 'USER' | 'GUARDIAN' | 'SYS', msg: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialization
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setClock(new Date().toTimeString().split(' ')[0]);
    }, 1000);

    const savedTasks = localStorage.getItem('manga_tasks_v3.0');
    if (savedTasks) setTasks(JSON.parse(savedTasks));

    return () => clearInterval(clockInterval);
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timerInSeconds > 0) {
      interval = setInterval(() => {
        setTimerInSeconds((prev) => {
          if (prev <= 1) {
            handleTimerFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timerInSeconds]);

  const handleTimerFinish = () => {
    setIsRunning(false);
    setIsAlertActive(true);
    setMascotState(MascotState.CHEER);
    speak('TIME IS UP, COMMANDER! MISSION COMPLETE!', 0);
    playAlarm();
  };

  const startTimer = () => {
    if (timerInSeconds <= 0 && minutesInput) {
      const mins = parseInt(minutesInput);
      if (mins > 0) {
        setTimerInSeconds(mins * 60);
        setTotalSeconds(mins * 60);
        speak(`TIMER ENGAGED: ${mins} MINUTES TILL IGNITION.`);
      }
    }
    if (timerInSeconds > 0 || (minutesInput && parseInt(minutesInput) > 0)) {
      setIsRunning(true);
    }
  };

  const stopTimer = () => setIsRunning(false);

  const resetTimer = () => {
    stopTimer();
    stopAlarm();
    setTimerInSeconds(0);
    setTotalSeconds(0);
    setMinutesInput('');
    setIsAlertActive(false);
    setMascotState(MascotState.IDLE);
    speak('SYSTEM RESET. STANDING BY.');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Audio Logic
  const playAlarm = async () => {
    if (audioRef.current) {
      const track = tracks.find(t => t.id === selectedTrackId);
      if (track) {
        audioRef.current.pause();
        audioRef.current.src = track.url;
        audioRef.current.loop = true;
        try {
          await audioRef.current.play();
        } catch (e) {
          // Playback may be interrupted by a new request, which is expected during rapid interaction
          console.warn("Playback interrupted:", e);
        }
      }
    }
  };

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const previewAudio = async () => {
    if (audioRef.current && !audioRef.current.paused) {
      stopAlarm();
    } else if (audioRef.current) {
      const track = tracks.find(t => t.id === selectedTrackId);
      if (track) {
        audioRef.current.pause();
        audioRef.current.src = track.url;
        audioRef.current.loop = false;
        try {
          await audioRef.current.play();
        } catch (e) {
          console.warn("Preview interrupted:", e);
        }
      }
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newTrack: AudioTrack = {
        id: `custom-${Date.now()}`,
        name: `[UPLOAD]: ${file.name.substring(0, 15)}`,
        url,
        isCustom: true
      };
      setTracks([...tracks, newTrack]);
      setSelectedTrackId(newTrack.id);
      speak('CUSTOM AUDIO LOADED! AWAITING DEPLOYMENT.');
    }
  };

  const removeCustomAudio = () => {
    const track = tracks.find(t => t.id === selectedTrackId);
    if (track?.isCustom) {
      URL.revokeObjectURL(track.url);
      setTracks(tracks.filter(t => t.id !== selectedTrackId));
      setSelectedTrackId(DEFAULT_SOUNDS[0].id);
      stopAlarm();
      speak('CUSTOM AUDIO WIPED FROM MEMORY.');
    }
  };

  // Task Logic
  const addTask = () => {
    if (!taskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now(),
      title: taskTitle,
      desc: taskDesc,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    setTaskTitle('');
    setTaskDesc('');
    localStorage.setItem('manga_tasks_v3.0', JSON.stringify(updated));
    speak('NEW MISSION LOGGED INTO DATABASE.');
  };

  const deleteTask = (id: number) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    localStorage.setItem('manga_tasks_v3.0', JSON.stringify(updated));
    speak('LOG WIPED FROM EXISTENCE.');
  };

  const updateTask = (id: number, newDesc: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, desc: newDesc } : t);
    setTasks(updated);
    localStorage.setItem('manga_tasks_v3.0', JSON.stringify(updated));
    speak('DATA OVERWRITTEN SUCCESSFULLY.');
  };

  // AI Logic
  const speak = (text: string, duration = 6000) => {
    setSpeech(text);
    if (duration > 0) {
      setTimeout(() => setSpeech(''), duration);
    }
  };

  const sendAiMessage = async () => {
    if (!apiKey) {
      speak('ERROR: MISSING API KEY. PLEASE INSERT GEMINI KEY.');
      return;
    }
    if (!aiInput.trim()) return;

    const userMsg = aiInput.trim();
    setChatLogs(prev => [...prev, { sender: 'USER', msg: userMsg }]);
    setAiInput('');
    setMascotState(MascotState.CHEER);
    speak('PROCESSING...', 0);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: userMsg,
        config: {
          systemInstruction: "You are the 'Pixel Guardian', a tiny AI companion living inside a Manga-themed operating system called PX-OS. Keep your responses highly energetic, robotic, yet anime-styled. Keep responses under 3 short sentences. Call the user 'Commander'."
        }
      });
      
      const reply = response.text || "SYSTEM FAILURE: NO RESPONSE DATA.";
      
      setChatLogs(prev => [...prev, { sender: 'GUARDIAN', msg: reply }]);
      speak(reply);
    } catch (err: any) {
      setChatLogs(prev => [...prev, { sender: 'SYS', msg: 'COMMUNICATION FAILURE: ' + (err.message || 'Unknown Error') }]);
      speak('ERR: CONNECTION TO MAINFRAME SEVERED.');
    } finally {
      setMascotState(MascotState.IDLE);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  const renderHome = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full py-10 px-4"
    >
      <motion.button 
        whileHover={{ scale: 1.05, rotate: 1 }}
        whileTap={{ scale: 0.95, rotate: -1 }}
        className="window btn-pixel hover:bg-manga-blue hover:text-white group flex flex-col items-center justify-center gap-4 p-10 h-64 transition-colors"
        onClick={() => setCurrentView(View.TIMER)}
      >
        <Clock size={48} className="group-hover:scale-110 transition-transform" />
        <span className="text-xl font-bold underline">TIMER.EXE</span>
      </motion.button>

      <motion.button 
        whileHover={{ scale: 1.05, rotate: -1 }}
        whileTap={{ scale: 0.95, rotate: 1 }}
        className="window btn-pixel hover:bg-manga-red hover:text-white group flex flex-col items-center justify-center gap-4 p-10 h-64 transition-colors"
        onClick={() => setCurrentView(View.AUDIO)}
      >
        <Music size={48} className="group-hover:scale-110 transition-transform" />
        <span className="text-xl font-bold underline">AUDIO.SYS</span>
      </motion.button>

      <motion.button 
        whileHover={{ scale: 1.05, rotate: 1 }}
        whileTap={{ scale: 0.95, rotate: -1 }}
        className="window btn-pixel hover:bg-[#2ecc71] hover:text-white group flex flex-col items-center justify-center gap-4 p-10 h-64 transition-colors"
        onClick={() => setCurrentView(View.TASK)}
      >
        <ClipboardList size={48} className="group-hover:scale-110 transition-transform" />
        <span className="text-xl font-bold underline">TASKS.LIST</span>
      </motion.button>

      <motion.button 
        whileHover={{ scale: 1.05, rotate: -1 }}
        whileTap={{ scale: 0.95, rotate: 1 }}
        className="window btn-pixel hover:bg-black hover:text-white group flex flex-col items-center justify-center gap-4 p-10 h-64 transition-colors"
        onClick={() => setCurrentView(View.AI)}
      >
        <MessageSquare size={48} className="group-hover:scale-110 transition-transform" />
        <span className="text-xl font-bold underline">AI_COMM.LINK</span>
      </motion.button>
    </motion.div>
  );

  const renderHeaderWithBack = (title: string, icon: React.ReactNode) => (
    <div className="win-header">
      <div className="flex items-center gap-3">
        <motion.button 
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={() => setCurrentView(View.HOME)} 
          className="hover:text-manga-red transition-colors"
          title="BACK TO MAINPAGE"
        >
          <ArrowLeft size={16} />
        </motion.button>
        <span>{title}</span>
      </div>
      {icon}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <audio ref={audioRef} />

      <AnimatePresence>
        {isAlertActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="window p-10 text-center"
            >
              <h2 className="text-2xl md:text-4xl text-manga-red font-black mb-10 border-b-4 border-black pb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] uppercase">MISSION COMPLETE!!</h2>
              <button className="btn-pixel btn-blue" onClick={resetTimer}>RESTART SYSTEM</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="bg-white border-b-[6px] border-black p-5 flex justify-between items-center sticky top-0 z-50">
        <div className="cursor-pointer font-bold" onClick={() => setCurrentView(View.HOME)}>PX-OS // <span className="text-manga-blue">{clock || '00:00:00'}</span></div>
        <div className="text-manga-red underline text-[8px] md:text-[10px]">MODE: MANGA_DRIVE 3.0</div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {currentView === View.HOME && (
            <React.Fragment key="home">
              {renderHome()}
            </React.Fragment>
          )}

          {currentView === View.TIMER && (
            <motion.section 
              key="timer"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="window max-w-lg w-full"
            >
              {renderHeaderWithBack("TIMER.EXE", <AlertCircle size={12} />)}
              <div className="win-content">
                <div className="timer-val text-4xl text-center my-5 bg-black text-[#0f0] p-5 border-[4px] border-black font-mono">
                  {formatTime(timerInSeconds)}
                </div>
                <div className="progress-bar">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalSeconds > 0 ? (1 - timerInSeconds / totalSeconds) * 100 : 0}%` }}
                    className="h-full bg-manga-red"
                  />
                </div>
                
                <input 
                  type="number" 
                  className="input-pixel" 
                  placeholder="MINUTES" 
                  value={minutesInput}
                  onChange={(e) => setMinutesInput(e.target.value)}
                  disabled={isRunning || timerInSeconds > 0}
                />
                
                <div className="flex gap-4 mb-4">
                  <button 
                    className="btn-pixel btn-blue flex-1 flex items-center justify-center gap-2"
                    onClick={startTimer}
                    disabled={isRunning}
                  >
                    <Play size={14} /> START
                  </button>
                  <button 
                    className="btn-pixel flex-1 flex items-center justify-center gap-2 bg-white"
                    onClick={stopTimer}
                    disabled={!isRunning}
                  >
                    <Square size={14} /> STOP
                  </button>
                </div>
                <button 
                  className="btn-pixel btn-red w-full flex items-center justify-center gap-2"
                  onClick={resetTimer}
                >
                  <RotateCcw size={14} /> RESET
                </button>
              </div>
            </motion.section>
          )}

          {currentView === View.AUDIO && (
            <motion.section 
              key="audio"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="window max-w-lg w-full"
            >
              {renderHeaderWithBack("AUDIO.SYS", <Music size={12} />)}
              <div className="win-content">
                <select 
                  className="input-pixel bg-white" 
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                >
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                
                <div className="flex gap-4 mt-2">
                  <button className="btn-pixel btn-blue flex-1" onClick={previewAudio}>TEST SOUND</button>
                  <button 
                    className="btn-pixel btn-red flex-1" 
                    disabled={!tracks.find(t => t.id === selectedTrackId)?.isCustom}
                    onClick={removeCustomAudio}
                  >
                    DEL CUSTOM
                  </button>
                </div>
                
                <div className="mt-8 border-t-[4px] border-dashed border-black pt-5">
                  <span className="text-manga-red text-[8px] block mb-2 font-bold uppercase">UPLOAD MP3/WAV:</span>
                  <input 
                    type="file" 
                    className="input-pixel cursor-pointer text-[8px]" 
                    accept="audio/*"
                    onChange={handleAudioUpload}
                  />
                </div>
              </div>
            </motion.section>
          )}

          {currentView === View.TASK && (
            <motion.section 
              key="tasks"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="window max-w-lg w-full"
            >
              {renderHeaderWithBack("TASKS.LIST", <Save size={12} />)}
              <div className="win-content">
                <input 
                  type="text" 
                  className="input-pixel" 
                  placeholder="OBJECTIVE TITLE..." 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
                <textarea 
                  className="input-pixel h-24 mb-4" 
                  placeholder="MISSION DETAILS..." 
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                />
                <button className="btn-pixel btn-blue flex items-center justify-center gap-2" onClick={addTask}>
                  <Plus size={14} /> INITIALIZE TASK
                </button>

                <div className="mt-5 max-h-[300px] overflow-y-auto space-y-4 pr-1">
                  {tasks.map(t => (
                    <motion.div 
                      layout
                      key={t.id} 
                      className="border-[4px] border-black p-4 bg-white"
                    >
                      <div 
                        className="flex justify-between items-center cursor-pointer mb-2"
                        onClick={() => setOpenTaskId(openTaskId === t.id ? null : t.id)}
                      >
                        <span className="font-bold flex items-center gap-2">
                          {openTaskId === t.id ? '[-]' : '[+]'} {t.title}
                        </span>
                        <span className="text-[8px] text-manga-blue">{t.date}</span>
                      </div>
                      {openTaskId === t.id && (
                        <div className="border-t-[4px] border-black pt-4">
                          <textarea 
                            className="input-pixel h-20"
                            defaultValue={t.desc}
                            id={`task-edit-${t.id}`}
                          />
                          <div className="flex gap-4">
                            <button 
                              className="btn-pixel btn-green flex-1 text-[8px]"
                              onClick={() => {
                                const val = (document.getElementById(`task-edit-${t.id}`) as HTMLTextAreaElement).value;
                                updateTask(t.id, val);
                              }}
                            >
                              UPDATE
                            </button>
                            <button 
                              className="btn-pixel btn-red flex-1 text-[8px] flex items-center justify-center gap-1"
                              onClick={() => deleteTask(t.id)}
                            >
                              <Trash2 size={10} /> WIPE
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {currentView === View.AI && (
            <motion.section 
              key="ai"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="window max-w-lg w-full"
            >
              {renderHeaderWithBack("AI_COMM.LINK", <Send size={12} />)}
              <div className="win-content">
                <input 
                  type="password" 
                  className="input-pixel mb-4" 
                  placeholder="ENTER GEMINI API KEY..." 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <div className="h-48 overflow-y-auto border-[4px] border-black mb-4 p-4 bg-white space-y-4 select-text font-mono text-[8px]">
                  {chatLogs.length === 0 && (
                    <div className="text-manga-blue leading-relaxed">SYS: AI Core awaiting API Key. Get a free key at aistudio.google.com</div>
                  )}
                  {chatLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">
                      <strong className={log.sender === 'USER' ? 'text-manga-blue' : 'text-manga-red'}>{log.sender}:</strong> {log.msg}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <input 
                  type="text" 
                  className="input-pixel" 
                  placeholder="COMMAND GUARDIAN..." 
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendAiMessage()}
                />
                <button className="btn-pixel btn-green flex items-center justify-center gap-2" onClick={sendAiMessage}>
                  <Send size={14} /> TRANSMIT
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <PixelGuardian state={mascotState} speech={speech} />
    </div>
  );
}
