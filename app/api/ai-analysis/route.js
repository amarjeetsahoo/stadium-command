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
          systemActions: []
        },
        { status: 200 }
      );
    }

    const prompt = `
      You are an AI assistant for a stadium crowd management team.
      An incident has been reported:
      - Location: ${location}
      - Type: ${type}
      - Description: ${description}
      - Reported Severity: ${severity}

      Provide a brief threat summary and 2-3 concise actionable steps for the ground staff.
      If the incident mentions VIPs or Gate overcrowding/issues, also provide an array of exact system actions to execute.
      Valid system action types: "GATE_OVERRIDE", "VIP_ESCORT".
      Valid target IDs for Gate: "gate-01" to "gate-08". Valid commands: "lock", "redirect".
      Valid target IDs for VIP: "vip-01" to "vip-04". Valid commands: "enable_escort".
      Respond in JSON format:
      {
        "summary": "Brief 1-2 sentence summary of the threat",
        "riskLevel": "Low | Medium | High | Critical",
        "suggestedActions": ["Action 1", "Action 2", "Action 3"],
        "systemActions": [
          { "type": "GATE_OVERRIDE", "targetId": "gate-03", "command": "redirect" },
          { "type": "VIP_ESCORT", "targetId": "vip-01", "command": "enable_escort" }
        ]
      }
    `;

    const genAI = new GoogleGenerativeAI(apiKey);
    
    let resultText = '';
    let success = false;
    
    // Attempt preferred model first, fall back to secondary model if unavailable
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-pro'];
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        resultText = result.response.text();
        success = true;
        break;
      } catch (modelErr) {
        console.warn(`[ai-analysis] Model ${modelName} failed to generate content:`, modelErr.message);
      }
    }

    if (success) {
      // Parse the JSON from the markdown block if present
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed, { status: 200 });
      }
      throw new Error('Failed to parse AI response content');
    }
    
    // If all models failed, fall back to a clean mock response indicating manual evaluation is required
    console.error('[ai-analysis] All generative models failed. Providing professional mock fallback.');
    const formattedSeverity = severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : 'High';
    return NextResponse.json(
      {
        summary: `Stadium AI threat analysis service is currently offline. Ground staff should manually evaluate the ${type.toLowerCase()} reported at ${location}.`,
        riskLevel: formattedSeverity,
        suggestedActions: [
          `Dispatch ground security teams directly to ${location} to assess the situation`,
          `Notify nearby gate staff and establish direct communication channels`,
          'Fallback action: Evaluate manually'
        ],
        systemActions: []
      },
      { status: 200 }
    );

  } catch (err) {
    console.error('[ai-analysis] Critical handler error:', err);
    const formattedSeverity = severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : 'High';
    return NextResponse.json(
      {
        summary: `AI analysis failed: ${err.message}`,
        riskLevel: formattedSeverity,
        suggestedActions: [
          'Fallback action: Evaluate manually',
          `Monitor the reported incident at ${location} manually`
        ],
        systemActions: []
      },
      { status: 200 }
    );
  }
}
