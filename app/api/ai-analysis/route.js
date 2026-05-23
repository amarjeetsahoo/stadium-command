// app/api/ai-analysis/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAuthToken } from '@/lib/authVerify';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  // Enforce authentication
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { location, type, description, severity } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('YOUR_')) {
      return NextResponse.json(
        {
          summary: 'Gemini API key is not configured. This is a fallback mock response.',
          riskLevel: severity,
          suggestedActions: [
            'Configure GEMINI_API_KEY in .env.local',
            'Dispatch security to ' + location,
            'Monitor the situation closely',
          ],
        },
        { status: 200 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an AI assistant for a stadium crowd management team.
      An incident has been reported:
      - Location: ${location}
      - Type: ${type}
      - Description: ${description}
      - Reported Severity: ${severity}

      Provide a brief threat summary and 2-3 concise actionable steps for the ground staff.
      Respond in JSON format:
      {
        "summary": "Brief 1-2 sentence summary of the threat",
        "riskLevel": "Low | Medium | High | Critical",
        "suggestedActions": ["Action 1", "Action 2", "Action 3"]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse the JSON from the markdown block if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed, { status: 200 });
    }

    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });

  } catch (err) {
    console.error('[ai-analysis] Error:', err);
    return NextResponse.json(
      {
        summary: 'AI analysis failed: ' + err.message,
        riskLevel: 'High',
        suggestedActions: ['Fallback action: Evaluate manually'],
      },
      { status: 200 }
    );
  }
}
