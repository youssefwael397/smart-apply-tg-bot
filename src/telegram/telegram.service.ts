import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { join } from 'path';
import * as pdf from 'pdf-parse';
import * as fs from 'fs/promises';

const streamPipeline = promisify(pipeline);
import { User } from '../user/user.entity';
// Import the Telegram bot using require to avoid ES module issues
const TelegramBot = require('node-telegram-bot-api');
import { UserService } from '../user/user.service';
import { CvService } from '../cv/cv.service';
import { GeminiService } from '../gemini/gemini.service';
import { JobsService } from '../jobs/jobs.service';

type UserState = 'AWAITING_NAME' | 'AWAITING_CV' | 'AWAITING_CONFIRMATION' | 'AWAITING_LOCATION' | 'IDLE';

interface TelegramMessage {
  chat: {
    id: number;
  };
  text?: string;
  document?: {
    file_id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
  };
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
}

import { JobListing, JobSearchParams as JobsServiceSearchParams } from '../jobs/jobs.service';

interface JobSearchParams extends Omit<JobsServiceSearchParams, 'num_pages'> {
  page: number;
  numPages: number;
  location: string;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: any; // Temporarily using any to simplify
  private userStates: Map<number, UserState> = new Map();
  private isShuttingDown = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly cvService: CvService,
    private readonly geminiService: GeminiService,
    private readonly jobsService: JobsService,
    private readonly httpService: HttpService
  ) {
    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }
  }

  private async downloadFile(url: string, filePath: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { responseType: 'stream' })
      );
      const writer = createWriteStream(filePath);
      await streamPipeline(response.data, writer);
    } catch (error) {
      Logger.error(`Failed to download file from ${url}:`, error);
      throw new Error('Failed to download file');
    }
  }

  private async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      Logger.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  async init(): Promise<void> {
    if (this.bot) {
      try {
        // Stop any existing bot instance
        this.bot.stopPolling();
      } catch (e) {
        console.warn('Error stopping previous bot instance:', e);
      }
    }

    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
    }

    try {
      this.bot = new TelegramBot(token, { 
        polling: { 
          autoStart: false, // We'll start polling manually
          params: {
            timeout: 10 // Shorter timeout for faster reconnection
          }
        } 
      });
      
      // Set bot commands and description
      await this.bot.setMyCommands([
        { command: 'start', description: 'Start the bot and get started' },
        { command: 'uploadcv', description: 'Upload your CV for analysis' },
        { command: 'search', description: 'Search for jobs based on your CV' },
        { command: 'help', description: 'Show help information' }
      ]);
      
      // Set bot description
      await this.bot.setMyDescription(
        '🤖 Smart Apply Bot - Find your dream job based on your CV!\n\n' +
        'Developed by Youssef Wael 2025\n' +
        'For updates or suggestions, contact: +201010932484 (WhatsApp)'
      );
      
      this.setupMessageHandlers();
      
      // Start polling
      await this.bot.startPolling();
      console.log('🤖 Telegram bot is initialized and polling for messages...');
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
      throw error;
    }
  }

  async onModuleInit() {
    try {
      await this.init();
      
      // Handle graceful shutdown
      const shutdown = async () => {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        
        console.log('Shutting down Telegram bot...');
        try {
          if (this.bot) {
            await this.bot.stopPolling();
            console.log('Telegram bot stopped');
          }
        } catch (e) {
          console.error('Error during bot shutdown:', e);
        }
      };
      
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
      process.exit(1);
    }
  }

  private setupMessageHandlers() {
    // Start command
    this.bot.onText(/\/start/, async (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      this.userService.createOrUpdateUser(chatId, { name: msg.from?.first_name || 'User' });
      this.userStates.set(chatId, 'AWAITING_CV');
      
      const welcomeMessage = `👋 Hello ${msg.from?.first_name || 'there'}, and welcome to *Smart Apply Bot*!\n\n` +
            `This bot is designed to help you find the most relevant job opportunities based on your CV.\n` +
            `Here's what you can do:\n\n` +
            `/start - Start a new session\n` +
            `/upload_new_cv - Upload a new CV\n` +
            `/suggest_new_job_titles - Get AI-powered job title suggestions\n` +
            `/search_for_jobs - Discover job listings based on your profile\n` +
            `/update_location - Update your preferred job location\n\n` +
            `📄 To get started, please upload your CV (PDF or DOCX).\n\n` +
            `🔧 Developed with care by *Youssef Wael*.\n` +
            `📧 Email: youssefwael397@gmail.com\n` +
            `📞 Phone: +20 101 093 2484\n\n` +
            `💡 If you have any suggestions or need help, feel free to reach out!`;
      
      await this.bot.sendMessage(chatId, welcomeMessage);
    });

    // Upload new CV command
    this.bot.onText(/\/upload_new_cv/, async (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      const user = this.userService.getUser(chatId);
      if (!user) {
        this.userStates.set(chatId, 'AWAITING_NAME');
        return await this.bot.sendMessage(chatId, 'Please start with /start first');
      }
      this.userStates.set(chatId, 'AWAITING_CV');
      await this.bot.sendMessage(chatId, '📄 Please upload your CV (PDF or DOCX):');
    });

    // Handle document uploads
    this.bot.on('document', async (msg: TelegramMessage) => {
      if (!msg.document) return;
      
      const chatId = msg.chat.id;
      const document = msg.document;
      
      // Check if it's a PDF or DOCX
      const mimeType = document.mime_type || '';
      if (!mimeType.includes('pdf') && !mimeType.includes('document') && !document.file_name?.endsWith('.pdf') && !document.file_name?.endsWith('.docx')) {
        await this.bot.sendMessage(chatId, '❌ Please upload a PDF or DOCX file.');
        return;
      }
      
      try {
        await this.bot.sendChatAction(chatId, 'typing');
        
        // Get the file info
        const file = await this.bot.getFile(document.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${this.configService.get('TELEGRAM_BOT_TOKEN')}/${file.file_path}`;
        
        // Create temp directory if it doesn't exist
        const tempDir = join(process.cwd(), 'temp');
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }
        
        // Download the file
        const filePath = join(tempDir, `${chatId}_${document.file_name || 'cv'}`);
        await this.downloadFile(fileUrl, filePath);
        
        // Extract text from the document
        let cvText = '';
        if (mimeType.includes('pdf') || filePath.endsWith('.pdf')) {
          cvText = await this.extractTextFromPdf(filePath);
        } else {
          // TODO: Add support for DOCX files
          await this.bot.sendMessage(chatId, '❌ DOCX support is coming soon. Please upload a PDF file for now.');
          return;
        }
        
        // Update user data
        let user = this.userService.getUser(chatId) || new User(chatId);
        user.cvText = cvText;
        this.userService.createOrUpdateUser(chatId, user);
        
        // If we don't have a name, ask for it
        if (!user.name) {
          this.userStates.set(chatId, 'AWAITING_NAME');
          await this.bot.sendMessage(chatId, '📝 Please enter your full name:');
        } else {
          // Otherwise, analyze the CV and suggest job titles
          await this.analyzeCVAndSuggestTitles(chatId, user);
        }
        
      } catch (error) {
        Logger.error('Error processing document:', error);
        await this.bot.sendMessage(chatId, '❌ Error processing your CV. Please try again.');
        this.userStates.set(chatId, 'IDLE');
      }
    });

    // Handle text messages
    this.bot.on('text', async (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      const text = msg.text || '';
      const user = this.userService.getUser(chatId) || new User(chatId);
      const state = this.userStates.get(chatId) || 'IDLE';
      
      try {
        if (state === 'AWAITING_NAME' && text) {
          // Handle name input
          user.name = text.trim();
          this.userService.createOrUpdateUser(chatId, user);
          
          if (user.cvText) {
            // If we have CV text, analyze it
            await this.analyzeCVAndSuggestTitles(chatId, user);
          } else {
            // Otherwise, ask for CV
            this.userStates.set(chatId, 'AWAITING_CV');
            await this.bot.sendMessage(chatId, '📄 Please upload your CV (PDF or DOCX):');
          }
          
        } else if (state === 'AWAITING_CONFIRMATION' && text) {
          // Handle job title confirmation
          if (text.toLowerCase().includes('search') || text === '🔍 Search Jobs') {
            await this.handleJobSearch(chatId, user);
          } else if (text.toLowerCase().includes('analyze') || text === '🔄 Analyze Again') {
            this.userStates.set(chatId, 'AWAITING_CV');
            await this.bot.sendMessage(chatId, 'Please upload your CV again.');
          }
          
        } else if (state === 'AWAITING_LOCATION' && text) {
          // Handle location input
          user.location = text.trim();
          this.userService.createOrUpdateUser(chatId, user);
          this.userStates.set(chatId, 'IDLE');
          
          await this.bot.sendMessage(
            chatId,
            `📍 Location updated to: ${user.location}\n\n` +
            `Use /search_for_jobs to find jobs in this location.`
          );
          
        } else if (text.startsWith('/')) {
          // Ignore commands here, they're handled by other handlers
          return;
          
        } else if (state === 'IDLE') {
          // Handle other text messages when in IDLE state
          await this.bot.sendMessage(
            chatId,
            'I\'m not sure what you mean. Please use the commands or buttons to interact with me.'
          );
        }
        
      } catch (error) {
        Logger.error('Error handling message:', error);
        await this.bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
        this.userStates.set(chatId, 'IDLE');
      }
    });

    // Suggest new job titles command
    this.bot.onText(/\/suggest_new_job_titles/, async (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      const user = this.userService.getUser(chatId);
      
      if (!user || !user.cvText) {
        this.userStates.set(chatId, 'AWAITING_CV');
        return await this.bot.sendMessage(chatId, 'Please upload a CV first using /upload_new_cv');
      }
      
      try {
        await this.bot.sendMessage(chatId, '🤖 Analyzing your CV for new job title suggestions...');
        const jobTitles = await this.geminiService.analyzeCV(user.cvText);
        user.suggestedTitles = jobTitles;
        this.userService.createOrUpdateUser(chatId, user);
        
        const titlesText = jobTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');
        await this.bot.sendMessage(
          chatId,
          `💼 Here are your new job title suggestions:\n\n${titlesText}\n\n` +
          `Use /search_for_jobs to find jobs with these titles.`
        );
      } catch (error) {
        Logger.error('Error suggesting new job titles:', error);
        await this.bot.sendMessage(chatId, '❌ Error generating new job titles. Please try again.');
      }
    });

    // Search for jobs command
    this.bot.onText(/\/search_for_jobs/, async (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      const user = this.userService.getUser(chatId);
      
      if (!user) {
        this.userStates.set(chatId, 'AWAITING_NAME');
        return await this.bot.sendMessage(chatId, 'Please start with /start first');
      }
      
      if (!user.suggestedTitles?.length) {
        return await this.bot.sendMessage(
          chatId,
          'Please get job title suggestions first using /suggest_new_job_titles'
        );
      }
      
      await this.handleJobSearch(chatId, user);
    });

    // Update location command
    this.bot.onText(/\/update_location/, async (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      const user = this.userService.getUser(chatId) || new User(chatId);
      
      this.userStates.set(chatId, 'AWAITING_LOCATION');
      await this.bot.sendMessage(
        chatId,
        '📍 Please enter your preferred job location (e.g., "New York, NY" or "Remote"):'
      );
    });
  }

  private async analyzeCVAndSuggestTitles(chatId: number, user: User): Promise<void> {
    try {
      if (!user.cvText) {
        throw new Error('No CV text available for analysis');
      }

      await this.bot.sendChatAction(chatId, 'typing');
      
      // Get job title suggestions from the AI service
      const jobTitles = await this.geminiService.analyzeCV(user.cvText);
      user.suggestedTitles = jobTitles;
      this.userService.createOrUpdateUser(chatId, user);

      // Show suggestions with inline keyboard
      const titlesText = jobTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');
      
      await this.bot.sendMessage(
        chatId,
        `💼 Here are some job title suggestions based on your CV:\n\n${titlesText}\n\nWhat would you like to do next?`,
        {
          reply_markup: {
            keyboard: [
              [{ text: '🔍 Search Jobs' }],
              [{ text: '🔄 Analyze CV Again' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );

      this.userStates.set(chatId, 'AWAITING_CONFIRMATION');
    } catch (error) {
      Logger.error('Error analyzing CV:', error);
      await this.bot.sendMessage(chatId, '❌ Error analyzing your CV. Please try again.');
      this.userStates.set(chatId, 'IDLE');
    }
  }



  private async handleMessage(msg: TelegramMessage): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    const state = this.userStates.get(chatId) || 'IDLE';
    const user = this.userService.getUser(chatId);

    if (!user) {
      await this.bot.sendMessage(chatId, 'Please start with /start first');
      return;
    }

    if (state === 'AWAITING_NAME' && text) {
      // Handle name input
      user.name = text.trim();
      this.userService.createOrUpdateUser(chatId, user);
      
      if (user.cvText) {
        // If we have CV text, analyze it
        await this.analyzeCVAndSuggestTitles(chatId, user);
      } else {
        // Otherwise, ask for CV
        this.userStates.set(chatId, 'AWAITING_CV');
        await this.bot.sendMessage(chatId, '📄 Please upload your CV (PDF or DOCX):');
      }
    } else if (state === 'AWAITING_CONFIRMATION' && text) {
      // Handle job title confirmation
      if (text.toLowerCase().includes('search') || text === '🔍 Search Jobs') {
        await this.handleJobSearch(chatId, user);
      } else if (text.toLowerCase().includes('analyze') || text === '🔄 Analyze Again') {
        this.userStates.set(chatId, 'AWAITING_CV');
        await this.bot.sendMessage(chatId, 'Please upload your CV again.');
      }
    } else if (state === 'AWAITING_LOCATION' && text) {
      // Handle location input
      user.location = text.trim();
      this.userService.createOrUpdateUser(chatId, user);
      this.userStates.set(chatId, 'IDLE');
      
      await this.bot.sendMessage(
        chatId,
        `📍 Location updated to: ${user.location}\n\n` +
        `Use /search_for_jobs to find jobs in this location.`
      );
    } else if (text.startsWith('/')) {
      // Ignore commands here, they're handled by other handlers
      return;
    } else if (state === 'IDLE') {
      // Handle other text messages when in IDLE state
      await this.bot.sendMessage(
        chatId,
        'I\'m not sure what you mean. Please use the commands or buttons to interact with me.'
      );
    } 
  }

  private async handleConfirmation(chatId: number, response: string): Promise<void> {
    const user = this.userService.getUser(chatId);
    if (!user) {
      await this.bot.sendMessage(chatId, '❌ Session expired. Please start over with /start');
      this.userStates.set(chatId, 'IDLE');
      return;
    }

    const lowerResponse = response.toLowerCase().trim();
    
    if (lowerResponse === 'search jobs' || lowerResponse === '🔍 search jobs') {
      await this.handleJobSearch(chatId, user);
    } else if (lowerResponse === 'analyze cv again' || lowerResponse === '🔄 analyze cv again') {
      this.userStates.set(chatId, 'AWAITING_CV');
      await this.bot.sendMessage(
        chatId,
        '🔄 Please upload your CV again (PDF or DOCX)',
        {
          reply_markup: {
            remove_keyboard: true
          }
        }
      );
    } else if (lowerResponse === 'cancel' || lowerResponse === '❌ cancel') {
      await this.bot.sendMessage(
        chatId,
        'No problem! You can upload a new CV anytime or use /start to begin again.',
        {
          reply_markup: {
            remove_keyboard: true
          }
        }
      );
      this.userStates.set(chatId, 'IDLE');
    } else {
      await this.bot.sendMessage(
        chatId,
        'Please respond with "yes" to search for jobs or "no" to cancel.'
      );
    }
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-={}.!]/g, '\\$&');
  }

  private formatJobLink(url: string, text: string): string {
    // Escape markdown special characters in both URL and text
    const escapedUrl = this.escapeMarkdown(url);
    const escapedText = this.escapeMarkdown(text);
    return `[${escapedText}](${escapedUrl})`;
  }

  private async handleJobSearch(chatId: number, user: User): Promise<void> {
    if (!user.suggestedTitles?.length) {
      await this.bot.sendMessage(chatId, 'Please get job title suggestions first using /suggest_new_job_titles');
      return;
    }

    try {
      await this.bot.sendMessage(chatId, '🔍 Searching for jobs...');
      
      // Search for jobs with each title
      for (const title of user.suggestedTitles.slice(0, 3)) { // Limit to top 3 titles
        try {
          const jobs = await this.jobsService.searchJobs({
            query: title,
            num_pages: 1,
            date_posted: 'today',
            job_type: 'FULLTIME',
            location: user.location !== 'Worldwide' ? user.location : undefined
          });

          if (!jobs || !jobs.length) {
            await this.bot.sendMessage(
              chatId,
              `No jobs found for "${this.escapeMarkdown(title)}"${user.location ? ` in ${this.escapeMarkdown(user.location)}` : ''}. Try different search criteria.`,
              { parse_mode: 'Markdown' }
            );
            continue;
          }


          const jobsText = jobs
            .slice(0, 5) // Limit to top 5 jobs per title
            .map(job => {
              const jobTitle = job.job_title || 'Untitled Position';
              const company = job.employer_name || 'Unknown Company';
              const link = job.job_apply_link || 'No application link available';
              
              return `• ${this.escapeMarkdown(jobTitle)} at ${this.escapeMarkdown(company)}\n  ` +
                     (link.startsWith('http') ? this.formatJobLink(link, 'Apply Here') : link);
            })
            .join('\n\n');

          const message = `💼 Jobs for ${this.escapeMarkdown(title)}${user.location ? ` in ${this.escapeMarkdown(user.location)}` : ''}:\n\n${jobsText}`;
          
          await this.bot.sendMessage(
            chatId,
            message,
            { 
              parse_mode: 'MarkdownV2',
              disable_web_page_preview: true 
            }
          );
        } catch (error) {
          console.error(`Error searching for jobs with title "${title}":`, error);
          await this.bot.sendMessage(
            chatId,
            `❌ Failed to search for jobs with title "${title}". Please try again later.`
          );
        }
      }
    } catch (error) {
      console.error('Error in job search:', error);
      await this.bot.sendMessage(
        chatId,
        '❌ An error occurred while searching for jobs. Please try again later.'
      );
    } finally {
      this.userStates.set(chatId, 'IDLE');
    }
  }
}

