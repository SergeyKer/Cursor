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
  const prevDisabledRef = useRef(disabled);

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
    // Когда проверка ответа завершилась, очищаем прошлый выбор,
    // чтобы на следующую попытку чипсы были "с нуля".
    if (prevDisabledRef.current && !disabled) {
      setSelected(null);
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

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
    <div className="flex w-full min-w-0 flex-wrap justify-end gap-1.5 px-1.5 py-1.5 animate-fade-in">
      {choices.map((choice, index) => {
        const choiceText = getChoiceText(choice);
        const isSelected = selected === choiceText;
        const isOtherSelected = selected && !isSelected;

        return (
          <button
            key={`${resetKey}-${choiceText}-${index}`}
            disabled={disabled}
            onClick={() => handleSelect(choice)}
            style={{ animationDelay: `${index * 85}ms` }}
            className={`
              lesson-choice-chip-enter
              max-w-full shrink-0 break-words px-3 py-1.5 text-left
              rounded-xl text-[15px] leading-[1.5] font-normal transition-all duration-200
              ${isSelected
                ? 'bg-blue-500 text-white shadow-md scale-[1.02]'
                : isOtherSelected
                  ? 'bg-blue-50/90 text-blue-700 border border-blue-200 opacity-75'
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
