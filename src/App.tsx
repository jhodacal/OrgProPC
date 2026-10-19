import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HomeView } from './views/HomeView';
import { UniversityView } from './views/UniversityView';
import { ScheduleView } from './views/ScheduleView';
import { TasksView } from './views/TasksView';
import { FocusView } from './views/FocusView';
import { AIView } from './views/AIView';
import { SettingsView } from './views/SettingsView';
import StorageService from './services/StorageService';
import { THEMES } from './styles/theme';
import { RPGCosmetics } from './types';
import { SmartNoteFloatingEditor } from './components/SmartNoteFloatingEditor';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [cosmetics, setCosmetics] = useState<RPGCosmetics | null>(null);

  const loadData = async () => {
    const [uniTasks, cos] = await Promise.all([
      StorageService.getUniversityTasks(),
      StorageService.getRPGCosmetics()
    ]);
    const pending = uniTasks.filter(t => !t.completed).length;
    setPendingTasksCount(pending);
    setCosmetics(cos);
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.on('DATA_UPDATED', loadData);
    const unsubCos = StorageService.on('COSMETICS_UPDATED', loadData);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N -> go to tasks
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCurrentTab('tasks');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsub();
      unsubCos();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const equippedThemeName = cosmetics?.equippedTheme || 'Default';
  const themeObj = THEMES[equippedThemeName] || THEMES.Default;

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-white"
      style={{
        backgroundColor: themeObj.bg,
        backgroundImage: `radial-gradient(circle at 50% 0%, ${themeObj.accent}15 0%, transparent 60%)`
      }}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingTasksCount={pendingTasksCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          onOpenQuickTask={() => setCurrentTab('tasks')}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'home' && (
            <HomeView
              onNavigate={setCurrentTab}
              onOpenNewTask={() => setCurrentTab('tasks')}
            />
          )}
          {currentTab === 'university' && <UniversityView />}
          {currentTab === 'schedule' && <ScheduleView />}
          {currentTab === 'tasks' && <TasksView />}
          {currentTab === 'focus' && <FocusView />}
          {currentTab === 'ai' && <AIView />}
          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Floating Smart Note Quick Editor */}
      <SmartNoteFloatingEditor />
    </div>
  );
};

