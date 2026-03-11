import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Tense } from '../types';

type View = 'list' | 'choice' | 'theory' | 'quiz' | 'dialogue';

interface FloatingMenuProps {
  selectedTense: Tense | null;
  onNavigate: (view: View) => void;
  onBackToChoice: () => void;
}

export function FloatingMenu({
  selectedTense,
  onNavigate,
  onBackToChoice,
}: FloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const goTo = (v: View) => {
    onNavigate(v);
    setIsOpen(false);
  };

  return (
    <>
      {/* Toggle button — three lines, fixed left */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-gray-700 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all duration-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Panel — slides in from left */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col rounded-r-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center border-b border-gray-100 pl-16 pr-4">
          <span className="text-sm font-semibold text-gray-500">Меню</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3 pt-4">
          <button
            type="button"
            onClick={() => goTo('list')}
            className="rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
          >
            Главная
          </button>
          {selectedTense && (
            <div className="mt-3 rounded-2xl bg-gray-50/80 p-2.5">
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Решения по временам
              </p>
              <p className="px-2 pt-0.5 text-xs text-gray-500">
                Текущее время: <span className="font-medium text-gray-700">{selectedTense.name}</span>
              </p>
              <div className="mt-2 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onBackToChoice();
                    setIsOpen(false);
                  }}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  Выбор времени
                </button>
                <button
                  type="button"
                  onClick={() => goTo('theory')}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  Теория
                </button>
                <button
                  type="button"
                  onClick={() => goTo('quiz')}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  Практика (квиз)
                </button>
                <button
                  type="button"
                  onClick={() => goTo('dialogue')}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  Диалог с AI
                </button>
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
