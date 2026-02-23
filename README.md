# JobSync - Job Search Assistant

## <a href="https://demo.jobsync.ca">Live Demo</a>

JobSync is a web app companion for managing your job search journey. This free and open-source project is designed to help job seekers efficiently track and organize their job applications. Say goodbye to the chaos of scattered information and hello to a streamlined, intuitive, and powerful job search experience running locally on your system.

Job searching can be overwhelming, with numerous applications to track and deadlines to meet. JobSeeker Assistant is here to simplify this process, allowing you to focus on big picture and keep track of your job search related activities. JobSync app platform empowers you with the tools you need to stay organized, informed, and proactive throughout your job search.

### Dashboard

![App Snapshot](./screenshots/jobsync-dashboard-screenshot.png?raw=true "App Snapshot Image")

### Jobs Applied list

![App Snapshot](./screenshots/jobsync-myjobs.png?raw=true "My Jobs Page Snapshot Image")

### AI Resume review

![JobSync AI Demo](./screenshots/jobsync-ai.gif)

### AI Job match

![JobSync AI Demo](./screenshots/jobsync-ai-jobmatch.gif)

## Key Features
- **Application Tracker:** Keep a detailed record of all your job applications, including company details, job titles, application dates, and current status.

- **Monitoring Dashboard:** Visualize your job search progress with an interactive dashboard that provides insights into your application activities, success rates, and upcoming tasks.

- **Resume Management:** Store and manage your resumes, and use it with AI to get reviews and match with job descriptions.

- **Task & Activity Management:** Manage tasks, track activites linked with tasks included with time tracking. 

- **AI Assistant:** Leverage the power of AI to improve your resumes and match with jobs. Get personalized job matching with scoring to identify the best opportunities tailored to your profile.


## Free to Use and Self-Hosted
JobSync Assistant is completely free to use and open source. It provides a powerful job search management tool at no cost and ensures that everyone has access to the resources they need. Additionally, JobSeeker Assistant is designed to be self-hosted, giving you full control over your data. By using Docker, you can easily set up and run JobSync Assistant on your own server, ensuring a secure and personalized experience.


## Quick Start

Make sure [Docker](https://www.docker.com) is installed and running, then:

```sh
git clone https://github.com/Gsync/jobsync.git
cd jobsync
docker compose up
```

Open [http://localhost:3000](http://localhost:3000) and create your account. That's it!

API keys for AI providers can be configured in **Settings** after signing in.

### Configuration (Optional)

Environment variables can be set in `docker-compose.yml`:

| Variable | Description |
|---|---|
| `TZ` | Your timezone (e.g. `America/Edmonton`). **Set this on remote servers** to avoid activity time shifts. |
| `AUTH_SECRET` | Auto-generated if not set. To set manually: `openssl rand -base64 32` |

### Updating

From the project directory, run the deploy script to pull the latest changes and rebuild:

```sh
curl -fsSL https://raw.githubusercontent.com/Gsync/jobsync/main/deploy.sh | sudo bash -s
```

### Credits

- <a href="https://github.com/facebook/react">React</a>
- <a href="https://github.com/vercel/next.js">Next</a>
- <a href="https://github.com/shadcn-ui/ui">Shadcn</a>
- <a href="https://github.com/prisma/prisma">Prisma</a>
- <a href="https://github.com/tailwindlabs/tailwindcss">Tailwind</a>
- <a href="https://github.com/ueberdosis/tiptap">Tiptap</a>
- <a href="https://github.com/plouc/nivo">Nivo</a>
- <a href="https://github.com/sqlite/sqlite">Sqlite</a>
- <a href="https://github.com/vercel/ai">Vercel AI-SDK</a>
- <a href="https://github.com/ollama/ollama">Ollama</a>

### AI Integration

#### Ollama (llama3.2)

Works with ollama https://ollama.com to review the resume.

Please make sure ollama is installed and running on the same system to use the resume review and job matching feature.

AI settings will show a list of available models based on what you have in Ollama, has been tested with llama3.2 and qwen 8B variant, please make sure it is downloaded and currently running.

***Note:*** It is recommended to increase the ollama context length from default 4k.

#### Deepseek

You must add your valid API key under settings, also please make sure deepseek provider and model is selected from the settings page, ollama is selected as the default provider.

### Note

- If you are updating from an old version and already logged in, please try logging out and login again.

