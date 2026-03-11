import React from 'react';
import { Tense } from '../types';
import { renderWithHints } from '../utils/wordHints';

interface TheoryViewProps {
  tense: Tense;
  onBack: () => void;
  onToQuiz: () => void;
  onToDialogue: () => void;
}

export const TheoryView: React.FC<TheoryViewProps> = ({ tense, onBack, onToQuiz, onToDialogue }) => {
  const { theory } = tense;
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          ← Назад
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 bg-indigo-50/50">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{tense.name}</h1>
          </div>
          <div className="p-4 md:p-6 space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Объяснение</h2>
              <p className="text-gray-800 whitespace-pre-line">{theory.explanation}</p>
            </section>
            {theory.markers.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Маркеры</h2>
                <p className="text-gray-700">{theory.markers.join(', ')}</p>
              </section>
            )}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Формула</h2>
              <ul className="space-y-1 text-gray-800 font-mono text-sm">
                <li>Утверждение: {theory.formula.positive}</li>
                <li>Отрицание: {theory.formula.negative}</li>
                <li>Вопрос: {theory.formula.question}</li>
              </ul>
            </section>
            {theory.examples.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Примеры</h2>
                <ul className="space-y-3">
                  {theory.examples.map((ex, i) => (
                    <li key={i} className="text-sm text-gray-700 border-l-2 border-indigo-200 pl-3">
                      <span className="font-medium text-gray-500">{ex.ru}</span>
                      <br />
                      <span className="text-gray-800">{renderWithHints(ex.positive)}</span>
                      <br />
                      <span className="text-gray-600">{renderWithHints(ex.negative)}</span>
                      <br />
                      <span className="text-gray-600">{renderWithHints(ex.question)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <div className="p-4 md:p-6 border-t border-gray-100 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onToQuiz}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Квиз
            </button>
            <button
              type="button"
              onClick={onToDialogue}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              К диалогу с AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
