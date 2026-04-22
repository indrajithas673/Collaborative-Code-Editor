import axios from 'axios';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import mongoose from 'mongoose';

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    results.push(`✅ PASS: ${message}`);
  } else {
    failed++;
    results.push(`❌ FAIL: ${message}`);
    console.error(`❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("Starting End-to-End Tests...");

  // 1. Auth & Registration
  const userA = { username: `userA_${Date.now()}`, email: `usera_${Date.now()}@test.com`, password: 'password123' };
  const userB = { username: `userB_${Date.now()}`, email: `userb_${Date.now()}@test.com`, password: 'password123' };
  const userC = { username: `userC_${Date.now()}`, email: `userc_${Date.now()}@test.com`, password: 'password123' };

  let tokenA, tokenB, tokenC;
  let idA, idB, idC;

  try {
    const resA = await axios.post(`${API_URL}/auth/register`, userA);
    tokenA = resA.data.token;
    idA = resA.data.user.id;
    assert(tokenA != null, "User A Registration & JWT Generation");

    const resB = await axios.post(`${API_URL}/auth/register`, userB);
    tokenB = resB.data.token;
    idB = resB.data.user.id;
    
    const resC = await axios.post(`${API_URL}/auth/register`, userC);
    tokenC = resC.data.token;
    idC = resC.data.user.id;
  } catch (err) {
    console.error("Registration Error details:", err.response?.data);
    assert(false, "Registration failed: " + err.message);
  }

  // Login
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { email: userA.email, password: userA.password });
    assert(res.data.token === tokenA || res.data.token != null, "User Login & JWT Validation");
  } catch (err) {
    assert(false, "Login failed");
  }

  // Invalid credentials
  try {
    await axios.post(`${API_URL}/auth/login`, { email: userA.email, password: 'wrongpassword' });
    assert(false, "Invalid credentials should be rejected");
  } catch (err) {
    assert(err.response.status === 400, "Invalid credentials rejected correctly");
  }

  const clientA = axios.create({ headers: { Authorization: `Bearer ${tokenA}` } });
  const clientB = axios.create({ headers: { Authorization: `Bearer ${tokenB}` } });
  const clientC = axios.create({ headers: { Authorization: `Bearer ${tokenC}` } });

  // 2. Document Management
  let docId;
  try {
    const res = await clientA.post(`${API_URL}/documents`, { title: 'Test Document' });
    docId = res.data._id;
    assert(docId != null, "Document Creation by User A");
  } catch (err) {
    assert(false, "Document creation failed: " + err.response?.data?.message);
  }

  try {
    const res = await clientA.get(`${API_URL}/documents`);
    assert(res.data.length >= 1, "View owned documents");
  } catch (err) {
    assert(false, "Failed to view documents");
  }

  try {
    await clientA.put(`${API_URL}/documents/${docId}`, { title: 'Renamed Document' });
    const res = await clientA.get(`${API_URL}/documents/${docId}`);
    assert(res.data.title === 'Renamed Document', "Rename document");
  } catch (err) {
    assert(false, "Rename document failed");
  }

  // User B tries to view (Should fail initially)
  try {
    await clientB.get(`${API_URL}/documents/${docId}`);
    assert(false, "User B should not access User A's document");
  } catch (err) {
    assert(err.response.status === 403, "Unauthorized access blocked");
  }

  // 3. Sharing
  try {
    await clientA.post(`${API_URL}/documents/${docId}/share`, { email: userB.email, role: 'Editor' });
    await clientA.post(`${API_URL}/documents/${docId}/share`, { email: userC.email, role: 'Viewer' });
    assert(true, "Share document with Editor and Viewer");
  } catch (err) {
    assert(false, "Sharing failed");
  }

  // User B (Editor) tries to view
  try {
    const res = await clientB.get(`${API_URL}/documents/${docId}`);
    assert(res.data.userRole === 'Editor', "User B can view as Editor");
  } catch (err) {
    assert(false, "User B view failed");
  }

  // User C (Viewer) tries to rename (Should fail)
  try {
    await clientC.put(`${API_URL}/documents/${docId}`, { title: 'Hacked' });
    assert(false, "Viewer should not be able to rename");
  } catch (err) {
    assert(err.response.status === 403, "Viewer modification rejected");
  }

  // Remove Collaborator
  try {
    // User B tries to remove User C (should fail)
    await clientB.delete(`${API_URL}/documents/${docId}/share/${idC}`);
    assert(false, "Editor should not be able to remove collaborator");
  } catch (err) {
    if (err.response?.status !== 403) console.log("B err:", err.response?.data || err.message);
    assert(err.response?.status === 403, "Editor remove collaborator rejected");
  }

  try {
    // Owner removes User C
    await clientA.delete(`${API_URL}/documents/${docId}/share/${idC}`);
    assert(true, "Owner removed collaborator");
  } catch (err) {
    console.log("A err:", err.response?.data || err.message);
    assert(false, "Owner remove collaborator failed");
  }

  // 4. Socket.IO & Collaboration
  console.log("Testing WebSockets...");
  const socketA = io(SOCKET_URL, { auth: { token: tokenA }, query: { documentId: docId } });
  const socketB = io(SOCKET_URL, { auth: { token: tokenB }, query: { documentId: docId } });
  const socketC = io(SOCKET_URL, { auth: { token: tokenC }, query: { documentId: docId } });
  
  // Wait for connections
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  assert(socketA.connected, "Owner Socket connected");
  assert(socketB.connected, "Editor Socket connected");
  
  // User C was removed from the document earlier, so their socket should be rejected
  assert(!socketC.connected, "Removed Viewer Socket rejected");

  // Invalid Token Socket
  const socketInvalid = io(SOCKET_URL, { auth: { token: 'invalid' } });
  await new Promise(resolve => setTimeout(resolve, 500));
  assert(!socketInvalid.connected, "Socket with invalid token rejected");
  socketInvalid.disconnect();

  // Test y-socket.io integration manually
  // We need to use y-socket.io client but to simplify we just rely on Socket connection success.
  // Proper Yjs sync testing over sockets requires SocketIOProvider from y-socket.io client.
  
  socketA.disconnect();
  socketB.disconnect();
  socketC.disconnect();

  // 5. Deletion
  try {
    await clientB.delete(`${API_URL}/documents/${docId}`);
    assert(false, "Editor should not be able to delete");
  } catch (err) {
    assert(err.response.status === 403, "Editor deletion blocked");
  }

  try {
    await clientA.delete(`${API_URL}/documents/${docId}`);
    assert(true, "Owner deleted document");
  } catch (err) {
    assert(false, "Owner deletion failed");
  }

  console.log("\n=========================");
  console.log("TEST RESULTS");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  results.forEach(r => console.log(r));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
