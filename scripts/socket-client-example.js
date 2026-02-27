/**
 * Example Socket.IO client – connect and listen for message:new and notification:new.
 *
 * 1. Get a JWT: POST /api/v1/users/login with { email, password }
 * 2. Run: JWT=your_token node scripts/socket-client-example.js
 *    Or set BASE_URL and JWT below and run: node scripts/socket-client-example.js
 */
import { io } from 'socket.io-client';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const JWT = process.env.JWT || 'PASTE_YOUR_JWT_HERE';

if (!JWT || JWT === 'PASTE_YOUR_JWT_HERE') {
  console.log('Usage: JWT=your_jwt node scripts/socket-client-example.js');
  console.log('Or set BASE_URL and JWT in this file.');
  process.exit(1);
}

const socket = io(BASE_URL, {
  auth: { token: JWT }
});

socket.on('connect', () => {
  console.log('Connected – socket id:', socket.id);
  console.log('Listening for: message:new, notification:new');
});

socket.on('connect_error', (err) => {
  console.error('Connect error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('message:new', (payload) => {
  console.log('\n[message:new]', JSON.stringify(payload, null, 2));
});

socket.on('notification:new', (payload) => {
  console.log('\n[notification:new]', JSON.stringify(payload, null, 2));
});

// Keep process alive
process.stdin.resume();
