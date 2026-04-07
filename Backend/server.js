import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { YSocketIO } from 'y-socket.io/dist/server';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';

import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import Document from './models/Document.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collab-editor')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    socket.user = decoded;

    // Optional: we can extract documentId (room name) from socket handshake query if passed
    const documentId = socket.handshake.query?.documentId;
    if (documentId) {
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return next(new Error('Invalid document ID'));
      }

      const document = await Document.findById(documentId);
      if (!document) {
        return next(new Error('Document not found'));
      }
      
      let hasAccess = false;
      if (document.owner.toString() === socket.user.id) {
        hasAccess = true;
      } else {
        const collab = document.collaborators.find(c => c.user.toString() === socket.user.id);
        if (collab) hasAccess = true;
      }

      if (!hasAccess) {
        return next(new Error('Access denied to this document'));
      }
      
      socket.documentId = documentId;
    }
    
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  if (socket.documentId) {
    socket.use(async (packet, next) => {
      const eventName = packet[0];
      // Intercept document update events sent by y-socket.io
      if (['sync-step-2', 'sync-update'].includes(eventName)) {
        try {
          const document = await Document.findById(socket.documentId);
          if (!document) return next(new Error('Document not found'));
          
          let hasEditAccess = false;
          if (document.owner.toString() === socket.user.id) {
            hasEditAccess = true;
          } else {
            const collab = document.collaborators.find(c => c.user.toString() === socket.user.id);
            if (collab && collab.role === 'Editor') {
              hasEditAccess = true;
            } else if (!collab) {
              // User was removed entirely! Boot them.
              socket.disconnect(true);
              return next(new Error('Access revoked'));
            }
          }
          
          if (!hasEditAccess) {
            return next(new Error('Viewers cannot modify the document'));
          }
        } catch (err) {
          return next(new Error('Permission check failed'));
        }
      }
      next();
    });
  }
});

const ySocketIO = new YSocketIO(io);
ySocketIO.initialize();

// Map to track debounce timers for saving
const saveTimers = new Map();

// Persistence Hooks
ySocketIO.on('document-loaded', async (doc) => {
  try {
    // doc.name is the documentId (room name)
    const documentId = doc.name;
    const document = await Document.findById(documentId);
    
    if (document && document.yjsState) {
      // Load binary state from MongoDB and apply to the Y.Doc
      Y.applyUpdate(doc, document.yjsState);
    }
  } catch (err) {
    console.error('Error loading document state:', err);
  }
});

ySocketIO.on('document-update', async (doc, update) => {
  const documentId = doc.name;
  
  // Clear previous timer for this document
  if (saveTimers.has(documentId)) {
    clearTimeout(saveTimers.get(documentId));
  }

  // Debounce save (3 seconds)
  const timerId = setTimeout(async () => {
    try {
      const state = Y.encodeStateAsUpdate(doc);
      
      // Update document in DB and optionally save a version snapshot periodically
      await Document.findByIdAndUpdate(documentId, { 
        yjsState: Buffer.from(state)
      });
      
      saveTimers.delete(documentId);
    } catch (err) {
      console.error('Error saving document state:', err);
    }
  }, 3000);

  saveTimers.set(documentId, timerId);
});

app.get('/health', (req, res) => {
  res.status(200).json({ message: 'ok', success: true });
});

// SPA Fallback for React Router (must be the last route)
app.use((req, res) => {
  res.sendFile(process.cwd() + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});