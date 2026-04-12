'use server';
/**
 * @fileOverview A Genkit flow to summarize extensive clinical notes.
 *
 * - summarizeClinicalNotes - A function that takes clinical notes and returns a concise, structured summary.
 * - SummarizeClinicalNotesInput - The input type for the summarizeClinicalNotes function.
 * - SummarizeClinicalNotesOutput - The return type for the summarizeClinicalNotes function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizeClinicalNotesInputSchema = z.object({
  notes: z.string().describe('El texto extenso de las notas clínicas a resumir.'),
});
export type SummarizeClinicalNotesInput = z.infer<typeof SummarizeClinicalNotesInputSchema>;

const SummarizeClinicalNotesOutputSchema = z.object({
  summary: z.string().describe('Un resumen conciso y estructurado de las notas clínicas.'),
});
export type SummarizeClinicalNotesOutput = z.infer<typeof SummarizeClinicalNotesOutputSchema>;

export async function summarizeClinicalNotes(input: SummarizeClinicalNotesInput): Promise<SummarizeClinicalNotesOutput> {
  return summarizeClinicalNotesFlow(input);
}

const summarizeClinicalNotesPrompt = ai.definePrompt({
  name: 'summarizeClinicalNotesPrompt',
  input: { schema: SummarizeClinicalNotesInputSchema },
  output: { schema: SummarizeClinicalNotesOutputSchema },
  prompt: `Eres un asistente médico experto en la redacción de expedientes clínicos.
Tu tarea es tomar las notas clínicas proporcionadas y generar un resumen conciso y estructurado en español.
El resumen debe ser fácil de entender para otros profesionales de la salud y destacar los puntos más importantes de la consulta.

Notas clínicas:
{{{notes}}}`,
});

const summarizeClinicalNotesFlow = ai.defineFlow(
  {
    name: 'summarizeClinicalNotesFlow',
    inputSchema: SummarizeClinicalNotesInputSchema,
    outputSchema: SummarizeClinicalNotesOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeClinicalNotesPrompt(input);
    return output!;
  }
);
