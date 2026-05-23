// lib/gemini.js
// Server-only Google AI SDK initialization.
// This module must ONLY be imported in app/api/* routes (server-side).
// GEMINI_API_KEY is never exposed to the client bundle.

import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  console.warn('[gemini] GEMINI_API_KEY is not set. AI analysis will fail.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Use Gemini 1.5 Flash — fast, free-tier friendly
export const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export default genAI;
