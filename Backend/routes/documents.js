import express from 'express';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { verifyToken, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get all documents for a user (owned and shared)
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await Document.find({
      $or: [
        { owner: userId },
        { 'collaborators.user': userId }
      ]
    })
    .select('-yjsState -versions') // Don't send heavy binary data in list view
    .populate('owner', 'username email')
    .sort({ updatedAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents.', error: error.message });
  }
});

// Create a new document
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    const document = new Document({
      title: title || 'Untitled Document',
      owner: req.user.id,
    });
    
    await document.save();
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: 'Error creating document.', error: error.message });
  }
});

// Get a specific document
router.get('/:id', verifyToken, verifyRole(['Editor', 'Viewer']), async (req, res) => {
  try {
    // req.document is populated by verifyRole
    await req.document.populate('owner', 'username email');
    await req.document.populate('collaborators.user', 'username email');
    await req.document.populate('versions.createdBy', 'username');
    
    // Convert Buffer to base64 if it exists so we can send it over JSON if needed,
    // though the actual sync will happen via websocket. We just return metadata.
    const docMeta = req.document.toObject();
    delete docMeta.yjsState; // Let websocket handle the actual binary state
    docMeta.userRole = req.userRole; // Pass role to frontend
    
    res.json(docMeta);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching document.', error: error.message });
  }
});

// Delete a document
router.delete('/:id', verifyToken, verifyRole([]), async (req, res) => {
  try {
    if (req.userRole !== 'Owner') {
      return res.status(403).json({ message: 'Only the owner can delete the document.' });
    }
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document.', error: error.message });
  }
});

// Rename a document
router.put('/:id', verifyToken, verifyRole(['Editor']), async (req, res) => {
  try {
    req.document.title = req.body.title || req.document.title;
    await req.document.save();
    res.json({ message: 'Document renamed successfully.', title: req.document.title });
  } catch (error) {
    res.status(500).json({ message: 'Error renaming document.', error: error.message });
  }
});

// Share document via email
router.post('/:id/share', verifyToken, verifyRole([]), async (req, res) => {
  try {
    if (req.userRole !== 'Owner') {
      return res.status(403).json({ message: 'Only the owner can share the document.' });
    }

    const { email, role } = req.body;
    if (!['Editor', 'Viewer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const userToShare = await User.findOne({ email: email.toLowerCase() });
    if (!userToShare) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (userToShare._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot share the document with yourself.' });
    }

    const existingCollabIndex = req.document.collaborators.findIndex(
      (c) => c.user.toString() === userToShare._id.toString()
    );

    if (existingCollabIndex > -1) {
      req.document.collaborators[existingCollabIndex].role = role;
    } else {
      req.document.collaborators.push({ user: userToShare._id, role });
    }

    await req.document.save();
    res.json({ message: 'Document shared successfully.', collaborators: req.document.collaborators });
  } catch (error) {
    res.status(500).json({ message: 'Error sharing document.', error: error.message });
  }
});

// Remove collaborator
router.delete('/:id/share/:userId', verifyToken, verifyRole([]), async (req, res) => {
  try {
    if (req.userRole !== 'Owner') {
      return res.status(403).json({ message: 'Only the owner can remove collaborators.' });
    }

    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'You cannot remove yourself as the owner.' });
    }

    const initialLength = req.document.collaborators.length;
    req.document.collaborators = req.document.collaborators.filter(
      (c) => c.user.toString() !== userId
    );

    if (req.document.collaborators.length === initialLength) {
      return res.status(404).json({ message: 'Collaborator not found on this document.' });
    }

    await req.document.save();
    res.json({ message: 'Collaborator removed successfully.', collaborators: req.document.collaborators });
  } catch (error) {
    res.status(500).json({ message: 'Error removing collaborator.', error: error.message });
  }
});

export default router;
