"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  async function login() {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    alert("Please enter your email.");
    return;
  }

  const { data, error } = await supabase
    .from("admins")
    .select("id, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error("Supabase login error:", error);
    alert(`Login error: ${error.message}`);
    return;
  }

  if (!data) {
    alert("Access denied. This email is not registered.");
    return;
  }

  localStorage.setItem("adminEmail", data.email);
  router.push("/chat");
}

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-[400px] rounded-xl border p-8 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold">
          Admin Login
        </h1>

        <input
          className="mb-4 w-full rounded border p-3"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full rounded bg-blue-600 p-3 text-white"
        >
          Login
        </button>
      </div>
    </main>
  );
}