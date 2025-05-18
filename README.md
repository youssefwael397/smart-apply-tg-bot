# Smart Apply Bot

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@nestjs/core" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/@nestjs/core" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
  <a href="https://www.npmjs.com/package/@nestjs/core" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/core.svg" alt="NPM Downloads" /></a>
</p>

A Telegram bot that helps users find jobs based on their CV using AI analysis and job scraping.

## ✨ Features

- 📄 Upload and parse CVs (PDF/DOCX)
- 🤖 AI-powered job title suggestions using Google Gemini
- 🔍 Job search integration with LinkedIn Jobs via RapidAPI
- 💬 Interactive Telegram bot interface
- 📊 In-memory user session management

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Telegram Bot Token from [@BotFather](https://t.me/botfather)
- Google Gemini API Key
- RapidAPI Key for JSearch API

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/smart-apply-bot.git
   cd smart-apply-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   GEMINI_API_KEY=your_gemini_api_key_here
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```

### Running the Bot

1. Start the development server:
   ```bash
   npm run start:dev
   ```

2. For production:
   ```bash
   npm run build
   npm run start:prod
   ```

## 🤖 Bot Commands

- `/start` - Start the bot and begin the CV analysis process
- (More commands can be added as needed)

## 🏗 Project Structure

```
src/
├── telegram/           # Telegram bot handlers and service
├── user/              # User management
├── cv/                # CV parsing functionality
├── gemini/            # Google Gemini AI integration
├── jobs/              # Job search functionality
└── app.module.ts      # Main application module
```

## 📝 License

This project is [MIT licensed](LICENSE).

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - A progressive Node.js framework
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) - Telegram Bot API for NodeJS
- [Google Gemini](https://ai.google.dev/) - AI model for CV analysis
- [JSearch by RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) - Job search APIlds.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
