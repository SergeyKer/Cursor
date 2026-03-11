import { useState } from 'react';
import { Tense } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';
import { renderWithHints } from '../utils/wordHints';
import { explainAnswerWithAI } from '../services/openRouter';

interface DialogueViewProps {
  tense: Tense;
  onBack: () => void;
}

function normalizeAnswer(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

export function DialogueView({ tense, onBack }: DialogueViewProps) {
  const { quiz } = tense;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = quiz[currentIndex];
  const isLast = currentIndex === quiz.length - 1;
  const correctAnswer = current ? current.options[current.correctIndex] : '';

  const handleCheck = () => {
    if (!current) return;
    const normalized = normalizeAnswer(userInput);
    const expected = normalizeAnswer(correctAnswer);
    const correct = normalized === expected;
    setIsCorrect(correct);
    setIsChecked(true);
    setExplanation(null);
    setError(null);
  };

  const handleNext = () => {
    setCurrentIndex((i) => i + 1);
    setUserInput('');
    setIsChecked(false);
  };

  const handleExplainAi = async () => {
    if (!current) return;
    setIsExplaining(true);
    setError(null);
    try {
      const text = await explainAnswerWithAI({
        tenseName: tense.name,
        russian: current.russian,
        correctAnswer,
        userAnswer: userInput,
      });
      setExplanation(text);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Неизвестная ошибка при обращении к OpenRouter.';
      setError(message);
    } finally {
      setIsExplaining(false);
    }
  };

  if (!quiz.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-md text-center">
          <p className="text-gray-600 mb-4">Нет предложений для перевода.</p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-md text-center">
          <p className="text-gray-600 mb-4">Все предложения пройдены.</p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          ← Назад
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{tense.name}</h2>
          <p className="text-sm text-gray-500 mb-4">
            Предложение {currentIndex + 1} из {quiz.length}
          </p>

          <p className="text-gray-800 font-medium mb-3">Переведите на английский:</p>
          <p className="text-indigo-700 text-lg mb-4">«{current.russian}»</p>

          {!isChecked ? (
            <>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                placeholder="Введите перевод..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCheck}
                disabled={!userInput.trim()}
                className="mt-4 w-full px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Проверить
              </button>
            </>
          ) : (
            <>
              {isCorrect ? (
                <div className="flex items-center gap-2 text-emerald-700 mb-4">
                  <CheckCircle2 className="shrink-0 w-5 h-5" />
                  <span className="font-medium">Верно.</span>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-red-700 mb-2">
                    <XCircle className="shrink-0 w-5 h-5" />
                    <span className="font-medium">Неверно.</span>
                  </div>
                <p className="text-gray-700 text-sm">
                    Правильный вариант:{' '}
                    <strong className="text-gray-900">«{renderWithHints(correctAnswer)}»</strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleExplainAi}
                    disabled={isExplaining}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExplaining ? 'AI объясняет…' : 'Объяснить (AI)'}
                  </button>
                  {error && (
                    <p className="mt-2 text-xs text-red-600">
                      {error}
                    </p>
                  )}
                  {explanation && !error && (
                    <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-gray-800 text-left whitespace-pre-line">
                      {explanation}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                {isLast ? 'Завершить' : 'Следующее предложение'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
