
"use client";

import { useState } from "react";
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
import { Timestamp } from "firebase/firestore";

const patientSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellidos: z.string().min(1, "Los apellidos son requeridos"),
  fechaNacimiento: z.coerce.date(),
  cedula: z.string().optional(),
  sexo: z.enum(["masculino", "femenino", "otro"]),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional(),
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
});

export function NewPatientForm({ onFinished }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      cedula: "",
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
    },
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

  const onSubmit = async (values) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const dataToSave = {
        ...values,
        activo: true,
        fechaRegistro: Timestamp.now(),
        creadoPor: user.uid,
        fechaNacimiento: Timestamp.fromDate(values.fechaNacimiento),
        alergias: values.alergias.map((a) => a.value),
        medicamentosActuales: values.medicamentosActuales.map((m) => m.value),
      };

      await patientService.add(dataToSave);
      toast({
        title: "Éxito",
        description: "Paciente registrado correctamente.",
      });
      onFinished();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Ocurrió un error al registrar el paciente.",
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
                  <Input type="date" {...field} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''} />
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
                  defaultValue={field.value}
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
                  <Input
                    {...form.register(`alergias.${index}.value`)}
                    className="flex-grow"
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
                  <Input
                    {...form.register(`medicamentosActuales.${index}.value`)}
                    className="flex-grow"
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
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : "Guardar Paciente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
