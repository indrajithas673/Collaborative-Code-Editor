import mongoose from 'mongoose';
import User from './models/User.js';
import Document from './models/Document.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collab-editor');
  console.log('--- DATABASE STATE ---');
  
  const users = await User.find({}).lean();
  console.log('\n--- USERS ---');
  users.forEach(u => {
    console.log({
      _id: u._id,
      username: u.username,
      email: u.email,
      password: '[REDACTED_HASH]'
    });
  });

  const docs = await Document.find({}).lean();
  console.log('\n--- DOCUMENTS ---');
  docs.forEach(d => {
    console.log({
      _id: d._id,
      title: d.title,
      owner: d.owner,
      collaborators: d.collaborators,
      yjsState: d.yjsState ? `[Buffer ${d.yjsState.length} bytes] - REDACTED BINARY DATA` : 'No state',
      versions: d.versions
    });
  });

  await mongoose.disconnect();
}
run().catch(console.error);
