import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const isDemoMode = !apiKey || apiKey === 'your_openai_api_key';

const openai = isDemoMode ? null : new OpenAI({ apiKey });

export interface PhotoAnalysis {
  matchesCategory: boolean;
  severity: number;
  description: string;
  flagged: boolean;
  flagReason?: string;
}

export async function analyzePhoto(
  photoBase64: string,
  category: string
): Promise<PhotoAnalysis> {
  if (isDemoMode) {
    console.log(`[DEMO MODE] AI analysis for category: ${category}`);
    return {
      matchesCategory: true,
      severity: 7,
      description: `Photo appears to show a ${category} violation.`,
      flagged: false,
    };
  }

  try {
    const categoryDescriptions: Record<string, string> = {
      overgrown_yard: 'an excessively overgrown yard with tall grass, weeds, or unmaintained vegetation',
      junk_trash: 'junk, bulk trash, debris, or waste materials sitting in front of or around a property',
      unauthorized_vehicle: 'an unauthorized vehicle such as a construction trailer, 18-wheeler, commercial vehicle, or vehicle with flat tires parked at a residential property',
    };

    const response = await openai!.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an HOA compliance photo analyzer. You evaluate photos submitted by residents reporting property violations. Be objective and factual. You must respond in valid JSON only.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this photo. The reporter claims it shows: ${categoryDescriptions[category] || category}.

Respond with JSON:
{
  "matchesCategory": true/false (does the photo actually show this type of violation?),
  "severity": 1-10 (1=minor, 10=extreme. Consider impact on property values and neighborhood appearance),
  "description": "Brief factual description of what the photo shows",
  "flagged": true/false (flag if the photo is irrelevant, appears to be bad faith, shows people's faces, or is inappropriate),
  "flagReason": "reason for flagging, if applicable"
}`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${photoBase64}` },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      matchesCategory: true,
      severity: 5,
      description: 'Unable to fully analyze photo.',
      flagged: false,
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    return {
      matchesCategory: true,
      severity: 5,
      description: 'AI analysis unavailable.',
      flagged: false,
    };
  }
}

export async function calculatePriorityScore(
  complaintCount: number,
  avgSeverity: number,
  daysActive: number
): Promise<number> {
  const countWeight = Math.min(complaintCount * 20, 40);
  const severityWeight = avgSeverity * 3;
  const ageWeight = Math.min(daysActive * 2, 30);
  return Math.round(countWeight + severityWeight + ageWeight);
}

export { isDemoMode as isAIDemoMode };
