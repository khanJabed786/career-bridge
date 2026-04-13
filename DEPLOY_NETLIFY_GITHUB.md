# Deploy Career Bridge on Netlify (GitHub Auto-Deploy)

## 1) Initialize Git (already done by assistant if successful)
If not done, run:

```powershell
git init
git add .
git commit -m "Initial commit"
```

## 2) Create a GitHub repository
1. Open https://github.com/new
2. Repository name: `career-bridge`
3. Keep it Public or Private (your choice)
4. Click Create repository

## 3) Push local project to GitHub
Copy and run the commands shown by GitHub after repo creation, for example:

```powershell
git branch -M main
git remote add origin https://github.com/<your-username>/career-bridge.git
git push -u origin main
```

## 4) Connect to Netlify
1. Open https://app.netlify.com/
2. Click Add new site -> Import an existing project
3. Choose GitHub and authorize
4. Select your `career-bridge` repo

## 5) Build settings
- Build command: `echo Static site - no build required`
- Publish directory: `.`

`netlify.toml` is already configured in this project.

## 6) Deploy
Click Deploy site.

## 7) Future updates
Every push to `main` branch auto-deploys on Netlify.

```powershell
git add .
git commit -m "Your update"
git push
```
