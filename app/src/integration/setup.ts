// Node 20 has no global WebSocket; supabase-js (realtime) expects one.
import WebSocket from 'ws';
(globalThis as unknown as { WebSocket: unknown }).WebSocket ??= WebSocket;
