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
  autoSelectText?: string | null;
  autoSelectNonce?: number;
}

const getChoiceText = (choice: ChoiceInput): string => (typeof choice === 'string' ? choice : choice.text ?? '');
const getChoiceCorrectness = (choice: ChoiceInput): boolean | undefined =>
  typeof choice === 'string' ? undefined : choice.isCorrect;

export default function LessonChoiceChips({
  choices,
  onChoose,
  disabled = false,
  resetKey = '',
  autoSelectText = null,
  autoSelectNonce = 0,
}: Props) {
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

  useEffect(() => {
    if (disabled || !autoSelectText) return;
    const matchedChoice = choices.find((choice) => getChoiceText(choice) === autoSelectText);
    if (!matchedChoice) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSelected(autoSelectText);
    onChoose(autoSelectText, getChoiceCorrectness(matchedChoice));
  }, [autoSelectNonce, autoSelectText, choices, disabled, onChoose]);

  const handleSelect = (choice: ChoiceInput) => {
    if (disabled) return;
    const text = getChoiceText(choice);
    if (!text) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSelected(text);
    onChoose(text, getChoiceCorrectness(choice));
  };

  return (
    <div className="flex w-full min-w-0 flex-wrap justify-end gap-2 px-3 py-2 animate-fade-in">
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
              max-w-full shrink-0 break-words px-3 py-1.5 text-left
              rounded-xl text-[15px] leading-[1.5] font-normal transition-all duration-200
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
