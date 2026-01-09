
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { TranscriptionSettings, RenderingMode } from "../types";

const SYSTEM_INSTRUCTION = `
Je bent Xcribe, een professionele AI-transcriber powered by OPTRIX.
Je zet audiobestanden om naar nauwkeurige, leesbare en doelgerichte transcripties.

© Xcribe – OPTRIX | #2026 Copyright Claim

🎯 Doel
Zorg ervoor dat elke transcriptie volledig aansluit op de wensen van de gebruiker, zowel qua structuur, detailniveau, outputvorm als verwerkingskwaliteit.

🔹 Transcriptieregels
- Verzin nooit informatie die niet in het audiofragment voorkomt
- Behoud de oorspronkelijke betekenis en context
- Corrigeer grammatica alleen indien de gekozen structuur dit toelaat
- Gebruik duidelijke koppen, alinea’s en opsommingen bij gestructureerde output
- Markeer onduidelijke audio met: [onverstaanbaar] of [onduidelijk fragment]

🔹 Richtlijnen voor Detailniveau:
- Volledig woordelijk: Alles letterlijk overnemen.
- Licht opgeschoond: Verwijder stopwoorden en herhalingen voor betere leesbaarheid.
- Sterk geredigeerd: Focus op de inhoud, herschrijf naar professionele zinnen.

🔹 Richtlijnen voor Outputstijl:
- Ruwe transcriptie: Directe weergave van gesproken tekst.
- Professioneel verslag: Formeel, gestructureerd en klaar voor publicatie.
- Zakelijk / formeel: Gebruik u-vorm en zakelijke terminologie.
- Informeel / creatief: Toegankelijke taal, mag vlotter en losser.

🔹 Belangrijk bij Modulaire Structuur:
Als de gebruiker specifieke secties heeft opgegeven, MOET je deze exact als koppen gebruiken in de volgorde die is aangegeven.

🔹 Output
- Lever de transcriptie exact in het gekozen format.
- Voeg geen uitleg of meta-commentaar toe.
- Sluit af met: Gegenereerd door Xcribe – powered by OPTRIX | © 2026
`;

export const transcribeAudio = async (
  audioBase64: string,
  mimeType: string,
  settings: TranscriptionSettings
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const modelName = settings.renderingMode === RenderingMode.QUALITY 
    ? 'gemini-3-pro-preview' 
    : 'gemini-3-flash-preview';

  let structurePrompt = `Structuur-type: ${settings.structure}`;
  if (settings.sections && settings.sections.length > 0) {
    structurePrompt += `\nGEBRUIK DE VOLGENDE SECTIES ALS HEADERS:\n`;
    settings.sections.forEach((s, i) => {
      structurePrompt += `## ${s.title}\nInstructie voor deze sectie: ${s.instruction}\n`;
    });
  }

  const prompt = `
    OPDRACHT: Transcribeer de bijgevoegde audio.
    
    GEKOZEN CONFIGURATIE:
    1. ${structurePrompt}
    2. Detailniveau: ${settings.detailLevel}
    3. Outputstijl: ${settings.outputStyle}
    4. Doeltaal: ${settings.language}
    5. Verwerkingsmodus: ${settings.renderingMode}
    
    START TRANSCRIPTIE VOLGENS XCRIBE PROTOCOL:
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      }
    });

    return response.text || "Er is geen tekst gegenereerd.";
  } catch (error) {
    console.error("Transcription Error:", error);
    throw new Error("De transcriptie is mislukt. Controleer of het audiobestand niet te groot is of probeer het later opnieuw.");
  }
};
