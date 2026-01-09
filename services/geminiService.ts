import { GoogleGenerativeAI } from '@google/genai';
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

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: settings.renderingMode === 'Snelle rendering (Prioriteit: snelheid)' 
      ? 'gemini-1.5-flash' 
      : 'gemini-1.5-pro'
  });

  let prompt = buildPrompt(settings);

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Audio,
        mimeType: mimeType
      }
    },
    prompt
  ]);

  const response = await result.response;
  return response.text();
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
  } else if (settings.outputStyle === 'Zakelijk / formeel') {
    prompt += 'Gebruik een formele, zakelijke schrijfstijl.';
  } else if (settings.outputStyle === 'Informeel / creatief') {
    prompt += 'Gebruik een informele, toegankelijke stijl.';
  }

  return prompt;
}
