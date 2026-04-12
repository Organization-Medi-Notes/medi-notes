'use server';
/**
 * @fileOverview A Genkit flow for generating personalized follow-up messages for patients.
 *
 * - generateFollowUpText - A function that handles the generation of a follow-up message.
 * - GenerateFollowUpTextInput - The input type for the generateFollowUpText function.
 * - GenerateFollowUpTextOutput - The return type for the generateFollowUpText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFollowUpTextInputSchema = z.object({
  patientName: z.string().describe('The name of the patient.'),
  diagnosis: z.string().describe('The diagnosis given to the patient.'),
  treatmentPlan: z.string().describe('The treatment plan prescribed to the patient.'),
});
export type GenerateFollowUpTextInput = z.infer<typeof GenerateFollowUpTextInputSchema>;

const GenerateFollowUpTextOutputSchema = z
  .string()
  .describe('A personalized follow-up message for the patient.');
export type GenerateFollowUpTextOutput = z.infer<typeof GenerateFollowUpTextOutputSchema>;

export async function generateFollowUpText(
  input: GenerateFollowUpTextInput
): Promise<GenerateFollowUpTextOutput> {
  return generateFollowUpTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFollowUpTextPrompt',
  input: {schema: GenerateFollowUpTextInputSchema},
  output: {schema: GenerateFollowUpTextOutputSchema},
  prompt: `Eres un asistente médico amigable y profesional. Tu tarea es redactar un mensaje de seguimiento personalizado para un paciente en español de Costa Rica. El mensaje debe ser claro, conciso, recordar al paciente su diagnóstico y el plan de tratamiento recomendado, y fomentar la comunicación efectiva.

Datos del paciente y consulta:
Nombre del Paciente: {{{patientName}}}
Diagnóstico: {{{diagnosis}}}
Plan de Tratamiento: {{{treatmentPlan}}}

Por favor, genera un mensaje cordial y profesional que pueda enviarse al paciente.`,
});

const generateFollowUpTextFlow = ai.defineFlow(
  {
    name: 'generateFollowUpTextFlow',
    inputSchema: GenerateFollowUpTextInputSchema,
    outputSchema: GenerateFollowUpTextOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
