export interface QuizQuestion {
  id: string;
  russian: string;
  options: string[];
  correctIndex: number;
}

export interface Theory {
  explanation: string;
  markers: string[];
  formula: {
    positive: string;
    negative: string;
    question: string;
  };
  examples: {
    positive: string;
    negative: string;
    question: string;
    ru: string;
  }[];
}

export interface Tense {
  id: string;
  name: string;
  order: number;
  theory: Theory;
  quiz: QuizQuestion[];
}
