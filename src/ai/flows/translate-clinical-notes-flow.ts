'use server';
/**
 * @fileOverview A Genkit flow for translating clinical notes or diagnoses from Spanish to English.
 *
 * - translateClinicalNotes - A function that handles the translation process.
 * - TranslateClinicalNotesInput - The input type for the translateClinicalNotes function.
 * - TranslateClinicalNotesOutput - The return type for the translateClinicalNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateClinicalNotesInputSchema = z.object({
  notes: z.string().describe('Clinical notes or diagnosis text in Spanish to be translated.'),
});
export type TranslateClinicalNotesInput = z.infer<typeof TranslateClinicalNotesInputSchema>;

const TranslateClinicalNotesOutputSchema = z.object({
  translatedNotes: z.string().describe('The translated clinical notes or diagnosis text in English.'),
});
export type TranslateClinicalNotesOutput = z.infer<typeof TranslateClinicalNotesOutputSchema>;

export async function translateClinicalNotes(input: TranslateClinicalNotesInput): Promise<TranslateClinicalNotesOutput> {
  return translateClinicalNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateClinicalNotesPrompt',
  input: {schema: TranslateClinicalNotesInputSchema},
  output: {schema: TranslateClinicalNotesOutputSchema},
  prompt: `You are a professional medical translator. Translate the following clinical notes or diagnosis text from Spanish to English. Maintain all medical terminology and ensure accuracy.

Spanish Notes: {{{notes}}}`,
});

const translateClinicalNotesFlow = ai.defineFlow(
  {
    name: 'translateClinicalNotesFlow',
    inputSchema: TranslateClinicalNotesInputSchema,
    outputSchema: TranslateClinicalNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
