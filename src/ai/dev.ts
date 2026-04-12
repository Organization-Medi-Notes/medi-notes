import { config } from 'dotenv';
config();

import '@/ai/flows/simplify-for-patient-flow.ts';
import '@/ai/flows/translate-clinical-notes-flow.ts';
import '@/ai/flows/improve-medical-writing-flow.ts';
import '@/ai/flows/summarize-clinical-notes-flow.ts';
import '@/ai/flows/suggest-differential-diagnoses-flow.ts';
import '@/ai/flows/generate-follow-up-text-flow.ts';