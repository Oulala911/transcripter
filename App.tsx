
import React, { useState, useEffect, useCallback } from 'react';
import { 
  StructureType, 
  DetailLevel, 
  OutputStyle, 
  RenderingMode, 
  TranscriptionSettings,
  TranscriptionResult,
  TranscriptionProfile,
  StructureSection
} from './types';
import { transcribeAudio } from './services/geminiService';

const STORAGE_KEY = 'xcribe_profiles_v2';

const DEFAULT_PROFILES: TranscriptionProfile[] = [
  {
    id: 'def-1',
    name: 'Standaard Verslag',
    structure: StructureType.STRUCTURED,
    outputStyle: OutputStyle.PROFESSIONAL,
    detailLevel: DetailLevel.CLEANED
  },
  {
    id: 'def-2',
    name: 'Juridisch Protocol',
    structure: StructureType.CUSTOM,
    outputStyle: OutputStyle.BUSINESS,
    detailLevel: DetailLevel.LITERAL,
    sections: [
      { id: '1', title: 'Partijen', instruction: 'Wie zijn de aanwezigen en wat is hun rol?' },
      { id: '2', title: 'Feiten', instruction: 'Wat zijn de onbetwiste feiten die zijn besproken?' },
      { id: '3', title: 'Besluiten', instruction: 'Welke juridische bindende afspraken zijn gemaakt?' }
    ]
  }
];

const App: React.FC = () => {
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // App State
  const [step, setStep] = useState<number>(1);
  const [settings, setSettings] = useState<TranscriptionSettings>({
    structure: StructureType.WORD_FOR_WORD,
    detailLevel: DetailLevel.LITERAL,
    outputStyle: OutputStyle.RAW,
    language: 'Automatisch detecteren',
    renderingMode: RenderingMode.FAST,
    sections: []
  });
  
  const [profiles, setProfiles] = useState<TranscriptionProfile[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<TranscriptionProfile> | null>(null);
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setProfiles(JSON.parse(saved));
    } else {
      setProfiles(DEFAULT_PROFILES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROFILES));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === '1111' && password === '1111') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Onjuiste inloggegevens. Toegang geweigerd.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    reset();
  };

  const saveProfiles = (newProfiles: TranscriptionProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfiles));
  };

  const applyProfile = (profile: TranscriptionProfile) => {
    setSettings(prev => ({
      ...prev,
      structure: profile.structure,
      outputStyle: profile.outputStyle,
      detailLevel: profile.detailLevel,
      sections: profile.sections || []
    }));
  };

  const handleAddProfile = () => {
    setEditingProfile({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      structure: StructureType.STRUCTURED,
      outputStyle: OutputStyle.PROFESSIONAL,
      detailLevel: DetailLevel.CLEANED,
      sections: []
    });
  };

  const handleAddSection = () => {
    if (!editingProfile) return;
    const newSection: StructureSection = {
      id: Math.random().toString(36).substr(2, 5),
      title: '',
      instruction: ''
    };
    setEditingProfile({
      ...editingProfile,
      sections: [...(editingProfile.sections || []), newSection]
    });
  };

  const updateSection = (id: string, field: keyof StructureSection, value: string) => {
    if (!editingProfile?.sections) return;
    setEditingProfile({
      ...editingProfile,
      sections: editingProfile.sections.map(s => s.id === id ? { ...s, [field]: value } : s)
    });
  };

  const removeSection = (id: string) => {
    if (!editingProfile?.sections) return;
    setEditingProfile({
      ...editingProfile,
      sections: editingProfile.sections.filter(s => s.id !== id)
    });
  };

  const handleSaveProfile = () => {
    if (!editingProfile || !editingProfile.name) return;
    const newProfiles = [...profiles];
    const index = newProfiles.findIndex(p => p.id === editingProfile.id);
    if (index >= 0) {
      newProfiles[index] = editingProfile as TranscriptionProfile;
    } else {
      newProfiles.push(editingProfile as TranscriptionProfile);
    }
    saveProfiles(newProfiles);
    setEditingProfile(null);
  };

  const handleDeleteProfile = (id: string) => {
    saveProfiles(profiles.filter(p => p.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
      setError(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const startTranscription = async () => {
    if (!audioFile) {
      setError("Selecteer eerst een audiobestand.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setStep(3);
    try {
      const base64 = await fileToBase64(audioFile);
      const text = await transcribeAudio(base64, audioFile.type, settings);
      setResult({ text, timestamp: new Date().toLocaleString() });
      setStep(4);
    } catch (err: any) {
      setError(err.message || "Er is een onbekende fout opgetreden.");
      setStep(2);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTxt = () => {
    if (!result) return;
    const element = document.createElement("a");
    const file = new Blob([result.text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Xcribe_Transcriptie_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const reset = useCallback(() => {
    setStep(1);
    setAudioFile(null);
    setResult(null);
    setError(null);
  }, []);

  // Login View Component
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden font-inter">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-700">
           <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[2rem] text-white shadow-2xl shadow-blue-500/20 mb-6">
                 <i className="fas fa-wave-square text-3xl"></i>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">XCRIBE <span className="text-blue-500">CORE</span></h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] mt-2">Authenticated Access Only</p>
           </div>

           <form onSubmit={handleLogin} className="bg-white/5 border border-white/10 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl space-y-6">
              {loginError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold text-center animate-shake">
                   {loginError}
                </div>
              )}

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
                 <div className="relative">
                    <input 
                      type="text" 
                      className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                      placeholder="Enter ID"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                    <i className="fas fa-user absolute right-6 top-1/2 -translate-y-1/2 text-slate-700"></i>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                 <div className="relative">
                    <input 
                      type="password" 
                      className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                      placeholder="••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <i className="fas fa-lock absolute right-6 top-1/2 -translate-y-1/2 text-slate-700"></i>
                 </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.8rem] font-black uppercase tracking-[0.3em] shadow-xl shadow-blue-600/20 transition-all active:scale-95"
              >
                Enter Engine
              </button>
           </form>

           <div className="mt-10 text-center">
              <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.2em]">Protected by OPTRIX Security Protocol</p>
           </div>
        </div>
      </div>
    );
  }

  // Main App View
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-inter">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <i className="fas fa-wave-square text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase italic">XCRIBE <span className="text-blue-600">Transcriber</span></h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Powered by OPTRIX</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <button onClick={() => setShowProfileModal(true)} className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors flex items-center gap-2">
               <i className="fas fa-sliders text-sm"></i> <span className="hidden sm:inline font-bold">PROFIELEDITOR</span>
             </button>
             <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
               <i className="fas fa-sign-out-alt"></i>
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <i className="fas fa-exclamation-triangle"></i>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight uppercase">Stap 1: Stel je filters in</h2>
                <p className="text-slate-500">Bepaal hoe Xcribe jouw tekst moet vormgeven.</p>
              </div>
              <div className="w-full md:w-auto">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 block text-center md:text-left">Snelkeuze Templates</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-center md:justify-start">
                  {profiles.map(p => (
                    <button key={p.id} onClick={() => applyProfile(p)} className="whitespace-nowrap bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-sm">
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <i className="fas fa-cog text-8xl text-slate-900 rotate-12"></i>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-sitemap text-blue-500"></i> Transcriptiestructuur
                  </label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-medium appearance-none"
                    value={settings.structure}
                    onChange={(e) => setSettings({...settings, structure: e.target.value as StructureType})}
                  >
                    {Object.values(StructureType).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                {settings.sections && settings.sections.length > 0 && (
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 animate-in zoom-in-95 duration-300">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em] mb-3">Modulaire Opbouw:</p>
                    <div className="flex flex-wrap gap-2">
                      {settings.sections.map(s => (
                        <span key={s.id} className="bg-white px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 shadow-sm flex items-center gap-2">
                          <i className="fas fa-hashtag text-[10px] text-blue-300"></i> {s.title || 'Sectie'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-layer-group text-blue-500"></i> Detailniveau
                  </label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-medium appearance-none"
                    value={settings.detailLevel}
                    onChange={(e) => setSettings({...settings, detailLevel: e.target.value as DetailLevel})}
                  >
                    {Object.values(DetailLevel).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-paint-brush text-blue-500"></i> Outputstijl
                  </label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-medium appearance-none"
                    value={settings.outputStyle}
                    onChange={(e) => setSettings({...settings, outputStyle: e.target.value as OutputStyle})}
                  >
                    {Object.values(OutputStyle).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-globe text-blue-500"></i> Doeltaal
                  </label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-medium" value={settings.language} onChange={(e) => setSettings({...settings, language: e.target.value})} placeholder="Bijv. Nederlands" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-microchip text-blue-500"></i> Rendering Engine
                  </label>
                  <div className="flex bg-slate-100 p-1.5 rounded-[1.2rem] shadow-inner">
                    <button onClick={() => setSettings({...settings, renderingMode: RenderingMode.FAST})} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${settings.renderingMode === RenderingMode.FAST ? 'bg-white shadow-md text-blue-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}>FAST</button>
                    <button onClick={() => setSettings({...settings, renderingMode: RenderingMode.QUALITY})} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${settings.renderingMode === RenderingMode.QUALITY ? 'bg-white shadow-md text-blue-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}>HQ</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button onClick={() => setStep(2)} className="bg-slate-900 hover:bg-black text-white px-12 py-5 rounded-3xl font-black shadow-2xl transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center gap-3 uppercase tracking-widest">
                Bevestig Config <i className="fas fa-chevron-right text-blue-400"></i>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Stap 2: Upload & Start</h2>
            <p className="text-slate-500 mb-10 font-medium italic">De audio wordt verwerkt onder de geselecteerde voorwaarden.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
              {/* Upload Section */}
              <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 group relative">
                <input type="file" accept="audio/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className={`border-4 border-dashed rounded-3xl p-14 transition-all flex flex-col items-center justify-center min-h-[300px] ${audioFile ? 'border-blue-400 bg-blue-50' : 'border-slate-100 group-hover:border-blue-200 group-hover:bg-slate-50'}`}>
                  <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 transition-all shadow-xl ${audioFile ? 'bg-blue-600 text-white rotate-0' : 'bg-slate-50 text-slate-300 -rotate-12'}`}>
                    <i className={`fas ${audioFile ? 'fa-file-audio text-3xl' : 'fa-upload text-3xl'}`}></i>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{audioFile ? audioFile.name : 'Sleep audiobestand'}</p>
                  <p className="text-sm text-slate-400 font-bold mt-2 uppercase tracking-widest">{audioFile ? (audioFile.size / 1024 / 1024).toFixed(2) + ' MB' : 'Klik om te bladeren'}</p>
                  
                  {audioFile && (
                    <div className="mt-6 flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest animate-pulse">
                      <i className="fas fa-circle text-[8px]"></i> Ready for Xcribe Engine
                    </div>
                  )}
                </div>
              </div>

              {/* Review Panel */}
              <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl text-left flex flex-col justify-between border-t-8 border-blue-600 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                  <i className="fas fa-shield-halved text-9xl"></i>
                </div>
                <div>
                   <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] mb-10 border-b border-slate-800 pb-4">Actieve Filters</h3>
                   <ul className="space-y-6">
                     <li className="flex flex-col">
                       <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Structuur</span>
                       <span className="text-sm font-bold text-slate-200">{settings.structure}</span>
                     </li>
                     <li className="flex flex-col">
                       <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Detail</span>
                       <span className="text-sm font-bold text-slate-200">{settings.detailLevel}</span>
                     </li>
                     <li className="flex flex-col">
                       <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Stijl</span>
                       <span className="text-sm font-bold text-slate-200">{settings.outputStyle}</span>
                     </li>
                     <li className="flex flex-col">
                       <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Engine</span>
                       <span className="text-sm font-bold text-blue-400">{settings.renderingMode}</span>
                     </li>
                   </ul>
                </div>
                <div className="mt-10 pt-6 border-t border-slate-800 text-[10px] text-slate-600 font-black uppercase tracking-widest">
                   Xcribe v2.0 Protocol Active
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button 
                disabled={!audioFile} 
                onClick={startTranscription} 
                className={`px-16 py-6 rounded-[2.5rem] font-black shadow-2xl transition-all transform hover:-translate-y-2 active:translate-y-0 flex items-center justify-center gap-4 w-full sm:w-auto uppercase tracking-widest text-lg ${!audioFile ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
              >
                Start Transcriptie <i className="fas fa-bolt-lightning text-yellow-300"></i>
              </button>
              <button 
                onClick={() => setStep(1)} 
                className="px-12 py-6 bg-white border-2 border-slate-100 text-slate-600 rounded-[2.5rem] font-black hover:bg-slate-50 transition-all w-full sm:w-auto uppercase tracking-widest text-sm"
              >
                <i className="fas fa-arrow-left mr-2"></i> Terug naar Settings
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl mx-auto text-center py-32 animate-in fade-in zoom-in-95 duration-700">
            <div className="relative inline-block mb-12">
              <div className="w-32 h-32 border-8 border-blue-50 border-t-blue-600 rounded-[3rem] animate-spin mx-auto shadow-xl"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <i className="fas fa-wave-square text-blue-600 animate-pulse text-4xl"></i>
              </div>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Verwerken...</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs max-w-xs mx-auto leading-loose">Xcribe past de gekozen {settings.sections?.length || 0} secties en {settings.detailLevel.toLowerCase()} filters toe.</p>
            
            <div className="mt-16 h-2 w-full max-w-md mx-auto bg-slate-100 rounded-full overflow-hidden shadow-inner">
               <div className="h-full bg-blue-600 animate-[loading_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
               <div>
                  <div className="flex items-center gap-4 mb-3">
                    <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.3em] shadow-lg shadow-blue-200">Klaar</span>
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Transcriptie</h2>
                  </div>
                  <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Audio succesvol omgezet naar tekst • {result.timestamp}</p>
               </div>
               <div className="flex flex-wrap gap-4 w-full md:w-auto">
                 <button onClick={() => { navigator.clipboard.writeText(result.text); alert('Tekst gekopieerd!'); }} className="flex-1 md:flex-none bg-white border-2 border-slate-100 p-6 rounded-[2rem] hover:bg-slate-50 transition-all shadow-sm text-slate-600 flex items-center justify-center gap-2"><i className="fas fa-copy text-xl"></i> <span className="md:hidden font-black uppercase text-xs">Copy</span></button>
                 <button onClick={downloadTxt} className="flex-1 md:flex-none bg-white border-2 border-slate-100 p-6 rounded-[2rem] hover:bg-slate-50 transition-all shadow-sm text-blue-600 flex items-center justify-center gap-2"><i className="fas fa-download text-xl"></i> <span className="md:hidden font-black uppercase text-xs">Save</span></button>
                 <button onClick={reset} className="flex-[4] md:flex-none bg-slate-900 text-white px-12 py-6 rounded-[2rem] font-black shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 uppercase tracking-widest">Nieuwe scan <i className="fas fa-rotate"></i></button>
               </div>
            </div>
            
            <div className="bg-white p-14 md:p-20 rounded-[3.5rem] shadow-2xl border border-slate-100 relative group overflow-hidden min-h-[500px]">
              <div className="absolute top-0 left-0 w-3 h-full bg-blue-600 opacity-20"></div>
              <div className="whitespace-pre-wrap leading-[1.8] text-slate-700 text-xl font-light tracking-tight selection:bg-blue-600 selection:text-white">
                {result.text}
              </div>
              
              <div className="mt-20 pt-10 border-t border-slate-50 text-center opacity-30 pointer-events-none">
                 <i className="fas fa-wave-square text-5xl text-slate-200"></i>
              </div>
            </div>

            <div className="mt-16 text-center">
               <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.5em]">Gegenereerd door Xcribe – powered by OPTRIX | © 2026</p>
            </div>
          </div>
        )}
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-400">
             <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div>
                   <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Template Studio</h3>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">Personaliseer de Xcribe Engine</p>
                </div>
                <button onClick={() => { setShowProfileModal(false); setEditingProfile(null); }} className="w-16 h-16 rounded-[2rem] bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"><i className="fas fa-times text-2xl"></i></button>
             </div>
             
             <div className="flex-grow overflow-y-auto p-12 space-y-12 scrollbar-hide">
                {editingProfile ? (
                  <div className="space-y-12 animate-in slide-in-from-right-10 duration-500">
                    <div className="bg-blue-50/50 p-10 rounded-[3rem] border border-blue-100 relative">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Template Naam</label>
                          <input className="w-full p-5 bg-white border-2 border-blue-100 rounded-3xl font-bold focus:ring-8 focus:ring-blue-50 transition-all text-lg" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} placeholder="Bijv. Notulen v1" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Basis Type</label>
                          <select className="w-full p-5 bg-white border-2 border-blue-100 rounded-3xl font-bold appearance-none" value={editingProfile.structure} onChange={e => setEditingProfile({...editingProfile, structure: e.target.value as StructureType})}>
                             {Object.values(StructureType).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                          <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest flex items-center gap-3"><i className="fas fa-stream text-blue-600"></i> Structuur-blokken</h4>
                          <button onClick={handleAddSection} className="text-[10px] bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-black transition-all flex items-center gap-2 shadow-xl tracking-widest uppercase">Voeg Blok Toe</button>
                       </div>

                       {(!editingProfile.sections || editingProfile.sections.length === 0) ? (
                         <div className="text-center py-20 bg-slate-50 border-4 border-dashed border-slate-100 rounded-[3rem] text-slate-300 font-bold uppercase tracking-[0.3em] text-sm italic">Geen aangepaste blokken</div>
                       ) : (
                         <div className="grid grid-cols-1 gap-6">
                           {editingProfile.sections.map((s, idx) => (
                             <div key={s.id} className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 shadow-sm group hover:border-blue-400 transition-all relative">
                                <div className="flex gap-8 items-start">
                                   <div className="bg-slate-900 w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-1 shadow-2xl shadow-slate-300">{idx + 1}</div>
                                   <div className="flex-grow space-y-5">
                                      <input className="w-full font-black text-slate-900 border-none p-0 focus:ring-0 placeholder:text-slate-200 text-xl uppercase tracking-tight" value={s.title} onChange={e => updateSection(s.id, 'title', e.target.value)} placeholder="Titel van blok" />
                                      <textarea className="w-full text-sm text-slate-500 border-none p-0 focus:ring-0 placeholder:text-slate-300 resize-none h-20 font-medium leading-relaxed" value={s.instruction} onChange={e => updateSection(s.id, 'instruction', e.target.value)} placeholder="Instructie voor dit specifieke onderdeel..." />
                                   </div>
                                   <button onClick={() => removeSection(s.id)} className="w-12 h-12 rounded-[1.2rem] text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"><i className="fas fa-trash-can"></i></button>
                                </div>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>

                    <div className="flex gap-6 pt-10">
                      <button onClick={handleSaveProfile} className="flex-[3] bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest text-lg">Bewaar Template</button>
                      <button onClick={() => setEditingProfile(null)} className="flex-1 bg-white border-2 border-slate-100 text-slate-500 py-6 rounded-[2.5rem] font-black hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">Annuleer</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      {profiles.map(p => (
                        <div key={p.id} className="p-10 bg-white border-2 border-slate-50 rounded-[3rem] group hover:border-blue-600 transition-all shadow-xl shadow-slate-200/50 flex flex-col justify-between h-full relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-150 transition-all pointer-events-none">
                              <i className="fas fa-file-signature text-[10rem] text-slate-900"></i>
                           </div>
                           <div className="mb-10">
                              <div className="flex justify-between items-start mb-8">
                                 <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner shadow-slate-200"><i className="fas fa-microchip text-2xl"></i></div>
                                 <div className="flex gap-3">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingProfile(p); }} className="w-12 h-12 rounded-2xl text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center"><i className="fas fa-pencil-alt"></i></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id); }} className="w-12 h-12 rounded-2xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"><i className="fas fa-trash-can"></i></button>
                                 </div>
                              </div>
                              <h4 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tighter leading-tight">{p.name}</h4>
                              <div className="flex items-center gap-3 mt-4">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">{p.structure.split(' ')[0]}</span>
                                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest border border-blue-100 px-3 py-1 rounded-full">{p.sections?.length || 0} BLOKKEN</span>
                              </div>
                           </div>
                           <button onClick={() => { applyProfile(p); setShowProfileModal(false); }} className="w-full py-5 bg-slate-900 rounded-[1.8rem] text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-xl active:scale-95">Activeer Template</button>
                        </div>
                      ))}
                      <button onClick={handleAddProfile} className="p-10 border-8 border-dashed border-slate-50 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 text-slate-200 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all group min-h-[300px]">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-all shadow-inner">
                           <i className="fas fa-plus text-4xl"></i>
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-[0.4em]">Nieuw Sjabloon</span>
                      </button>
                    </div>
                  </div>
                )}
             </div>
             
             <div className="p-12 bg-slate-50/50 border-t border-slate-50 flex justify-center items-center">
                <button onClick={() => setShowProfileModal(false)} className="bg-slate-900 text-white px-28 py-6 rounded-[2.5rem] font-black uppercase tracking-[0.4em] hover:bg-black hover:scale-105 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] text-xs">Sluiten</button>
             </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-20 border-t border-slate-800 relative overflow-hidden">
        <div className="absolute -bottom-20 -left-20 opacity-5 pointer-events-none">
          <i className="fas fa-wave-square text-[20rem] text-white"></i>
        </div>
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
          <div className="flex flex-col items-center md:items-start space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-white font-black tracking-tighter text-3xl italic">XCRIBE</span>
              <span className="bg-blue-600 text-white text-[8px] font-black tracking-[0.4em] uppercase px-3 py-1 rounded-full">CORE 2.0</span>
            </div>
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">Developed by OPTRIX | AI-Driven Efficiency</p>
          </div>
          <div className="text-[10px] uppercase tracking-[0.6em] font-black text-slate-700 md:order-2">© 2026 Copyright Claim</div>
          <div className="flex space-x-12 text-[10px] font-black uppercase tracking-widest md:order-1">
            <a href="#" className="hover:text-blue-500 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        ::selection { background-color: #2563eb; color: #ffffff; }
      `}</style>
    </div>
  );
};

export default App;
