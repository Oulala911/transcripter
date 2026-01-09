import { TranscriptionSettings, StructureType } from '../types';

const API_KEY = process.env.GEMINI_API_KEY || '';

export async function transcribeAudio(
  base64Audio: string,
  mimeType: string,
  settings: TranscriptionSettings
): Promise<string> {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is niet ingesteld');
  }

  const modelName = settings.renderingMode === 'Snelle rendering (Prioriteit: snelheid)' 
    ? 'gemini-1.5-flash' 
    : 'gemini-1.5-pro';

  const prompt = buildPrompt(settings);

  const requestBody = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Audio
          }
        },
        {
          text: prompt
        }
      ]
    }]
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API fout: ${error}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
    throw new Error('Geen transcriptie ontvangen van Gemini API');
  }

  return data.candidates[0].content.parts[0].text;
}

function buildPrompt(settings: TranscriptionSettings): string {
  let prompt = `Transcribeer de volgende audio naar tekst in het ${settings.language}.

`;

  // Structuur
  if (settings.structure === StructureType.WORD_FOR_WORD) {
    prompt += 'Geef een volledig woordelijke transcriptie, exact zoals gesproken.';
  } else if (settings.structure === StructureType.SUMMARY) {
    prompt += 'Maak een bondige samenvatting van de belangrijkste punten.';
  } else if (settings.structure === StructureType.STRUCTURED) {
    prompt += 'Maak een gestructureerd verslag met duidelijke kopjes en alinea\'s.';
  } else if (settings.structure === StructureType.INTERVIEW) {
    prompt += 'Transcribeer in interviewvorm met "Spreker 1:", "Spreker 2:", etc.';
  } else if (settings.structure === StructureType.MINUTES) {
    prompt += 'Maak professionele notulen met agenda, besluitvorming en actiepunten.';
  } else if (settings.structure === StructureType.CUSTOM && settings.sections) {
    prompt += 'Structureer de transcriptie in de volgende secties:\n';
    settings.sections.forEach(section => {
      prompt += `\n## ${section.title}\n${section.instruction}\n`;
    });
  }

  prompt += '\n\n';

  // Detail niveau
  if (settings.detailLevel === 'Volledig woordelijk (alles letterlijk)') {
    prompt += 'Behoud alle herhalingen, stopwoorden en aarzeling.';
  } else if (settings.detailLevel === 'Licht opgeschoond (zonder stopwoorden en herhalingen)') {
    prompt += 'Verwijder herhalingen en overbodige stopwoorden, maar behoud de essentie.';
  } else {
    prompt += 'Redigeer de tekst tot professionele, vloeiende zinnen.';
  }

  prompt += '\n\n';

  // Stijl
  if (settings.outputStyle === 'Professioneel verslag') {
    prompt += 'Gebruik een professionele, zakelijke toon.';
  } else if (settings.outputStyl
