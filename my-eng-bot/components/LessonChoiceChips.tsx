'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { choiceChipTextsMatch } from '@/utils/validateAnswer';

interface Choice {
  text: string;
  isCorrect?: boolean;
}

type ChoiceInput = string | Choice;

interface Props {
  choices: ChoiceInput[];
  onChoose: (text: string, isCorrect?: boolean) => void;
  disabled?: boolean;
  /** Застывшая панель после верного ответа: без hover, приглушённые невыбранные чипсы. */
  frozen?: boolean;
  /** Увеличивается при новой ошибочной попытке — сброс выделения без remount. */
  clearSelectionSignal?: number;
  /** Текст неверно выбранного варианта — красная кнопка до повторного выбора. */
  wrongChoiceText?: string | null;
  resetKey?: string;
  autoSelectText?: string | null;
  autoSelectNonce?: number;
  /** Без bounce/fade при отложенном показе — иначе лента дёргается при снятии invisible. */
  suppressEnterAnimation?: boolean;
}

const getChoiceText = (choice: ChoiceInput): string => (typeof choice === 'string' ? choice : choice.text ?? '');
const getChoiceCorrectness = (choice: ChoiceInput): boolean | undefined =>
  typeof choice === 'string' ? undefined : choice.isCorrect;

export default function LessonChoiceChips({
  choices,
  onChoose,
  disabled = false,
  frozen = false,
  clearSelectionSignal = 0,
  wrongChoiceText = null,
  resetKey = '',
  autoSelectText = null,
  autoSelectNonce = 0,
  suppressEnterAnimation = false,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [allowEnterAnimation, setAllowEnterAnimation] = useState(true);
  const [chipEnterGeneration, setChipEnterGeneration] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFrozenRef = useRef(frozen);
  const prevSuppressRef = useRef(suppressEnterAnimation);
  const lastClearSelectionSignalRef = useRef(0);

  useLayoutEffect(() => {
    if (prevSuppressRef.current && !suppressEnterAnimation) {
      setChipEnterGeneration((generation) => generation + 1);
      setAllowEnterAnimation(true);
    }
    prevSuppressRef.current = suppressEnterAnimation;
  }, [suppressEnterAnimation]);

  useEffect(() => {
    setAllowEnterAnimation(true);
  }, [resetKey]);

  useEffect(() => {
    if (frozen) {
      setAllowEnterAnimation(false);
    }
  }, [frozen]);

  useEffect(() => {
    setSelected(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [resetKey]);

  const choicesSignature = choices.map((choice) => getChoiceText(choice)).join('\u0001');
  useEffect(() => {
    setSelected(null);
  }, [choicesSignature]);

  useEffect(() => {
    if (wrongChoiceText) return;
    setSelected(null);
  }, [wrongChoiceText]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!clearSelectionSignal || clearSelectionSignal === lastClearSelectionSignalRef.current) return;
    lastClearSelectionSignalRef.current = clearSelectionSignal;
    setSelected(null);
  }, [clearSelectionSignal]);

  useEffect(() => {
    if (prevFrozenRef.current && !frozen) {
      setSelected(null);
    }
    prevFrozenRef.current = frozen;
  }, [frozen]);

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

  const isFrozenPanel = frozen && disabled;
  const useEnterAnimation = allowEnterAnimation && !isFrozenPanel && !suppressEnterAnimation;

  return (
    <div
      key={chipEnterGeneration}
      className={`flex w-full min-w-0 flex-wrap justify-end gap-1.5 px-1.5 py-1.5 ${
        isFrozenPanel ? 'pointer-events-none saturate-[0.92]' : useEnterAnimation ? 'animate-fade-in' : ''
      }`}
    >
      {choices.map((choice, index) => {
        const choiceText = getChoiceText(choice);
        const isSelected = selected === choiceText;
        const isOtherSelected = selected && !isSelected;
        const wrongChoice = wrongChoiceText?.trim() ?? '';
        const isWrongHighlighted =
          wrongChoice !== '' && choiceChipTextsMatch(choiceText, wrongChoice);

        return (
          <button
            key={`${resetKey}-enter-${chipEnterGeneration}-slot-${index}`}
            disabled={disabled}
            onClick={() => handleSelect(choice)}
            style={{ animationDelay: `${index * 85}ms` }}
            className={`
              ${useEnterAnimation ? 'lesson-choice-chip-enter' : ''}
              max-w-full shrink-0 break-words px-3 py-1.5 text-left
              rounded-xl text-[15px] leading-[1.5] font-normal transition-all duration-200
              ${disabled && !frozen && !isWrongHighlighted ? 'opacity-90' : ''}
              ${isWrongHighlighted
                ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-sm scale-[1.02]'
                : isSelected
                ? 'bg-blue-500 text-white shadow-md scale-[1.02]'
                : isOtherSelected
                  ? isFrozenPanel
                    ? 'bg-blue-50/90 text-blue-700 border border-blue-200 opacity-50 cursor-not-allowed'
                    : 'bg-blue-50/90 text-blue-700 border border-blue-200 opacity-75'
                  : isFrozenPanel
                    ? 'bg-blue-50/90 text-blue-700 border border-blue-200 opacity-50 cursor-not-allowed'
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
