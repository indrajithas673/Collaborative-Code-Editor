# Collab Code Editor

A production-ready collaborative code editor built to demonstrate advanced real-time synchronization, secure authentication, and complex data persistence. This project is ideal for pair programming, technical interviews, and showcasing full-stack engineering capabilities.

## 🌟 Features
- **Real-Time Collaboration**: Uses `yjs` (CRDTs) and `socket.io` for seamless, lock-free concurrent editing without conflicts.
- **Granular Role-Based Access Control (RBAC)**: Enforces `Owner`, `Editor`, and `Viewer` roles down to the WebSocket packet layer.
- **Secure Authentication**: End-to-end JWT protection (with bcrypt hashing) for REST APIs and Socket.IO handshakes.
- **MongoDB Persistence**: Autosaves Yjs binary state (`Uint8Array`) securely to MongoDB with an optimized 3-second debounce.
- **Presence & Awareness**: Displays real-time online collaborators with custom UI indicators.
- **Dynamic Rooms**: Instantly join distinct, isolated coding sessions based on unique Document IDs.

## 🏗️ Tech Stack
- **Frontend**: React 19, Vite, TailwindCSS v4, React Router DOM, Monaco Editor, Lucide React.
- **Backend**: Node.js, Express, Socket.IO, Mongoose, JsonWebToken.
- **Real-Time Sync**: Yjs, y-monaco, y-socket.io.
- **Database**: MongoDB.
- **DevOps**: Docker (Multi-stage builds).

## 📐 Architecture Overview
The application follows a decoupled client-server architecture:
1. **Client Layer**: A React SPA that renders the Monaco Editor. It binds the editor's model to a `Y.Doc` (Conflict-free Replicated Data Type) using `y-monaco`.
2. **WebSocket Layer**: `y-socket.io` handles the binary state synchronization across clients in real-time. The server intercepts incoming packets (`socket.use`) to strictly drop modification events from "Viewer" roles.
3. **Data Layer**: A MongoDB instance stores User metadata, Document relationships, and the raw encoded binary state of the Yjs documents. Upon reconnection, the backend loads this binary state from the DB and injects it into the active `Y.Doc` memory model before broadcasting to clients.

## 📁 Folder Structure
```text
collab-editor/
├── Backend/
│   ├── middleware/   # JWT and RBAC verification
│   ├── models/       # Mongoose schemas (User, Document)
│   ├── routes/       # REST endpoints (auth, documents)
│   └── server.js     # Express & Socket.IO initialization
├── Frontend/
│   ├── src/
│   │   ├── context/  # React Context (AuthContext)
│   │   ├── pages/    # Dashboard, Editor, Login, Register
│   │   └── main.jsx  # React Router setup
│   ├── index.html
│   └── vite.config.js
└── dockerfile        # Multi-stage build for full stack
```

## ⚙️ Local Setup

1. **Prerequisites**: Node.js (v20+) and MongoDB (Local or Atlas).
2. **Environment Variables**: Create a `.env` in the `Backend` directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/collab-editor
   JWT_SECRET=super_secret_jwt_key_here
   PORT=3000
   ```
3. **Install Dependencies**:
   ```bash
   cd Backend && npm install
   cd ../Frontend && npm install
   ```
4. **Run Servers**:
   - Backend: `npm run dev`
   - Frontend: `npm run dev`

## 🐳 Docker Setup
To run the entire application inside a single container:
```bash
docker build -t collab-editor .
docker run -p 3000:3000 -e MONGODB_URI=your_mongo_url -e JWT_SECRET=your_secret collab-editor
```

## ☁️ AWS Deployment Steps (General Guide)
1. Provision an **EC2 Instance** (Ubuntu).
2. Install Docker on the instance.
3. Use a managed database like **MongoDB Atlas** and obtain the URI string.
4. Clone the repository to your EC2 instance.
5. Run the docker container using the command above, mapping port 80 to 3000:
   `docker run -d -p 80:3000 -e MONGODB_URI="..." -e JWT_SECRET="..." collab-editor`

## 📡 API Endpoints
- `POST /api/auth/register` - Register a new user (Validates email & password length).
- `POST /api/auth/login` - Authenticate user and return JWT.
- `GET /api/documents` - Fetch all owned/shared documents (excludes binary state).
- `POST /api/documents` - Create a new document.
- `GET /api/documents/:id` - Fetch document metadata and verify access.
- `PUT /api/documents/:id` - Rename document (Requires Editor+).
- `DELETE /api/documents/:id` - Delete document (Requires Owner).
- `POST /api/documents/:id/share` - Share with another user by email.

---
> **Security Note**: This project currently uses `localStorage` for JWT management to simplify the demonstration workflow. In a production environment, JWTs should be migrated to **HTTP-Only, Secure cookies** to mitigate XSS vulnerabilities.
