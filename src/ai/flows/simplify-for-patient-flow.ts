'use server';
/**
 * @fileOverview A Genkit flow for simplifying medical text for patients.
 *
 * - simplifyForPatient - A function that handles the simplification of medical text.
 * - SimplifyForPatientInput - The input type for the simplifyForPatient function.
 * - SimplifyForPatientOutput - The return type for the simplifyForPatient function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimplifyForPatientInputSchema = z.object({
  medicalText: z
    .string()
    .describe('El texto médico a simplificar para el paciente.'),
});
export type SimplifyForPatientInput = z.infer<
  typeof SimplifyForPatientInputSchema
>;

const SimplifyForPatientOutputSchema = z.object({
  simplifiedText: z
    .string()
    .describe(
      'El texto médico original traducido a un lenguaje simple y claro para que el paciente entienda.'
    ),
});
export type SimplifyForPatientOutput = z.infer<
  typeof SimplifyForPatientOutputSchema
>;

export async function simplifyForPatient(
  input: SimplifyForPatientInput
): Promise<SimplifyForPatientOutput> {
  return simplifyForPatientFlow(input);
}

const simplifyForPatientPrompt = ai.definePrompt({
  name: 'simplifyForPatientPrompt',
  input: {schema: SimplifyForPatientInputSchema},
  output: {schema: SimplifyForPatientOutputSchema},
  prompt: `Eres un asistente médico experto en comunicación, tu objetivo es tomar descripciones médicas complejas,
diagnósticos o indicaciones de tratamiento y transformarlos en un lenguaje claro, sencillo y comprensible para un paciente, sin perder la precisión. El paciente no tiene conocimientos médicos y necesita entender su situación de manera fácil.

Por favor, simplifica el siguiente texto médico:

Texto médico:
"""
{{{medicalText}}}
"""

Texto simplificado para el paciente:`,
});

const simplifyForPatientFlow = ai.defineFlow(
  {
    name: 'simplifyForPatientFlow',
    inputSchema: SimplifyForPatientInputSchema,
    outputSchema: SimplifyForPatientOutputSchema,
  },
  async (input) => {
    const {output} = await simplifyForPatientPrompt(input);
    return output!;
  }
);
