
export enum StructureType {
  WORD_FOR_WORD = 'Puur woordelijke tekst',
  SUMMARY = 'Samenvatting',
  STRUCTURED = 'Gestructureerd verslag (standaard)',
  INTERVIEW = 'Interviewvorm (spreker per spreker)',
  MINUTES = 'Notulen / meeting notes',
  CUSTOM = 'Custom Modulaire Structuur (zelf samenstellen)'
}

export enum DetailLevel {
  LITERAL = 'Volledig woordelijk (alles letterlijk)',
  CLEANED = 'Licht opgeschoond (zonder stopwoorden en herhalingen)',
  EDITED = 'Sterk geredigeerd (inhoudelijk, professioneel)'
}

export enum OutputStyle {
  RAW = 'Ruwe transcriptie',
  PROFESSIONAL = 'Professioneel verslag',
  BUSINESS = 'Zakelijk / formeel',
  INFORMAL = 'Informeel / creatief'
}

export enum RenderingMode {
  FAST = 'Snelle rendering (Prioriteit: snelheid)',
  QUALITY = 'Kwaliteitsvolle rendering (Prioriteit: nauwkeurigheid)'
}

export interface StructureSection {
  id: string;
  title: string;
  instruction: string;
}

export interface TranscriptionSettings {
  structure: StructureType;
  sections?: StructureSection[];
  detailLevel: DetailLevel;
  outputStyle: OutputStyle;
  language: string;
  renderingMode: RenderingMode;
}

export interface TranscriptionProfile {
  id: string;
  name: string;
  structure: StructureType;
  sections?: StructureSection[];
  outputStyle: OutputStyle;
  detailLevel: DetailLevel;
}

export interface TranscriptionResult {
  text: string;
  timestamp: string;
}
