'use client';

import { useEffect, useRef, useState } from 'react';

interface Choice {
  text: string;
  isCorrect?: boolean;
}

type ChoiceInput = string | Choice;

interface Props {
  choices: ChoiceInput[];
  onChoose: (text: string, isCorrect?: boolean) => void;
  disabled?: boolean;
  resetKey?: string;
}

const CHOICE_DELAY_MS = 300;
const LONG_TEXT_THRESHOLD = 20;

const getChoiceText = (choice: ChoiceInput): string => (typeof choice === 'string' ? choice : choice.text ?? '');
const getChoiceCorrectness = (choice: ChoiceInput): boolean | undefined =>
  typeof choice === 'string' ? undefined : choice.isCorrect;

export default function LessonChoiceChips({ choices, onChoose, disabled = false, resetKey = '' }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelected(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSelect = (choice: ChoiceInput) => {
    if (disabled) return;
    const text = getChoiceText(choice);
    if (!text) return;
    setSelected(text);
    timeoutRef.current = setTimeout(() => {
      onChoose(text, getChoiceCorrectness(choice));
      timeoutRef.current = null;
    }, CHOICE_DELAY_MS);
  };

  const hasLongText = choices.some((choice) => getChoiceText(choice).length > LONG_TEXT_THRESHOLD);

  return (
    <div
      className={`
      ${hasLongText ? 'grid grid-cols-1 gap-2' : 'flex flex-wrap gap-2'} 
      justify-end px-3 py-2 animate-fade-in
    `}
    >
      {choices.map((choice, index) => {
        const choiceText = getChoiceText(choice);
        const isSelected = selected === choiceText;
        const isOtherSelected = selected && !isSelected;

        return (
          <button
            key={`${choiceText}-${index}`}
            disabled={disabled || !!selected}
            onClick={() => handleSelect(choice)}
            className={`
              ${hasLongText
                ? 'w-full text-left px-3 py-2.5 text-sm'
                : 'text-center px-3 py-1.5 text-xs sm:text-sm'
              }
              rounded-xl font-medium transition-all duration-200
              ${isSelected
                ? 'bg-blue-500 text-white shadow-md scale-[1.02]'
                : isOtherSelected
                  ? 'opacity-0 scale-95 pointer-events-none'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }
            `}
          >
            {choiceText}
          </button>
        );
      })}
    </div>
  );
}
