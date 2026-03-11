import React, { useState } from 'react';
import { Tense } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';
import { renderWithHints } from '../utils/wordHints';

interface QuizEngineProps {
  tense: Tense;
  onBack: () => void;
  onToDialogue: () => void;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({ tense, onBack, onToDialogue }) => {
  const { quiz } = tense;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answerResults, setAnswerResults] = useState<boolean[]>([]);

  const currentQuestion = quiz[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.length - 1;
  const correctCount = answerResults.filter(Boolean).length;
  const answeredCount = answerResults.length + (isAnswered ? 1 : 0);

  const handleOptionClick = (optionIndex: number) => {
    if (isAnswered) return;
    setSelectedOption(optionIndex);
    setIsAnswered(true);
    const correct = optionIndex === currentQuestion.correctIndex;
    setAnswerResults((prev) => [...prev, correct]);
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-600">Нет вопросов в квизе.</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{tense.name}</h2>
            <span className="text-sm text-gray-500">
              Вопрос {currentQuestionIndex + 1} из {quiz.length}
              {answeredCount > 0 && ` · Верно: ${correctCount} из ${answeredCount}`}
            </span>
          </div>
          <div className="p-6">
            <p className="text-lg text-gray-800 mb-2">{currentQuestion.russian}</p>
            <p className="text-sm text-gray-500 mb-4">Выберите правильный перевод (наведите на слово, чтобы увидеть перевод):</p>
            <div className="space-y-2">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = currentQuestion.correctIndex === idx;
                let style = 'w-full text-left p-3 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700';
                if (isAnswered) {
                  if (isCorrect) style = 'w-full text-left p-3 rounded-xl border-2 bg-green-50 border-green-500 text-green-800';
                  else if (isSelected) style = 'w-full text-left p-3 rounded-xl border-2 bg-red-50 border-red-300 text-red-800';
                  else style = 'w-full text-left p-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-400 opacity-75';
                } else if (isSelected) {
                  style = 'w-full text-left p-3 rounded-xl border-2 bg-indigo-50 border-indigo-500 text-indigo-800';
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleOptionClick(idx)}
                    disabled={isAnswered}
                    className={style}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{renderWithHints(option)}</span>
                      {isAnswered && (isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : isSelected ? <XCircle className="w-5 h-5 text-red-500" /> : null)}
                    </span>
                  </button>
                );
              })}
            </div>
            {isAnswered && (
              <div className="mt-6 flex justify-end gap-3">
                {!isLastQuestion ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Следующий вопрос
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onToDialogue}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                  >
                    К диалогу с AI
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
