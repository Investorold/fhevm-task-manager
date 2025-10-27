# Backend Setup for Task Manager

This backend provides **secure persistent storage** for your task data, ensuring data integrity and preventing tampering.

## Features

- ✅ **Encrypted Tasks**: Store metadata (title, dueDate, priority) with blockchain index
- ✅ **Plain Text Tasks**: Store entirely in backend (not on blockchain)
- ✅ **Data Persistence**: No data loss on browser refresh
- ✅ **Multi-User Support**: Each user's data is isolated by wallet address
- ✅ **Zama Compliant**: Encrypted tasks still on-chain, plain text in backend

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start Backend Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

The backend will run on `http://localhost:3001`

### 3. Configure Frontend

Add to your `.env` file in frontend:

```
REACT_APP_BACKEND_URL=http://localhost:3001
```

## API Endpoints

### Health Check
```
GET /health
```

### Get All Tasks for User
```
GET /api/tasks/:userAddress
```

### Save Task
```
POST /api/tasks/:userAddress
Body: { taskIndex: number, title: string, ... }
```

### Update Task
```
PUT /api/tasks/:userAddress/:taskIndex
```

### Delete Task
```
DELETE /api/tasks/:userAddress/:taskIndex
```

### Get Decrypted Tasks List
```
GET /api/decrypted/:userAddress
```

### Save Decrypted Tasks List
```
POST /api/decrypted/:userAddress
Body: { ids: [1, 2, 3] }
```

## Integration

The backend service (`backendService.ts`) is ready to use. You need to:

1. **Set user address** when wallet connects:
```typescript
backendService.setUserAddress(userAddress);
```

2. **Replace localStorage calls** with backend calls:
- `localStorage.setItem('userTaskData')` → `backendService.saveTask()`
- `localStorage.getItem('userTaskData')` → `backendService.getTasks()`
- `localStorage.setItem('decryptedTasks')` → `backendService.saveDecryptedTasks()`

## Deployment

### Local Development
```bash
cd backend
npm run dev
```

### Production (VPS)
```bash
cd backend
npm install
npm start
```

Or use PM2:
```bash
pm2 start server.js --name task-manager-backend
pm2 save
pm2 startup
```

## Data Storage

Tasks are stored in `tasks.json` file (can be migrated to PostgreSQL later).

Each user's data is keyed by their wallet address:
```json
{
  "0x123...": {
    "0": { "title": "Task 1", ... },
    "1": { "title": "Task 2", ... }
  }
}
```

## Security

✅ **No sensitive data stored** - Encrypted data stays on blockchain  
✅ **User isolation** - Each wallet address has separate data  
✅ **Tamper-proof** - Backend validates all requests  
✅ **CORS enabled** - Only frontend can access

