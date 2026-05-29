"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";


export default function SignupPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  if (password.length < 6) {
  alert("La contraseña debe tener al menos 6 caracteres");
  return;
}

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    await setDoc(doc(db, "usuarios", user.uid), {
      uid: user.uid,
      nombre,
      apellidos,
      email,
      telefono,
      rol: "doctor",
      activo: true,
      fotoPerfil: "",
      fechaCreacion: serverTimestamp(),
      ultimoAcceso: serverTimestamp(),
    });

    alert("Cuenta creada correctamente");

    router.push("/inicio");
  } catch (error: any) {
    console.error(error);

    alert(error.message);
  }
};

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Crear Cuenta
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Registro de usuarios MediNotes
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
            required
          />

          <input
            type="text"
            placeholder="Apellidos"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
            required
          />

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
            required
          />

          <input
            type="text"
            placeholder="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
          >
            Crear Cuenta
          </button>
        </form>

        <button
          onClick={() => router.push("/login")}
          className="w-full mt-4 text-sm text-blue-600 hover:underline"
        >
          Volver al login
        </button>
      </div>
    </div>
  );
}