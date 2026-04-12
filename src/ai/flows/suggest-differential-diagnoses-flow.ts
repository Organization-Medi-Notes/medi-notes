'use server';
/**
 * @fileOverview This flow suggests possible differential diagnoses based on provided symptoms.
 *
 * - suggestDifferentialDiagnoses - A function that handles the differential diagnoses suggestion process.
 * - SuggestDifferentialDiagnosesInput - The input type for the suggestDifferentialDiagnoses function.
 * - SuggestDifferentialDiagnosesOutput - The return type for the suggestDifferentialDiagnoses function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestDifferentialDiagnosesInputSchema = z.object({
  symptoms: z.string().describe('A detailed description of the patient\'s symptoms for which to suggest differential diagnoses.'),
});
export type SuggestDifferentialDiagnosesInput = z.infer<typeof SuggestDifferentialDiagnosesInputSchema>;

const SuggestDifferentialDiagnosesOutputSchema = z.object({
  diagnoses: z.array(z.string()).describe('An array of possible differential diagnoses based on the provided symptoms.'),
});
export type SuggestDifferentialDiagnosesOutput = z.infer<typeof SuggestDifferentialDiagnosesOutputSchema>;

export async function suggestDifferentialDiagnoses(input: SuggestDifferentialDiagnosesInput): Promise<SuggestDifferentialDiagnosesOutput> {
  return suggestDifferentialDiagnosesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDifferentialDiagnosesPrompt',
  input: { schema: SuggestDifferentialDiagnosesInputSchema },
  output: { schema: SuggestDifferentialDiagnosesOutputSchema },
  prompt: `Eres un asistente médico experto. Se te proporcionará una descripción detallada de los síntomas de un paciente.
Tu tarea es sugerir una lista de posibles diagnósticos diferenciales basados exclusivamente en los síntomas proporcionados.

Es CRÍTICO que entiendas que estas sugerencias son solo como apoyo y NO reemplazan el juicio clínico de un profesional de la salud. Siempre incluye una advertencia clara al principio de tu respuesta indicando esto.

Síntomas:
{{{symptoms}}}

Por favor, proporciona una lista de diagnósticos diferenciales en formato JSON.`,
});

const suggestDifferentialDiagnosesFlow = ai.defineFlow(
  {
    name: 'suggestDifferentialDiagnosesFlow',
    inputSchema: SuggestDifferentialDiagnosesInputSchema,
    outputSchema: SuggestDifferentialDiagnosesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
