import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppConfig, Module, UserProgress, UserRole, Material, Stream, Lesson, HomeworkType, ArenaScenario, CalendarEvent, EventType, AIProviderId } from '../types';
import { AIService } from '../services/aiService';
import { Button } from './Button';
import { telegram } from '../services/telegramService';

// --- UI COMPONENTS ---
  
const InputGroup = ({ label, children, className = '' }: { label: string, children?: React.ReactNode, className?: string }) => (
    <div className={`space-y-1.5 w-full ${className}`}>
        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest pl-1">{label}</label>
        {children}
    </div>
);

const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        {...props} 
        className={`w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-[#6C5DD3] focus:bg-[#14161B] outline-none transition-all placeholder:text-white/20 ${props.className}`} 
    />
);

const StyledSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
        <select 
            {...props} 
            className={`w-full appearance-none bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-[#6C5DD3] focus:bg-[#14161B] outline-none transition-all ${props.className}`} 
        >
            {props.children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">▼</div>
    </div>
);

const StyledTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea 
        {...props} 
        className={`w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:border-[#6C5DD3] focus:bg-[#14161B] outline-none transition-all placeholder:text-white/20 resize-y min-h-[80px] custom-scrollbar ${props.className}`} 
    />
);

const SectionHeader = ({ title, action }: { title: string, action?: React.ReactNode }) => (
    <div className="flex justify-between items-end mb-6 border-b border-white/5 pb-4">
        <h3 className="text-xl font-black text-white">{title}</h3>
        {action}
    </div>
);

interface AdminDashboardProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  
  modules: Module[];
  onUpdateModules: (newModules: Module[]) => void;
  
  users: UserProgress[];
  onUpdateUsers: (newUsers: UserProgress[]) => void;

  currentUser: UserProgress;
  onUpdateCurrentUser: (user: Partial<UserProgress>) => void;
  
  materials: Material[];
  onUpdateMaterials: (m: Material[]) => void;
  
  streams: Stream[];
  onUpdateStreams: (s: Stream[]) => void;
  
  events: CalendarEvent[];
  onUpdateEvents: (e: CalendarEvent[]) => void;
  
  scenarios: ArenaScenario[];
  onUpdateScenarios: (s: ArenaScenario[]) => void;

  activeSubTab: 'OVERVIEW' | 'COURSE' | 'MATERIALS' | 'STREAMS' | 'USERS' | 'SETTINGS' | 'ARENA' | 'CALENDAR' | 'NEURAL_CORE' | 'DATABASE' | 'DEPLOY';
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  config, onUpdateConfig, 
  modules, onUpdateModules, 
  users, onUpdateUsers,
  currentUser, onUpdateCurrentUser,
  materials, onUpdateMaterials,
  streams, onUpdateStreams,
  events, onUpdateEvents,
  scenarios, onUpdateScenarios,
  activeSubTab, addToast
}) => {
  
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'UNKNOWN' | 'CONNECTING' | 'SUCCESS' | 'ERROR'>('UNKNOWN');
  const [editingLesson, setEditingLesson] = useState<{ mIdx: number; lIdx: number; data: Lesson } | null>(null);

  // --- HELPERS ---
  const updateAIConfig = (updates: Partial<typeof config.aiConfig>) => {
      const newConfig = { ...config, aiConfig: { ...config.aiConfig, ...updates } };
      onUpdateConfig(newConfig);
      AIService.updateConfig(newConfig.aiConfig);
      addToast('success', 'Настройки Ядра ИИ обновлены');
  };

  const updateAgentConfig = (updates: Partial<typeof config.systemAgent>) => {
      const newConfig = { ...config, systemAgent: { ...config.systemAgent, ...updates } };
      onUpdateConfig(newConfig);
      addToast('success', 'Агент системы перенастроен');
  };

  const getKeyName = (provider: string) => {
      if (provider === 'OPENAI_GPT4') return 'openai';
      if (provider === 'ANTHROPIC_CLAUDE') return 'anthropic';
      if (provider === 'GROQ') return 'groq';
      if (provider === 'OPENROUTER') return 'openrouter';
      return 'google';
  };

  const testSupabaseConnection = async () => {
    const url = config.integrations.supabaseUrl;
    const key = config.integrations.supabaseAnonKey;
    if (!url || !key) {
        addToast('error', 'Введите URL и Key');
        return;
    }
    setDbStatus('CONNECTING');
    try {
        const client = createClient(url, key);
        const { count, error } = await client.from('profiles').select('*', { count: 'exact', head: true });
        if (error) throw error;
        setDbStatus('SUCCESS');
        addToast('success', `Соединение установлено. Найдено записей: ${count || 0}`);
    } catch (e: any) {
        setDbStatus('ERROR');
        addToast('error', `Ошибка: ${e.message}`);
    }
  };

  // --- SUB-RENDERERS ---

  const renderOverview = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
            { label: 'Бойцов', val: users.length, icon: '👥', color: 'text-blue-400' },
            { label: 'Модулей', val: modules.length, icon: '📦', color: 'text-[#FFAB7B]' },
            { label: 'Сценариев', val: scenarios.length, icon: '⚔️', color: 'text-red-400' },
            { label: 'Событий', val: events.length, icon: '📅', color: 'text-green-400' },
        ].map((stat, i) => (
            <div key={i} className="glass-panel p-6 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group border border-white/5 bg-[#14161B]">
                <div className={`absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-125 transition-transform ${stat.color}`}>{stat.icon}</div>
                <span className="text-white/30 text-[9px] font-black uppercase mb-2 tracking-[0.2em]">{stat.label}</span>
                <span className="text-4xl font-black text-white">{stat.val}</span>
            </div>
        ))}
        <div className="col-span-2 glass-panel p-6 rounded-[2rem] border border-[#6C5DD3]/30 bg-[#14161B] relative overflow-hidden flex items-center justify-between">
            <div className="absolute inset-0 bg-gradient-to-r from-[#6C5DD3]/10 to-transparent"></div>
            <div>
                <span className="text-[#6C5DD3] text-[9px] font-black uppercase tracking-[0.2em] mb-2 block">System Watcher</span>
                <h3 className="text-2xl font-black text-white">{config.systemAgent.enabled ? 'ACTIVE' : 'DISABLED'}</h3>
                <p className="text-white/40 text-xs mt-1">{config.systemAgent.autoFix ? 'Auto-Repair Enabled' : 'Monitoring Only'}</p>
            </div>
            <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-xl ${config.systemAgent.enabled ? 'border-green-500 text-green-500 animate-pulse' : 'border-slate-700 text-slate-700'}`}>
                👁️
            </div>
        </div>
    </div>
  );

  const renderDatabase = () => (
    <div className="space-y-6 animate-slide-up">
        <div className="bg-[#14161B] border border-white/10 p-6 rounded-[2rem] relative overflow-hidden">
            <SectionHeader title="СУБД и Облако" />
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs leading-relaxed">
                Используется <strong>Supabase (PostgreSQL)</strong>. Введите учетные данные проекта ниже.
            </div>
            <div className="space-y-4 max-w-xl">
                <InputGroup label="Supabase Project URL">
                    <StyledInput placeholder="https://xyz.supabase.co" value={config.integrations.supabaseUrl || ''} onChange={e => onUpdateConfig({...config, integrations: {...config.integrations, supabaseUrl: e.target.value}})} />
                </InputGroup>
                <InputGroup label="Supabase Anon Key">
                    <StyledInput type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5..." value={config.integrations.supabaseAnonKey || ''} onChange={e => onUpdateConfig({...config, integrations: {...config.integrations, supabaseAnonKey: e.target.value}})} />
                </InputGroup>
            </div>
            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/5">
                <Button onClick={testSupabaseConnection} loading={dbStatus === 'CONNECTING'} variant={dbStatus === 'SUCCESS' ? 'primary' : dbStatus === 'ERROR' ? 'danger' : 'secondary'}>
                    {dbStatus === 'SUCCESS' ? '✓ Соединение активно' : dbStatus === 'ERROR' ? 'Ошибка подключения' : 'Проверить соединение'}
                </Button>
                {dbStatus === 'SUCCESS' && <span className="text-green-500 text-xs font-bold animate-fade-in">Готово к работе</span>}
            </div>
        </div>
        <div className="bg-[#14161B] border border-white/10 p-6 rounded-[2rem]">
            <SectionHeader title="Схема данных (SQL)" />
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-slate-300 overflow-x-auto">
                <pre>{`
-- Создание таблицы профилей
create table profiles (
  id uuid references auth.users on delete cascade,
  telegram_id text unique,
  username text,
  role text default 'STUDENT',
  xp bigint default 0,
  level int default 1,
  data jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (telegram_id)
);
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( true );
create policy "Users can update own profile." on profiles for update using ( true );`}</pre>
            </div>
        </div>
    </div>
  );

  const renderNeuralCore = () => (
    <div className="space-y-8 animate-slide-up">
        <div className="bg-[#14161B] border border-white/10 p-6 rounded-[2rem]">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">🧠 Основной Мозг</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                    { id: 'GOOGLE_GEMINI', name: 'Google Gemini', icon: '💎' },
                    { id: 'GROQ', name: 'Groq (Fast)', icon: '⚡' },
                    { id: 'OPENROUTER', name: 'OpenRouter', icon: '🌐' },
                    { id: 'OPENAI_GPT4', name: 'OpenAI GPT-4o', icon: '🟢' },
                    { id: 'ANTHROPIC_CLAUDE', name: 'Claude 3.5', icon: '🟠' }
                ].map((p) => (
                    <button key={p.id} onClick={() => updateAIConfig({ activeProvider: p.id as AIProviderId })} className={`relative p-5 rounded-2xl border text-left transition-all ${config.aiConfig.activeProvider === p.id ? 'bg-[#6C5DD3] border-[#6C5DD3] text-white' : 'bg-white/5 border-white/5 text-slate-300'}`}>
                        <span className="text-2xl mb-2 block">{p.icon}</span>
                        <div className="font-bold text-sm">{p.name}</div>
                    </button>
                ))}
            </div>
            <InputGroup label={`API Key для ${config.aiConfig.activeProvider}`}>
                <StyledInput type="password" value={config.aiConfig.apiKeys?.[getKeyName(config.aiConfig.activeProvider)] || ''} onChange={(e) => updateAIConfig({ apiKeys: { ...config.aiConfig.apiKeys, [getKeyName(config.aiConfig.activeProvider)]: e.target.value } })} />
            </InputGroup>
        </div>
    </div>
  );

  const renderDeploy = () => (
    <div className="space-y-6 animate-slide-up">
        <div className="bg-[#14161B] border border-white/10 p-6 rounded-[2rem]">
            <SectionHeader title="Deployment" />
            <div className="bg-black/40 border border-white/10 p-6 rounded-2xl">
                <h4 className="text-xl font-black text-white mb-2">Vercel Deployment</h4>
                <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-white text-black px-6 py-3 rounded-xl font-black uppercase text-xs">Deploy to Vercel</a>
            </div>
        </div>
    </div>
  );

  function renderGenericList<T extends { id: string, title: string }>(
      title: string,
      items: T[],
      onUpdate: (items: T[]) => void,
      newItemFactory: () => T,
      renderItem: (item: T, idx: number, update: (u: Partial<T>) => void) => React.ReactNode
  ) {
      const handleAdd = () => onUpdate([...items, newItemFactory()]);
      const handleDelete = (idx: number) => { if (confirm('Удалить?')) { const n = [...items]; n.splice(idx, 1); onUpdate(n); } };
      const handleUpd = (idx: number, u: Partial<T>) => { const n = [...items]; n[idx] = { ...n[idx], ...u }; onUpdate(n); };
      return (
          <div className="space-y-6">
              <SectionHeader title={title} action={<Button onClick={handleAdd} className="!py-2 !px-4 !text-xs">+ Добавить</Button>} />
              <div className="grid grid-cols-1 gap-4">
                  {items.map((item, idx) => (
                      <div key={item.id} className="glass-panel p-4 rounded-[1.5rem] border border-white/5 relative">
                          <button onClick={() => handleDelete(idx)} className="absolute top-4 right-4 w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">✕</button>
                          {renderItem(item, idx, (u) => handleUpd(idx, u))}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  const renderCourse = () => {
    const handleAddMod = () => onUpdateModules([...modules, { id: `m${Date.now()}`, title: 'Новый модуль', description: '', minLevel: 1, category: 'GENERAL', imageUrl: '', lessons: [] }]);
    const handleUpdMod = (idx: number, u: Partial<Module>) => { const n = [...modules]; n[idx] = { ...n[idx], ...u }; onUpdateModules(n); };
    const handleAddLesson = (idx: number) => {
        const nl: Lesson = { id: `l${Date.now()}`, title: 'Новый урок', description: '', content: '', xpReward: 100, homeworkType: 'TEXT', homeworkTask: '', aiGradingInstruction: '' };
        const n = [...modules]; n[idx].lessons.push(nl); onUpdateModules(n); setEditingLesson({ mIdx: idx, lIdx: n[idx].lessons.length - 1, data: nl });
    };
    return (
        <div className="space-y-6">
            <SectionHeader title="Курс" action={<Button onClick={handleAddMod} className="!py-2 !px-4 !text-xs">+ Модуль</Button>} />
            {modules.map((m, idx) => (
                <div key={m.id} className="glass-panel p-4 rounded-[1.5rem] border border-white/5">
                    <InputGroup label="Название"><StyledInput value={m.title} onChange={e => handleUpdMod(idx, { title: e.target.value })} /></InputGroup>
                    <button onClick={() => setExpandedModuleId(expandedModuleId === m.id ? null : m.id)} className="mt-2 text-xs text-[#6C5DD3] font-bold">
                        {expandedModuleId === m.id ? 'Скрыть уроки' : `Показать уроки (${m.lessons.length})`}
                    </button>
                    {expandedModuleId === m.id && (
                        <div className="mt-4 space-y-2 border-l-2 border-white/5 pl-4">
                            {m.lessons.map((l, lIdx) => (
                                <div key={l.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <span className="text-white text-xs">{l.title}</span>
                                    <button onClick={() => setEditingLesson({ mIdx: idx, lIdx, data: l })} className="text-xs text-[#6C5DD3]">Изменить</button>
                                </div>
                            ))}
                            <button onClick={() => handleAddLesson(idx)} className="text-[10px] uppercase font-black text-white/40">+ Добавить урок</button>
                        </div>
                    )}
                </div>
            ))}
            {editingLesson && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#1F2128] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-6">
                        <SectionHeader title="Редактор Урока" action={<button onClick={() => setEditingLesson(null)} className="text-white">✕</button>} />
                        <div className="space-y-4">
                            <InputGroup label="Название"><StyledInput value={editingLesson.data.title} onChange={e => setEditingLesson({...editingLesson, data: {...editingLesson.data, title: e.target.value}})} /></InputGroup>
                            <InputGroup label="Контент"><StyledTextarea value={editingLesson.data.content} onChange={e => setEditingLesson({...editingLesson, data: {...editingLesson.data, content: e.target.value}})} /></InputGroup>
                            <Button onClick={() => { const n = [...modules]; n[editingLesson.mIdx].lessons[editingLesson.lIdx] = editingLesson.data; onUpdateModules(n); setEditingLesson(null); }}>Сохранить</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderMaterials = () => renderGenericList('Материалы', materials, onUpdateMaterials, () => ({ id: `mat${Date.now()}`, title: 'Материал', description: '', type: 'LINK', url: '' }), (item, _, upd) => (
      <div className="space-y-2"><StyledInput value={item.title} onChange={e => upd({ title: e.target.value })} /><StyledInput value={item.url} onChange={e => upd({ url: e.target.value })} /></div>
  ));

  const renderStreams = () => renderGenericList('Эфиры', streams, onUpdateStreams, () => ({ id: `str${Date.now()}`, title: 'Эфир', date: new Date().toISOString(), status: 'UPCOMING', youtubeUrl: '' }), (item, _, upd) => (
      <div className="space-y-2"><StyledInput value={item.title} onChange={e => upd({ title: e.target.value })} /></div>
  ));

  const renderArena = () => renderGenericList('Арена', scenarios, onUpdateScenarios, () => ({ id: `scn${Date.now()}`, title: 'Бой', difficulty: 'Easy', clientRole: '', objective: '', initialMessage: '' }), (item, _, upd) => (
      <div className="space-y-2"><StyledInput value={item.title} onChange={e => upd({ title: e.target.value })} /></div>
  ));

  const renderCalendar = () => renderGenericList('План', events, onUpdateEvents, () => ({ id: `evt${Date.now()}`, title: 'Ивент', description: '', date: new Date().toISOString(), type: EventType.OTHER }), (item, _, upd) => (
      <div className="space-y-2"><StyledInput value={item.title} onChange={e => upd({ title: e.target.value })} /></div>
  ));

  const renderUsers = () => (
      <div className="space-y-6">
          <SectionHeader title="Пользователи" />
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead><tr className="text-white/40 text-[10px] uppercase border-b border-white/10"><th className="p-3">User</th><th className="p-3">Role</th></tr></thead>
                  <tbody>
                      {users.map((u, idx) => (
                          <tr key={idx} className="border-b border-white/5 text-sm text-white">
                              <td className="p-3 font-bold">{u.name}</td>
                              <td className="p-3">
                                  <select value={u.role} onChange={(e) => { const n = [...users]; n[idx] = { ...u, role: e.target.value as UserRole }; onUpdateUsers(n); }} className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 outline-none">
                                      <option value="STUDENT">Student</option><option value="CURATOR">Curator</option><option value="ADMIN">Admin</option>
                                  </select>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] pb-40 pt-16 px-4 md:px-6 overflow-y-auto custom-scrollbar">
        <div className="mb-8 text-center animate-slide-up">
            <h1 className="text-2xl font-black text-white uppercase">{activeSubTab.replace('_', ' ')}</h1>
            <p className="text-[#6C5DD3] text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">System Admin v4.5</p>
        </div>

        <div className="space-y-6">
            {activeSubTab === 'OVERVIEW' && renderOverview()}
            {activeSubTab === 'NEURAL_CORE' && renderNeuralCore()}
            {activeSubTab === 'COURSE' && renderCourse()}
            {activeSubTab === 'MATERIALS' && renderMaterials()}
            {activeSubTab === 'STREAMS' && renderStreams()}
            {activeSubTab === 'ARENA' && renderArena()}
            {activeSubTab === 'CALENDAR' && renderCalendar()}
            {activeSubTab === 'USERS' && renderUsers()}
            {activeSubTab === 'DATABASE' && renderDatabase()}
            {activeSubTab === 'DEPLOY' && renderDeploy()}
            
            {activeSubTab === 'SETTINGS' && (
                <div className="glass-panel p-6 rounded-[2rem] border border-white/5 space-y-6">
                    <SectionHeader title="Глобальные настройки" />
                    <InputGroup label="Название"><StyledInput value={config.appName} onChange={e => onUpdateConfig({...config, appName: e.target.value})} /></InputGroup>
                    <div className="pt-6 border-t border-white/5">
                        <SectionHeader title="Внешний вид" />
                        <div className="bg-[#14161B] p-6 rounded-[2.5rem] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner relative overflow-hidden group/icon">
                                    {currentUser.theme === 'DARK' ? '🌙' : '☀️'}
                                </div>
                                <div>
                                    <h4 className="font-black text-white text-lg tracking-tight">Тема интерфейса</h4>
                                </div>
                            </div>
                            <button onClick={() => onUpdateCurrentUser({ theme: currentUser.theme === 'DARK' ? 'LIGHT' : 'DARK' })} className={`relative w-28 h-12 rounded-full p-1 cursor-pointer transition-all border border-white/10 ${currentUser.theme === 'DARK' ? 'bg-[#0f172a]' : 'bg-[#4facfe]'}`}>
                                <div className={`relative w-10 h-10 rounded-full bg-white transition-transform ${currentUser.theme === 'DARK' ? 'translate-x-[4rem]' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};