"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingFileUpload from "../components/onboarding/OnboardingFileUpload";

type UserType = "individual" | "company";

interface ProfileData {
  type: UserType;
  companyName?: string;
  companyActivity?: string;
  employeeCount?: string;
  revenueTier?: string;
  profession?: string;
}

interface OnboardingResults {
  totalContracts: number;
  totalReceivables: number;
  totalExpenses: number;
  totalErrors: number;
  success: boolean;
  message: string;
}

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState<ProfileData>({
    type: "individual",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importResults, setImportResults] = useState<OnboardingResults | null>(null);

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

  const handleImportComplete = async (results: OnboardingResults) => {
    setImportResults(results);

    try {
      // Mark onboarding as complete
      await fetch("/api/onboarding/complete", { method: "POST" });

      // Show results briefly, then redirect
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err) {
      setError("Erro ao finalizar onboarding. Redirecionando...");
      setTimeout(() => {
        router.push("/");
      }, 2000);
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-blue-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full">
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
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 border border-neutral-200">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 mb-3 sm:mb-4">
                Bem-vindo ao ArqCashflow! 🎉
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-neutral-600 max-w-4xl mx-auto px-4">
                Vamos personalizar sua experiência em menos de 2 minutos
              </p>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <div>
                <label className="block text-sm sm:text-base font-medium text-neutral-700 mb-4">
                  Você está usando como:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <button
                    onClick={() => setProfileData({ ...profileData, type: "individual" })}
                    className={`p-4 sm:p-6 rounded-lg border-2 transition-all text-center ${
                      profileData.type === "individual"
                        ? "border-blue-600 bg-blue-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-3xl sm:text-4xl mb-3">👤</div>
                    <div className="font-medium text-neutral-900 text-base sm:text-lg mb-1">Profissional Liberal</div>
                    <div className="text-sm sm:text-base text-neutral-500">Autônomo, freelancer</div>
                  </button>
                  <button
                    onClick={() => setProfileData({ ...profileData, type: "company" })}
                    className={`p-4 sm:p-6 rounded-lg border-2 transition-all text-center ${
                      profileData.type === "company"
                        ? "border-blue-600 bg-blue-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-3xl sm:text-4xl mb-3">🏢</div>
                    <div className="font-medium text-neutral-900 text-base sm:text-lg mb-1">Empresa</div>
                    <div className="text-sm sm:text-base text-neutral-500">Pessoa jurídica</div>
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
                    className="w-full px-4 py-3 border border-neutral-400 rounded-lg text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-4 py-3 border border-neutral-400 rounded-lg text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Studio Arquitetura Ltda"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Qual o ramo da sua empresa?
                    </label>
                    <select
                      value={profileData.companyActivity || ""}
                      onChange={(e) => setProfileData({ ...profileData, companyActivity: e.target.value })}
                      className="w-full px-4 py-3 border border-neutral-400 rounded-lg text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="architecture">Arquitetura e Urbanismo</option>
                      <option value="engineering">Engenharia</option>
                      <option value="construction">Construção Civil</option>
                      <option value="interior-design">Design de Interiores</option>
                      <option value="landscaping">Paisagismo</option>
                      <option value="consulting">Consultoria</option>
                      <option value="legal">Serviços Jurídicos</option>
                      <option value="healthcare">Saúde e Medicina</option>
                      <option value="technology">Tecnologia</option>
                      <option value="marketing">Marketing e Publicidade</option>
                      <option value="accounting">Contabilidade</option>
                      <option value="education">Educação</option>
                      <option value="real-estate">Imobiliário</option>
                      <option value="retail">Comércio</option>
                      <option value="services">Prestação de Serviços</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Quantos funcionários?
                    </label>
                    <select
                      value={profileData.employeeCount || ""}
                      onChange={(e) => setProfileData({ ...profileData, employeeCount: e.target.value })}
                      className="w-full px-4 py-3 border border-neutral-400 rounded-lg text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-4 py-3 border border-neutral-400 rounded-lg text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

              <div className="flex space-x-4">
                <button
                  onClick={handleProfileSubmit}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Continuar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Data Import */}
        {currentStep === 2 && !importResults && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 border border-neutral-200">
            <div className="text-center mb-8 sm:mb-10">
              <div className="text-5xl sm:text-6xl mb-4">📂</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 mb-3 sm:mb-4">
                Importe seus dados existentes
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-neutral-600 max-w-4xl mx-auto px-4">
                Envie múltiplos arquivos (planilhas, PDFs, imagens) e organizaremos tudo para você
              </p>
            </div>

            <OnboardingFileUpload
              onComplete={handleImportComplete}
              onSkip={handleSkip}
              onBack={() => setCurrentStep(1)}
              loading={loading}
            />

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Import Results */}
        {currentStep === 2 && importResults && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 border border-neutral-200">
            <div className="text-center mb-8">
              <div className="text-5xl sm:text-6xl mb-4">🎉</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 mb-3 sm:mb-4">
                Importação Concluída!
              </h2>
              <p className="text-base sm:text-lg text-neutral-600">
                {importResults.message}
              </p>
            </div>

            {/* Results Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{importResults.totalContracts}</div>
                <div className="text-sm text-green-600">Contratos</div>
              </div>
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{importResults.totalReceivables}</div>
                <div className="text-sm text-blue-600">Recebíveis</div>
              </div>
              <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-2xl font-bold text-amber-700">{importResults.totalExpenses}</div>
                <div className="text-sm text-amber-600">Despesas</div>
              </div>
            </div>

            {importResults.totalErrors > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ {importResults.totalErrors} erro(s) encontrado(s). Você pode revisar e ajustar depois.
                </p>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-neutral-600 mb-4">
                Redirecionando para o painel principal em alguns segundos...
              </p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}