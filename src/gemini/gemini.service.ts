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
  private readonly modelName = 'gemini-1.5-pro';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeCV(cvText: string): Promise<string[]> {
    console.log("🚀 ~ GeminiService ~ analyzeCV ~ cvText:", cvText)
    
    // Define models to try in order - prioritizing the latest Gemini 3.x Flash models
    const modelsToTry = [
      'gemini-3.1-flash-lite-preview', // User's currently selected version
      'gemini-3-flash-preview',      // Gemini 3.0 Flash
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest'
    ];

    let lastError: any;

    for (const modelName of modelsToTry) {
      try {
        this.logger.log(`Attempting to analyze CV using model: ${modelName}`);
        const model = this.genAI.getGenerativeModel({
          model: modelName,
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

        this.logger.log(`Successfully analyzed CV using model: ${modelName}`);
        return jobTitles;
      } catch (error: any) {
        this.logger.error(`Error with model ${modelName}:`, error);
        lastError = error;
        
        // If we hit a quota 0 limit, the api key is in a region that disables the free tier. There's no fallback that will work!
        if (error?.status === 429 && error?.message?.includes('limit: 0')) {
          this.logger.error('CRITICAL: Your API Key hit limit 0. This means the free tier is disabled for your Google Cloud account or region (e.g. EU/UK). You must set up a billing account to continue.');
        }
        
        // Continue to the next model
      }
    }

    this.logger.error('All fallback models failed. Last error:', lastError);
    if (lastError?.status === 429 && lastError?.message?.includes('limit: 0')) {
      throw new Error('API Quota Exceeded (Limit 0). This means the Free Tier is disabled for your API key (likely due to your region). Set up a Google Cloud Billing account.');
    }

    throw new Error('Failed to analyze CV with Gemini after trying multiple models');
  }
}
