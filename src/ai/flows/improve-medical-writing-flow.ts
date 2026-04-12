'use server';
/**
 * @fileOverview A Genkit flow for improving informal medical text into professional medical writing.
 *
 * - improveMedicalWriting - A function that takes informal text and returns improved, professional medical writing.
 * - ImproveMedicalWritingInput - The input type for the improveMedicalWriting function.
 * - ImproveMedicalWritingOutput - The return type for the improveMedicalWriting function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImproveMedicalWritingInputSchema = z.object({
  text: z.string().describe('El texto informal a mejorar a lenguaje médico profesional.'),
});
export type ImproveMedicalWritingInput = z.infer<typeof ImproveMedicalWritingInputSchema>;

const ImproveMedicalWritingOutputSchema = z.object({
  improvedText: z.string().describe('El texto mejorado a lenguaje médico profesional.'),
});
export type ImproveMedicalWritingOutput = z.infer<typeof ImproveMedicalWritingOutputSchema>;

export async function improveMedicalWriting(input: ImproveMedicalWritingInput): Promise<ImproveMedicalWritingOutput> {
  return improveMedicalWritingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveMedicalWritingPrompt',
  input: { schema: ImproveMedicalWritingInputSchema },
  output: { schema: ImproveMedicalWritingOutputSchema },
  prompt: `Eres un asistente de redacción médica experto. Tu tarea es tomar el siguiente texto, que está en lenguaje informal, y mejorarlo para que suene profesional y preciso en un contexto médico.

Texto informal: {{{text}}}

Por favor, genera la versión mejorada del texto en un lenguaje médico profesional.`,
});

const improveMedicalWritingFlow = ai.defineFlow(
  {
    name: 'improveMedicalWritingFlow',
    inputSchema: ImproveMedicalWritingInputSchema,
    outputSchema: ImproveMedicalWritingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
