"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UserType = "individual" | "company";

interface ProfileData {
  type: UserType;
  companyName?: string;
  companyActivity?: string;
  employeeCount?: string;
  revenueTier?: string;
  profession?: string;
}

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState<ProfileData>({
    type: "individual",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");

  const handleProfileSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) throw new Error("Failed to save profile");

      setCurrentStep(2);
    } catch (err) {
      setError("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDataImport = async () => {
    if (files.length === 0) {
      setError("Por favor, selecione pelo menos um arquivo");
      return;
    }

    setLoading(true);
    setError("");
    setUploadProgress("Processando arquivos...");

    try {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));

      const response = await fetch("/api/ai/setup-assistant-direct", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to process files");

      const result = await response.json();

      setUploadProgress(`Criados: ${result.contractsCreated} contratos, ${result.receivablesCreated} recebíveis, ${result.expensesCreated} despesas`);

      // Mark onboarding as complete
      await fetch("/api/onboarding/complete", { method: "POST" });

      setTimeout(() => {
        router.push("/");
      }, 2000);

    } catch (err) {
      setError("Erro ao processar arquivos. Tente novamente.");
      setUploadProgress("");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
      router.push("/");
    } catch (err) {
      setError("Erro ao pular. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-neutral-900 rounded flex items-center justify-center">
                <span className="text-white font-semibold text-sm">A</span>
              </div>
              <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">ArqCashflow</h1>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-neutral-300'}`} />
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-neutral-300'}`} />
            <div className={`w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-neutral-300'}`} />
          </div>
        </div>

        {/* Step 1: Profile Setup */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-200">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                Bem-vindo ao ArqCashflow! 🎉
              </h2>
              <p className="text-neutral-600">
                Vamos personalizar sua experiência em menos de 2 minutos
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Você está usando como:
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setProfileData({ ...profileData, type: "individual" })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      profileData.type === "individual"
                        ? "border-blue-600 bg-blue-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">👤</div>
                    <div className="font-medium text-neutral-900">Profissional Liberal</div>
                    <div className="text-sm text-neutral-500">Autônomo, freelancer</div>
                  </button>
                  <button
                    onClick={() => setProfileData({ ...profileData, type: "company" })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      profileData.type === "company"
                        ? "border-blue-600 bg-blue-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">🏢</div>
                    <div className="font-medium text-neutral-900">Empresa</div>
                    <div className="text-sm text-neutral-500">Pessoa jurídica</div>
                  </button>
                </div>
              </div>

              {profileData.type === "individual" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Qual sua profissão?
                  </label>
                  <select
                    value={profileData.profession || ""}
                    onChange={(e) => setProfileData({ ...profileData, profession: e.target.value })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="architect">Arquiteto(a)</option>
                    <option value="engineer">Engenheiro(a)</option>
                    <option value="lawyer">Advogado(a)</option>
                    <option value="doctor">Médico(a)</option>
                    <option value="dentist">Dentista</option>
                    <option value="designer">Designer</option>
                    <option value="consultant">Consultor(a)</option>
                    <option value="developer">Desenvolvedor(a)</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              )}

              {profileData.type === "company" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Nome da empresa
                    </label>
                    <input
                      type="text"
                      value={profileData.companyName || ""}
                      onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Studio Arquitetura Ltda"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      O que a empresa faz?
                    </label>
                    <input
                      type="text"
                      value={profileData.companyActivity || ""}
                      onChange={(e) => setProfileData({ ...profileData, companyActivity: e.target.value })}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Projetos arquitetônicos e design de interiores"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Quantos funcionários?
                    </label>
                    <select
                      value={profileData.employeeCount || ""}
                      onChange={(e) => setProfileData({ ...profileData, employeeCount: e.target.value })}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="1">Apenas eu</option>
                      <option value="2-5">2 a 5</option>
                      <option value="6-10">6 a 10</option>
                      <option value="11-20">11 a 20</option>
                      <option value="20+">Mais de 20</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Faturamento anual estimado
                    </label>
                    <select
                      value={profileData.revenueTier || ""}
                      onChange={(e) => setProfileData({ ...profileData, revenueTier: e.target.value })}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="0-100k">Até R$ 100 mil</option>
                      <option value="100k-500k">R$ 100 mil a R$ 500 mil</option>
                      <option value="500k-1M">R$ 500 mil a R$ 1 milhão</option>
                      <option value="1M+">Acima de R$ 1 milhão</option>
                    </select>
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleProfileSubmit}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Data Import */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-200">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                Agora a mágica acontece!
              </h2>
              <p className="text-neutral-600">
                Jogue seus arquivos aqui e organizamos tudo automaticamente
              </p>
            </div>

            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="text-4xl mb-4">📁</div>
                <p className="text-neutral-900 font-medium mb-2">
                  Clique para selecionar arquivos
                </p>
                <p className="text-sm text-neutral-500">
                  Planilhas Excel, PDFs, CSVs ou anotações em texto
                </p>
                <p className="text-xs text-neutral-400 mt-2">
                  Seus dados estão seguros e criptografados
                </p>
              </div>

              {files.length > 0 && (
                <div className="bg-neutral-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-neutral-700 mb-2">
                    Arquivos selecionados:
                  </p>
                  <ul className="space-y-1">
                    {files.map((file, index) => (
                      <li key={index} className="text-sm text-neutral-600 flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadProgress && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
                  {uploadProgress}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleDataImport}
                  disabled={loading || files.length === 0}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Processando..." : "Importar e Organizar"}
                </button>
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Pular por agora
                </button>
              </div>

              <p className="text-xs text-center text-neutral-500">
                Não se preocupe, você pode importar dados a qualquer momento depois
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}