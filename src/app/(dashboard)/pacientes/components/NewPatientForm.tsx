"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { patientService } from "@/lib/firebase/db-service";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";
import { Timestamp, doc, updateDoc } from "firebase/firestore";

// Define the patient schema with Zod
const patientSchema = z.object({
  id: z.string().optional(), // To store the patient's ID when editing
  nombre: z.string().min(1, "El nombre es requerido"),
  apellidos: z.string().min(1, "Los apellidos son requeridos"),
  fechaNacimiento: z.union([
    // Allow Date objects directly
    z.instanceof(Date, { message: "La fecha de nacimiento es requerida" }),
    // Transform string input into a Date object
    z.string().min(1, "La fecha de nacimiento es requerida").refine((val) => !isNaN(new Date(val).getTime()), {
      message: "Fecha inválida",
    }).transform((val) => new Date(val)),
  ]),
  cedula: z.string().min(1, "La cédula es requerida"),
  sexo: z.enum(["masculino", "femenino", "otro"]),
  telefono: z.string().optional(),
  email: z.string().min(1, "El email es requerido").email("Email inválido"),
  direccion: z.string().optional(),
  contactoEmergenciaNombre: z.string().optional(),
  contactoEmergenciaTelefono: z.string().optional(),
  grupoSanguineo: z.string().optional(),
  alergias: z.array(z.object({ value: z.string() })).optional(),
  medicamentosActuales: z.array(z.object({ value: z.string() })).optional(),
  antecedentesFamiliares: z.string().optional(),
  antecedentesPersonales: z.string().optional(),
  aseguradora: z.string().optional(),
  numeroPoliza: z.string().optional(),
  // Fields that should not be modified (read-only in form, but present for completeness)
  fechaRegistro: z.any().optional(),
  creadoPor: z.string().optional(),
  activo: z.boolean().optional(),
});

// Default values for a new patient
const defaultPatientValues = {
  nombre: "",
  apellidos: "",
  fechaNacimiento: new Date(),
  cedula: "",
  sexo: "masculino",
  telefono: "",
  email: "",
  direccion: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaTelefono: "",
  grupoSanguineo: "",
  aseguradora: "",
  numeroPoliza: "",
  antecedentesFamiliares: "",
  antecedentesPersonales: "",
  alergias: [],
  medicamentosActuales: [],
  fechaRegistro: null,
  creadoPor: "",
  activo: true,
};

export function NewPatientForm({ onFinished, patientToEdit }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: defaultPatientValues, // Use default values for new patients
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const {
    fields: alergiasFields,
    append: appendAlergia,
    remove: removeAlergia,
  } = useFieldArray({
    control: form.control,
    name: "alergias",
  });

  const {
    fields: medicamentosFields,
    append: appendMedicamento,
    remove: removeMedicamento,
  } = useFieldArray({
    control: form.control,
    name: "medicamentosActuales",
  });

  // Effect to pre-fill form when patientToEdit changes
  useEffect(() => {
    if (patientToEdit) {
      // Transform fetched data to match form structure for editing
      const transformedPatient = {
        ...patientToEdit,
        fechaNacimiento: patientToEdit.fechaNacimiento instanceof Timestamp
          ? patientToEdit.fechaNacimiento.toDate()
          : patientToEdit.fechaNacimiento instanceof Date
            ? patientToEdit.fechaNacimiento
            : new Date(defaultPatientValues.fechaNacimiento), // Use default if invalid
        alergias: (patientToEdit.alergias || []).map((allergy) => ({ value: allergy })),
        medicamentosActuales: (patientToEdit.medicamentosActuales || []).map((med) => ({ value: med })),
        // Keep read-only fields
        fechaRegistro: patientToEdit.fechaRegistro,
        creadoPor: patientToEdit.creadoPor,
        activo: patientToEdit.activo,
      };
      form.reset(transformedPatient);
      form.trigger();
    } else {
      // Reset to default values for new patient creation
      form.reset(defaultPatientValues);
    }
  }, [patientToEdit, form.reset, form.trigger]);

  const onSubmit = async (values) => {
    const auth = getAuth();
    const user = auth.currentUser;

    // Prepare data for saving, ensuring fechaNacimiento is a Timestamp
    const dataToSave = {
      ...values,
      fechaNacimiento: values.fechaNacimiento instanceof Date
        ? Timestamp.fromDate(values.fechaNacimiento)
        : values.fechaNacimiento, // Keep as is if it's already a Timestamp or string
      alergias: values.alergias.map((a) => a.value).filter(Boolean),
      medicamentosActuales: values.medicamentosActuales.map((m) => m.value).filter(Boolean),
    };

    // Remove fields that should not be updated or are internal
    delete dataToSave.fechaRegistro;
    delete dataToSave.creadoPor;
    delete dataToSave.id; // Ensure the 'id' field is not included in the data to save

    const patientId = patientToEdit?.id; // Get the ID from the prop

    try {
      if (patientId) {
        // Update existing patient using the patientId
        const patientRef = doc(patientService.db, "pacientes", patientId);
        await updateDoc(patientRef, dataToSave);
        toast({
          title: "Éxito",
          description: "Paciente actualizado correctamente.",
        });
      } else {
        // Add new patient
        const newDataToSave = {
          ...dataToSave,
          fechaRegistro: Timestamp.now(),
          creadoPor: user?.uid || "unknown",
          activo: true, // New patients are active by default
        };
        await patientService.add(newDataToSave);
        toast({
          title: "Éxito",
          description: "Paciente registrado correctamente.",
        });
      }
      onFinished(); // Close modal and refresh list
    } catch (error) {
      console.error("Error saving patient:", error);
      toast({
        title: "Error",
        description: patientId
          ? "Ocurrió un error al actualizar el paciente."
          : "Ocurrió un error al registrar el paciente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apellidos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellidos</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fechaNacimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Nacimiento</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    // Ensure the date input displays correctly
                    value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const dateString = e.target.value;
                      if (dateString) {
                        const date = new Date(dateString);
                        // Only update if the date is valid
                        field.onChange(isNaN(date.getTime()) ? undefined : date);
                      } else {
                        field.onChange(undefined); // Handle empty input
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cedula"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cédula</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sexo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="direccion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactoEmergenciaNombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Contacto Emergencia</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactoEmergenciaTelefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono Contacto Emergencia</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="grupoSanguineo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grupo Sanguíneo</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="aseguradora"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aseguradora</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numeroPoliza"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Póliza</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div>
            <FormLabel>Alergias</FormLabel>
            <div className="space-y-2 mt-2">
              {alergiasFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`alergias.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeAlergia(index)}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => appendAlergia({ value: "" })}
            >
              Agregar Alergia
            </Button>
          </div>

          <div>
            <FormLabel>Medicamentos Actuales</FormLabel>
            <div className="space-y-2 mt-2">
              {medicamentosFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`medicamentosActuales.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeMedicamento(index)}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => appendMedicamento({ value: "" })}
            >
              Agregar Medicamento
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="antecedentesFamiliares"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Antecedentes Familiares</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="antecedentesPersonales"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Antecedentes Personales</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid}>
            {form.formState.isSubmitting ? "Guardando..." : (patientToEdit ? "Actualizar Paciente" : "Guardar Paciente")}
          </Button>
        </div>
      </form>
    </Form>
  );
}