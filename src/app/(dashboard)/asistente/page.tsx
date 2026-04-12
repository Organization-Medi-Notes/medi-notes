"use client";

import { useState } from "react";
import { Sparkles, Languages, FileText, Send, UserCheck, MessageSquare, Copy, Wand2, Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { summarizeClinicalNotes } from "@/ai/flows/summarize-clinical-notes-flow";
import { simplifyForPatient } from "@/ai/flows/simplify-for-patient-flow";
import { improveMedicalWriting } from "@/ai/flows/improve-medical-writing-flow";
import { translateClinicalNotes } from "@/ai/flows/translate-clinical-notes-flow";
import { generateFollowUpText } from "@/ai/flows/generate-follow-up-text-flow";
import { suggestDifferentialDiagnoses } from "@/ai/flows/suggest-differential-diagnoses-flow";

export default function AssistantPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<any>(null);

  // States for Follow-up specialized form
  const [followUpData, setFollowUpData] = useState({
    patientName: "",
    diagnosis: "",
    treatmentPlan: ""
  });

  const handleAction = async (type: string) => {
    if (!inputText && type !== 'follow-up') {
      toast({ title: "Error", description: "Por favor ingresa un texto para procesar.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let output;
      switch (type) {
        case 'summarize':
          output = await summarizeClinicalNotes({ notes: inputText });
          setResult(output.summary);
          break;
        case 'simplify':
          output = await simplifyForPatient({ medicalText: inputText });
          setResult(output.simplifiedText);
          break;
        case 'improve':
          output = await improveMedicalWriting({ text: inputText });
          setResult(output.improvedText);
          break;
        case 'translate':
          output = await translateClinicalNotes({ notes: inputText });
          setResult(output.translatedNotes);
          break;
        case 'diagnoses':
          output = await suggestDifferentialDiagnoses({ symptoms: inputText });
          setResult(output.diagnoses);
          break;
        case 'follow-up':
          output = await generateFollowUpText(followUpData);
          setResult(output);
          break;
      }
      toast({ title: "Éxito", description: "Procesado correctamente con IA." });
    } catch (error) {
      toast({ title: "Error", description: "Hubo un problema procesando la solicitud.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = Array.isArray(result) ? result.join('\n') : result;
    navigator.clipboard.writeText(textToCopy);
    toast({ title: "Copiado", description: "El resultado se ha copiado al portapapeles." });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
          <Sparkles className="text-accent" />
          Asistente Clínico IA
        </h1>
        <p className="text-gray-500 mt-2">Utilice el poder de la inteligencia artificial para agilizar su práctica clínica.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Tabs defaultValue="summarize" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4 h-auto p-1 bg-gray-100">
              <TabsTrigger value="summarize" className="text-xs py-2">Resumir</TabsTrigger>
              <TabsTrigger value="simplify" className="text-xs py-2">Paciente</TabsTrigger>
              <TabsTrigger value="improve" className="text-xs py-2">Redacción</TabsTrigger>
              <TabsTrigger value="translate" className="text-xs py-2">Traducir</TabsTrigger>
              <TabsTrigger value="diagnoses" className="text-xs py-2">Diagnóstico</TabsTrigger>
              <TabsTrigger value="follow-up" className="text-xs py-2">Seguimiento</TabsTrigger>
            </TabsList>

            <TabsContent value="follow-up" className="card-notion space-y-4 mt-0">
               <div className="space-y-3">
                <label className="text-sm font-medium">Nombre del Paciente</label>
                <Input 
                  placeholder="Ej: Sofía Méndez" 
                  value={followUpData.patientName}
                  onChange={e => setFollowUpData({...followUpData, patientName: e.target.value})}
                />
               </div>
               <div className="space-y-3">
                <label className="text-sm font-medium">Diagnóstico</label>
                <Input 
                  placeholder="Ej: Hipertensión arterial" 
                  value={followUpData.diagnosis}
                  onChange={e => setFollowUpData({...followUpData, diagnosis: e.target.value})}
                />
               </div>
               <div className="space-y-3">
                <label className="text-sm font-medium">Plan de Tratamiento</label>
                <Textarea 
                  placeholder="Ej: Enalapril 10mg cada 12 horas por 3 meses" 
                  className="min-h-[100px]"
                  value={followUpData.treatmentPlan}
                  onChange={e => setFollowUpData({...followUpData, treatmentPlan: e.target.value})}
                />
               </div>
               <Button 
                onClick={() => handleAction('follow-up')} 
                disabled={loading}
                className="w-full bg-accent hover:bg-accent/90 h-12"
              >
                {loading ? "Generando..." : "Generar Mensaje de Seguimiento"}
              </Button>
            </TabsContent>

            {['summarize', 'simplify', 'improve', 'translate', 'diagnoses'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                <div className="card-notion space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {tab === 'diagnoses' ? "Describe los síntomas" : "Pega aquí el texto médico"}
                    </label>
                    <Textarea 
                      placeholder="Ingrese el contenido aquí..." 
                      className="min-h-[300px] resize-none focus:ring-primary"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={() => handleAction(tab)} 
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-dark h-12"
                  >
                    {loading ? "Procesando con IA..." : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        {tab === 'summarize' && "Generar Resumen Estructurado"}
                        {tab === 'simplify' && "Simplificar para el Paciente"}
                        {tab === 'improve' && "Mejorar a Lenguaje Profesional"}
                        {tab === 'translate' && "Traducir a Inglés Médico"}
                        {tab === 'diagnoses' && "Sugerir Diagnósticos Diferenciales"}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent" />
            Resultado Generado
          </h2>
          <div className="card-notion min-h-[500px] flex flex-col bg-gray-50/50">
            {result ? (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 bg-white border border-gray-100 rounded-lg p-6 overflow-auto font-body leading-relaxed text-gray-800">
                  {Array.isArray(result) ? (
                    <div className="space-y-4">
                      <p className="font-semibold text-amber-600 flex items-center gap-2 text-xs">
                        <Stethoscope className="w-4 h-4" />
                        Aviso: Sugerencias de apoyo clínico solamente.
                      </p>
                      <ul className="list-disc pl-5 space-y-2">
                        {result.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{result}</p>
                  )}
                </div>
                <div className="mt-6 flex gap-3">
                  <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                  <Button className="flex-1 bg-primary">
                    <Send className="w-4 h-4 mr-2" />
                    Usar en Expediente
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-subtle mb-4">
                  <Sparkles className="w-8 h-8 text-gray-200" />
                </div>
                <h3 className="text-lg font-semibold text-gray-400">Sin resultados aún</h3>
                <p className="text-gray-400 text-sm mt-1 max-w-[200px]">Seleccione una acción e ingrese texto para comenzar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
