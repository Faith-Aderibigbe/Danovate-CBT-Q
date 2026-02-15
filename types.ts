
export interface QuestionOption {
  label: string; // A, B, C, D
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  correctAnswer: string; // "A", "B", "C", or "D"
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
}

export interface ExamMetadata {
  subject: string;
  topic: string;
  gradeLevel: string;
  examType: string;
}

export interface ExamSet {
  id: string;
  metadata: ExamMetadata;
  questions: Question[];
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
