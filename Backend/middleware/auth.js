import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Document from '../models/Document.js';

export const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded; // { id, username, email }
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

export const verifyRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const documentId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return res.status(400).json({ message: 'Invalid document ID.' });
      }
      const document = await Document.findById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found.' });
      }

      req.document = document; // Attach document for subsequent routes

      // Owner has all permissions
      if (document.owner.toString() === req.user.id) {
        req.userRole = 'Owner';
        return next();
      }

      const collaborator = document.collaborators.find(
        (c) => c.user.toString() === req.user.id
      );

      if (!collaborator) {
        return res.status(403).json({ message: 'Access denied. You do not have permission for this document.' });
      }

      req.userRole = collaborator.role;

      if (!requiredRoles.includes(collaborator.role)) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Error verifying roles.', error: error.message });
    }
  };
};
