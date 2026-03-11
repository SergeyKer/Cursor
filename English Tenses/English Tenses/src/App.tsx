import { useState, type ReactNode } from 'react';
import { tensesData } from './data/tenses';
import { Tense } from './types';
import { TheoryView } from './components/TheoryView';
import { QuizEngine } from './components/QuizEngine';
import { DialogueView } from './components/DialogueView';
import { FloatingMenu } from './components/FloatingMenu';

type View = 'list' | 'choice' | 'theory' | 'quiz' | 'dialogue';

function App() {
  const [view, setView] = useState<View>('list');
  const [selectedTense, setSelectedTense] = useState<Tense | null>(null);

  const openTense = (tense: Tense) => {
    setSelectedTense(tense);
    setView('choice');
  };

  const backToList = () => {
    setSelectedTense(null);
    setView('list');
  };

  const backToChoice = () => {
    setView('choice');
  };

  const handleMenuNavigate = (v: View) => {
    if (v === 'list') backToList();
    else setView(v);
  };

  let content: ReactNode = null;

  if (view === 'list') {
    content = (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">English Tenses</h1>
          <div className="space-y-3">
            {tensesData.map((tense) => (
              <button
                key={tense.id}
                type="button"
                onClick={() => openTense(tense)}
                className="w-full text-left p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <span className="font-semibold text-gray-900">{tense.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  } else if (view === 'choice' && selectedTense) {
    content = (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={backToList}
            className="mb-4 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            ← Назад
          </button>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedTense.name}</h2>
            <p className="text-gray-600 text-sm mb-6">Выберите режим:</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setView('theory')}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                Теория
              </button>
              <button
                type="button"
                onClick={() => setView('quiz')}
                className="w-full px-4 py-3 bg-indigo-100 text-indigo-800 rounded-xl text-sm font-medium hover:bg-indigo-200"
              >
                Квиз
              </button>
              <button
                type="button"
                onClick={() => setView('dialogue')}
                className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
              >
                К диалогу с AI
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (view === 'theory' && selectedTense) {
    content = (
      <TheoryView
        tense={selectedTense}
        onBack={backToChoice}
        onToQuiz={() => setView('quiz')}
        onToDialogue={() => setView('dialogue')}
      />
    );
  } else if (view === 'quiz' && selectedTense) {
    content = (
      <QuizEngine
        tense={selectedTense}
        onBack={backToChoice}
        onToDialogue={() => setView('dialogue')}
      />
    );
  } else if (view === 'dialogue') {
    if (selectedTense) {
      content = <DialogueView tense={selectedTense} onBack={backToChoice} />;
    } else {
      content = (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md text-center">
            <p className="text-gray-600 text-sm mb-4">Выберите время из списка.</p>
            <button
              type="button"
              onClick={backToList}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Назад к списку
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <>
      <FloatingMenu
        selectedTense={selectedTense}
        onNavigate={handleMenuNavigate}
        onBackToChoice={backToChoice}
      />
      {content}
    </>
  );
}

export default App;
