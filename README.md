# JobSync - Job Search Assistant

## <a href="https://demo.jobsync.ca">Live Demo</a>

JobSync is a web app companion for managing your job search journey. This free and open-source project is designed to help job seekers efficiently track and organize their job applications. Say goodbye to the chaos of scattered information and hello to a streamlined, intuitive, and powerful job search experience.

Job searching can be overwhelming, with numerous applications to track and deadlines to meet. JobSeeker Assistant is here to simplify this process, allowing you to focus on what really matters: landing your job. JobSync app platform empowers you with the tools you need to stay organized, informed, and proactive throughout your job search.

![App Snapshot](./screenshots/jobsync-dashboard-screenshot.png?raw=true "App Snapshot Image")

## Key Features
- **Application Tracker:** Keep a detailed record of all your job applications, including company details, job titles, application dates, and current status.

- **Activity Monitoring Dashboard:** Visualize your job search progress with an interactive dashboard that provides insights into your application activities, success rates, and upcoming tasks.

- **Document Management (Coming Soon!):** Store and manage your resumes, cover letters, and other application-related documents in one convenient place.

- **AI Assistant (Coming Soon!):** Leverage the power of AI to improve your resumes and cover letters. Get personalized job matching with scoring to identify the best opportunities tailored to your profile.


## Free to Use and Self-Hosted
JobSync Assistant is completely free to use and open source. Our commitment to providing a powerful job search management tool at no cost ensures that everyone has access to the resources they need. Additionally, JobSeeker Assistant is designed to be self-hosted, giving you full control over your data. By using Docker, you can easily set up and run JobSync Assistant on your own server, ensuring a secure and personalized experience.


## Installation

### Using Docker

#### Step 1 - Clone repo
* **Alternativey you can also download the source code using download link**

```sh
git clone https://github.com/Gsync/jobsync.git
```

#### Step 2 (Optional) - Change environment variables
* **Alternativey you can also download the source code using download link**
  
#### 2.1 Generate auth secret (Optional) 

These methods will generate a random string that you can use as your AUTH_SECRET. Make sure to set this in your environment variables:

For example, add it to your .env local file:

```sh
AUTH_SECRET="your_generated_secret"
```

##### For npm

```sh
    npm exec auth secret
```
OR
```sh
    npx auth secret
```

##### Using the openssl command available on Linux and Mac OS X:

```sh
    openssl rand -base64 33
```

#### 2.2 Change username and password (Optional) 

You can use default username (admin@example) and password (password123) or change it in the Dockerfile

#### Step 3 - Build docker image and run container
* **Please make sure you have <a href="https://www.docker.com">docker</a> installed, you dont need to know docker to be able to run the following command**
* Please make sure you are in the root folder in your terminal

```sh
docker compose up
```

#### Step 4 - Access the app
* **Open [http://localhost:3000](http://localhost:3000) with your browser to access the app.**
* If you encounter port conflicts, please change it in the docker file

### Thanks to the following libraries to make it easy to build apps

- <a href="https://github.com/facebook/react">React</a>
- <a href="https://github.com/vercel/next.js">Next</a>
- <a href="https://github.com/shadcn-ui/ui">Shadcn</a>
- <a href="https://github.com/prisma/prisma">Prisma</a>
- <a href="https://github.com/tailwindlabs/tailwindcss">Tailwind</a>
- <a href="https://github.com/ueberdosis/tiptap">Tiptap</a>
- <a href="https://github.com/plouc/nivo">Nivo</a>
- <a href="https://github.com/sqlite/sqlite">Sqlite</a>
