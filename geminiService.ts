
import { GoogleGenAI, Type } from "@google/genai";
import { ExamMetadata, Question } from "./types";

// The API_KEY is obtained exclusively from the environment variable process.env.API_KEY.
// We initialize GoogleGenAI inside functions to ensure the most up-to-date key is used.

export const generateExamQuestions = async (metadata: ExamMetadata, count: number): Promise<Question[]> => {
  // Always initialize GoogleGenAI right before the call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Generate ${count} high-quality multiple-choice questions for the following examination profile:
  Subject: ${metadata.subject}
  Topic: ${metadata.topic}
  Grade Level: ${metadata.gradeLevel}
  Exam Type: ${metadata.examType}
  
  Each question must be challenging, accurate, and suitable for a CBT (Computer Based Test) environment. 
  Ensure a mix of difficulty levels. Provide 4 options for each question (A, B, C, D).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 20000 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ["label", "text"]
              }
            },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            topic: { type: Type.STRING }
          },
          required: ["id", "text", "options", "correctAnswer", "explanation", "difficulty", "topic"]
        }
      }
    }
  });

  try {
    // Accessing response.text directly as it is a property.
    const questions = JSON.parse(response.text || "[]");
    return questions;
  } catch (error) {
    console.error("Failed to parse questions:", error);
    throw new Error("Could not generate valid question format. Please try again.");
  }
};

export const createQuestionChat = (systemInstruction: string) => {
  // Always initialize GoogleGenAI right before creating the chat
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: systemInstruction,
    },
  });
};
