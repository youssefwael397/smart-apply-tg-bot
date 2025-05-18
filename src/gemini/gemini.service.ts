import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Define the response type for the Gemini API
interface GenerateContentResponse {
  text: () => string;
  // Add other properties as needed
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-2.0-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeCV(cvText: string): Promise<string[]> {
    console.log("🚀 ~ GeminiService ~ analyzeCV ~ cvText:", cvText)
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
      });

      const prompt = `Analyze the following CV and suggest the top 5 most relevant job titles based on skills, experience, and qualifications. 
      
      IMPORTANT: Return ONLY a valid JSON array of exactly 5 job title strings. Do not include any other text, explanations, or formatting outside the JSON array.
      
      Example of expected format:
      ["Job Title 1", "Job Title 2", "Job Title 3", "Job Title 4", "Job Title 5"]
      
      CV to analyze:
      ${cvText}`;

      const result = await model.generateContent(prompt);
      const response = result.response as unknown as GenerateContentResponse;
      const text = response.text().trim();

      // Try to extract JSON array from the response if it's not a clean array
      let jsonString = text;
      const jsonMatch = text.match(/\[\s*\".*?\"\s*\]/s);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      // Parse the response
      const jobTitles = JSON.parse(jsonString) as string[];

      if (
        !Array.isArray(jobTitles) ||
        !jobTitles.every((title) => typeof title === 'string')
      ) {
        throw new Error('Invalid response format from Gemini API');
      }

      return jobTitles;
    } catch (error) {
      this.logger.error('Error analyzing CV with Gemini:', error);
      throw new Error('Failed to analyze CV with Gemini');
    }
  }
}
