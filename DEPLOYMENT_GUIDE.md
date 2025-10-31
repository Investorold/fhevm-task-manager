# Deployment Guide

## Deploy to Vercel

### 1. Import Project
1. Visit [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure settings:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Install Command**: `npm ci --include=dev`

### 2. Deploy
Click "Deploy" and wait for the build to complete.

### 3. Verify Headers
The `vercel.json` file configures required COOP/COEP headers for FHEVM:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-site" }
      ]
    }
  ]
}
```

Test in browser console:
```javascript
console.log(self.crossOriginIsolated) // should return true
```

## Local Production Build

```bash
cd frontend
npm run build
npm run preview
```





