# Deploy Backend to Vercel

## Steps:

1. **Go to Vercel**
   - Visit: https://vercel.com/new

2. **Import Backend Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repo: `Investorold/fhevm-task-manager`
   - Click "Import"

3. **Configure Settings**
   - **Project Name**: `fhevm-task-manager-backend` (or any name)
   - **Root Directory**: `backend` ⚠️ IMPORTANT!
   - **Framework Preset**: Other
   - **Build Command**: Leave empty (no build needed)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

4. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes

5. **Get Your Backend URL**
   - After deployment, you'll get a URL like:
     ```
     https://fhevm-task-manager-backend.vercel.app
     ```

6. **Update Frontend to Use Backend**
   - Go to your **frontend** Vercel project
   - Settings → Environment Variables
   - Add:
     ```
     VITE_BACKEND_URL=https://fhevm-task-manager-backend.vercel.app
     ```
   - Redeploy frontend

## Test Backend

Open in browser:
```
https://your-backend-url.vercel.app/health
```

Should return:
```json
{"status":"ok","message":"Backend is running"}
```

