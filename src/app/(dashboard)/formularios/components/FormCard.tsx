import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Edit, Archive, Eye, FileText } from "lucide-react";
import { FormularioClinico } from "@/lib/types/formulario.types";

interface FormCardProps {
  form: FormularioClinico;
  onEdit: (form: FormularioClinico) => void;
  onDuplicate: (form: FormularioClinico) => void;
  onArchive: (form: FormularioClinico) => void;
  onPreview: (form: FormularioClinico) => void;
}

export function FormCard({ form, onEdit, onDuplicate, onArchive, onPreview }: FormCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-gray-200">
      <CardHeader className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-5 h-5" />
              <CardTitle className="text-xl">{form.nombre}</CardTitle>
            </div>
            <CardDescription className="mt-2 text-sm text-gray-500">
              {form.descripcion || "Sin descripción"}
            </CardDescription>
          </div>
          <Badge className="text-xs">v{form.version}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-6 pt-0">
        <div className="flex flex-wrap gap-2">
          <Badge className="text-xs bg-emerald-50 text-emerald-700">Activo</Badge>
          <Badge className="text-xs">{form.especialidad || "General"}</Badge>
          <Badge className="text-xs">{form.campos.length} campos</Badge>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => onPreview(form)}>
            <Eye className="w-4 h-4 mr-2" />
            Previsualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(form)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDuplicate(form)}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicar
          </Button>
          <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => onArchive(form)}>
            <Archive className="w-4 h-4 mr-2" />
            Archivar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
