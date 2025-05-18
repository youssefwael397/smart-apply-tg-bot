import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface JobSearchParams {
  query: string;
  num_pages?: number;
  date_posted?: 'today' | '3days' | 'week' | 'month' | 'year';
  job_type?: string;
  location?: string;
}

export interface JobListing {
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_country?: string;
  job_apply_link: string;
  job_description?: string;
  job_posted_at_timestamp?: number;
}

@Injectable()
export class JobsService {
  private readonly apiKey: string;
  private readonly apiHost = 'jsearch.p.rapidapi.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('RAPIDAPI_KEY');
    if (!apiKey) {
      throw new Error('RAPIDAPI_KEY is not defined in environment variables');
    }
    this.apiKey = apiKey;
  }

  async searchJobs(params: JobSearchParams): Promise<JobListing[]> {
    try {
      const queryParams: Record<string, string> = {
        query: params.query.trim(),
        page: '1',
        num_pages: (params.num_pages || 1).toString(),
      };

      // Add location to query if provided
      if (params.location) {
        queryParams.query = `${queryParams.query} in ${params.location}`.trim();
      }

      // Add date_posted if provided (must be one of the allowed values)
      const allowedDateValues = ['today', '3days', 'week', 'month', 'year'] as const;
      if (params.date_posted && allowedDateValues.includes(params.date_posted as any)) {
        queryParams.date_posted = params.date_posted;
      }

      // Add job_type if provided
      if (params.job_type) {
        queryParams.job_type = params.job_type;
      }

      const response = await firstValueFrom(
        this.httpService.get('https://jsearch.p.rapidapi.com/search', {
          params: queryParams,
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': this.apiHost,
          },
        }),
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Error searching for jobs:', error);
      return [];
    }
  }
}
