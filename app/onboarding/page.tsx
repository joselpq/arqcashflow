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
  const [cumulativeResults, setCumulativeResults] = useState<OnboardingResults>({
    totalContracts: 0,
    totalReceivables: 0,
    totalExpenses: 0,
    totalErrors: 0,
    success: false,
    message: ""
  });

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

    // Accumulate results for when user adds more files
    setCumulativeResults(prev => ({
      totalContracts: prev.totalContracts + results.totalContracts,
      totalReceivables: prev.totalReceivables + results.totalReceivables,
      totalExpenses: prev.totalExpenses + results.totalExpenses,
      totalErrors: prev.totalErrors + results.totalErrors,
      success: true,
      message: `Total processado: ${prev.totalContracts + results.totalContracts} contratos, ${prev.totalReceivables + results.totalReceivables} recebíveis, ${prev.totalExpenses + results.totalExpenses} despesas`
    }));
    // Remove auto-redirect - let user control when to complete
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      // Mark onboarding as complete
      await fetch("/api/onboarding/complete", { method: "POST" });
      router.push("/");
    } catch (err) {
      setError("Erro ao finalizar onboarding. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoreFiles = () => {
    // Reset to file upload state but keep cumulative results
    setImportResults(null);
    // Step stays at 2 to show file upload again
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
                {cumulativeResults.success ? "Adicione mais arquivos" : "Importe seus dados existentes"}
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-neutral-600 max-w-4xl mx-auto px-4">
                Envie múltiplos arquivos (planilhas, PDFs, imagens) e organizaremos tudo para você
              </p>

              {/* Show cumulative progress if user has already imported some files */}
              {cumulativeResults.success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    ✅ Já importado: {cumulativeResults.totalContracts} contratos, {cumulativeResults.totalReceivables} recebíveis, {cumulativeResults.totalExpenses} despesas
                  </p>
                </div>
              )}
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
              <div className="text-5xl sm:text-6xl mb-4">✅</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 mb-3 sm:mb-4">
                Processamento Concluído!
              </h2>
              <p className="text-base sm:text-lg text-neutral-600">
                {importResults.message}
              </p>
            </div>

            {/* Enhanced Results Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-white border-2 border-green-300 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-green-700">{importResults.totalContracts}</div>
                <div className="text-sm font-medium text-green-600">Contratos Criados</div>
              </div>
              <div className="text-center p-4 bg-white border-2 border-blue-300 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-blue-700">{importResults.totalReceivables}</div>
                <div className="text-sm font-medium text-blue-600">Recebíveis Criados</div>
              </div>
              <div className="text-center p-4 bg-white border-2 border-amber-300 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-amber-700">{importResults.totalExpenses}</div>
                <div className="text-sm font-medium text-amber-600">Despesas Criadas</div>
              </div>
            </div>

            {importResults.totalErrors > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ {importResults.totalErrors} erro(s) encontrado(s). Você pode revisar e ajustar depois.
                </p>
              </div>
            )}

            {/* Action Buttons - Enhanced UX */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* View Created Entities */}
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {importResults.totalContracts > 0 && (
                    <a
                      href="/projetos?tab=contratos"
                      target="_blank"
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm text-center font-medium transition-colors"
                    >
                      Ver Contratos
                    </a>
                  )}
                  {importResults.totalReceivables > 0 && (
                    <a
                      href="/projetos?tab=recebiveis"
                      target="_blank"
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm text-center font-medium transition-colors"
                    >
                      Ver Recebíveis
                    </a>
                  )}
                  {importResults.totalExpenses > 0 && (
                    <a
                      href="/projetos?tab=despesas"
                      target="_blank"
                      className="bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700 text-sm text-center font-medium transition-colors"
                    >
                      Ver Despesas
                    </a>
                  )}
                </div>
              </div>

              {/* Main Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
                <button
                  onClick={handleAddMoreFiles}
                  className="flex-1 bg-neutral-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📁</span> Adicionar Mais Arquivos
                </button>
                <button
                  onClick={handleCompleteOnboarding}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Finalizando...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span> Concluir e Ir para o Dashboard
                    </>
                  )}
                </button>
              </div>

              {/* Optional Skip */}
              <div className="text-center">
                <button
                  onClick={handleSkip}
                  className="text-sm text-neutral-500 hover:text-neutral-700 underline"
                >
                  Pular e configurar depois
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}