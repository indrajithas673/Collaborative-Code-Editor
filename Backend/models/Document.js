import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
  state: {
    type: Buffer,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Untitled Document',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['Editor', 'Viewer'],
      default: 'Viewer',
    }
  }],
  yjsState: {
    type: Buffer, // Storing Y.encodeStateAsUpdate(ydoc)
    default: null,
  },
  versions: [versionSchema]
}, { timestamps: true });

documentSchema.index({ updatedAt: -1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;
