export class User {
  constructor(
    public telegramId: number,
    public name?: string,
    public cvText?: string,
    public suggestedTitles: string[] = [],
    public preferredJobTitles: string[] = [],
    public location: string = 'Worldwide',
  ) {}
}
