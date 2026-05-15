# Expo Data GH WhatsApp Bot

## How to Deploy on Railway

### Step 1 — Add your auth_info folder
Copy your local `auth_info` folder into this project folder (same level as bot.js).

### Step 2 — Push to GitHub
1. Create a new repo on github.com
2. Open a terminal in this folder and run:
```
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/YOURREPO.git
git push -u origin main
```

### Step 3 — Deploy on Railway
1. Go to https://railway.app and sign in
2. Click **New Project → Deploy from GitHub repo**
3. Select your repo
4. Railway will auto-deploy your bot

### Step 4 — Add a Volume (to keep session alive)
1. In Railway, go to your service → **Volumes**
2. Click **Add Volume**
3. Set the mount path to `/app/auth_info`
4. Redeploy

### Step 5 — Check Logs
Click your service → **Logs** and you should see:
```
✅ Bot is connected and running!
```
