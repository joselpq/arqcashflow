"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingFileUpload from "../components/onboarding/OnboardingFileUpload";
import OnboardingChatContainer from "../components/onboarding/OnboardingChatContainer";
import ChipButtons from "../components/onboarding/ChipButtons";
import ChatFileUpload from "../components/onboarding/ChatFileUpload";
import EducationPhase from "../components/onboarding/EducationPhase";
import StreamingMessage from "../components/onboarding/StreamingMessage";

type UserType = "individual" | "small_business";

interface ProfileData {
  type: UserType;
  profession?: string;
  employeeCount?: string;
  revenueTier?: string;
}

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  isStreaming?: boolean;
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

  // Chat-based onboarding state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Olá! Sou Arnaldo, seu assistente financeiro 👋' },
    { role: 'assistant', content: 'Vamos começar configurando seu perfil. Você é profissional individual ou tem uma empresa?' }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [hasSpreadsheet, setHasSpreadsheet] = useState<boolean | null>(null);
  const [totalUploaded, setTotalUploaded] = useState({ contracts: 0, receivables: 0, expenses: 0 });
  const [showEducation, setShowEducation] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleChatResponse = async (value: string) => {
    // First question: Business type
    if (currentQuestion === 0) {
      const responseLabel = value === 'individual' ? 'Profissional Individual' : 'Pequena Empresa';
      setChatMessages(prev => [...prev, { role: 'user', content: responseLabel }]);
      setProfileData({ ...profileData, type: value as UserType });

      // Ask next question: Business profession
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Qual é sua área de atuação?' }]);
      setCurrentQuestion(1);
    }
    // Second question: Business profession/field
    else if (currentQuestion === 1) {
      const professionOptions = [
        { label: 'Arquitetura', value: 'arquitetura' },
        { label: 'Engenharia Civil', value: 'engenharia-civil' },
        { label: 'Design de Interiores', value: 'design-interiores' },
        { label: 'Paisagismo', value: 'paisagismo' },
        { label: 'Urbanismo', value: 'urbanismo' },
        { label: 'Outros', value: 'outros' }
      ];
      const selectedOption = professionOptions.find(opt => opt.value === value);
      setChatMessages(prev => [...prev, { role: 'user', content: selectedOption?.label || value }]);
      setProfileData(prev => ({ ...prev, profession: value }));

      // Ask next question: Employee count
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Quantas pessoas trabalham no negócio?' }]);
      setCurrentQuestion(2);
    }
    // Third question: Employee count
    else if (currentQuestion === 2) {
      const employeeCountOptions = [
        { label: '1 pessoa (só eu)', value: '1' },
        { label: '2-5 pessoas', value: '2-5' },
        { label: '6-10 pessoas', value: '6-10' },
        { label: '11-20 pessoas', value: '11-20' },
        { label: '20+ pessoas', value: '20+' }
      ];
      const selectedOption = employeeCountOptions.find(opt => opt.value === value);
      setChatMessages(prev => [...prev, { role: 'user', content: selectedOption?.label || value }]);
      setProfileData(prev => ({ ...prev, employeeCount: value }));

      // Ask next question
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Qual é aproximadamente seu faturamento mensal? Tudo bem se não tiver certeza' }]);
      setCurrentQuestion(3);
    }
    // Fourth question: Revenue tier
    else if (currentQuestion === 3) {
      const revenueOptions = [
        { label: 'Até R$ 10 mil', value: '0-10k' },
        { label: 'R$ 10 mil a R$ 50 mil', value: '10k-50k' },
        { label: 'R$ 50 mil a R$ 100 mil', value: '50k-100k' },
        { label: 'Acima de R$ 100 mil', value: '100k+' }
      ];
      const selectedOption = revenueOptions.find(opt => opt.value === value);
      setChatMessages(prev => [...prev, { role: 'user', content: selectedOption?.label || value }]);
      setProfileData(prev => ({ ...prev, revenueTier: value }));

      // Ask spreadsheet question
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Você tem alguma planilha onde controla seus projetos, recebíveis e despesas?' }]);
      setCurrentQuestion(4);
    }
    // Fifth question: Has spreadsheet
    else if (currentQuestion === 4) {
      const responseLabel = value === 'yes' ? 'Sim' : 'Não';
      setChatMessages(prev => [...prev, { role: 'user', content: responseLabel }]);

      // Save profile first
      await handleProfileSubmit();

      if (value === 'yes') {
        // User has spreadsheet - show upload
        setHasSpreadsheet(true);
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Ótimo! Envie seus arquivos abaixo (planilhas, PDFs ou imagens):' }]);
        setShowFileUpload(true);
        setCurrentQuestion(5);
      } else {
        // User doesn't have spreadsheet - show education phase
        setHasSpreadsheet(false);
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sem problema! Você pode adicionar seus dados manualmente depois.' }]);
        setCurrentQuestion(6);
        // Show education phase after a brief delay
        setTimeout(() => {
          setShowEducation(true);
        }, 1500);
      }
    }
    // Sixth question: More files?
    else if (currentQuestion === 5) {
      const responseLabel = value === 'yes' ? 'Sim, tenho mais' : 'Não, estou pronto(a)';
      setChatMessages(prev => [...prev, { role: 'user', content: responseLabel }]);

      if (value === 'yes') {
        // Show upload again
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Perfeito! Envie mais arquivos abaixo:' }]);
        setShowFileUpload(true);
      } else {
        // Show education phase
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Excelente!' }]);
        setCurrentQuestion(6);
        setTimeout(() => {
          setShowEducation(true);
        }, 1000);
      }
    }
  };

  const handleProfileSubmit = async (finalRevenueTier?: string) => {
    setLoading(true);
    setError("");

    try {
      // Prepare data with final revenue tier if provided
      const dataToSubmit = finalRevenueTier
        ? { ...profileData, revenueTier: finalRevenueTier }
        : profileData;

      const response = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) throw new Error("Failed to save profile");

      setLoading(false);
    } catch (err) {
      setError("Erro ao salvar perfil. Tente novamente.");
      setLoading(false);
    }
  };

  const loadingMessages = [
    'Analisando a estrutura dos seus arquivos... ☕',
    'Identificando contratos e projetos... 📋',
    'Extraindo recebíveis... 💰',
    'Processando despesas... 📊',
    'Organizando tudo para você... 🗂️',
    'Validando os dados... ✅',
    'Quase lá! Finalizando... 🎯'
  ];

  const handleFileUploadStart = () => {
    // Keep file upload visible (it will hide its drop zone internally)
    // Start with first message (streaming)
    setLoadingMessageIndex(0);
    setChatMessages(prev => [...prev, { role: 'assistant', content: loadingMessages[0], isStreaming: true }]);

    // Rotate through messages every 4 seconds
    let currentIndex = 0;
    loadingIntervalRef.current = setInterval(() => {
      currentIndex = (currentIndex + 1) % loadingMessages.length;
      setLoadingMessageIndex(currentIndex);

      // Update the last message with new content (will trigger streaming restart)
      setChatMessages(prev => {
        const newMessages = [...prev];
        // Find the last assistant message (loading message)
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'assistant' && newMessages[i].isStreaming) {
            newMessages[i] = { role: 'assistant', content: loadingMessages[currentIndex], isStreaming: true };
            break;
          }
        }
        return newMessages;
      });
    }, 4000); // Change message every 4 seconds
  };

  // Cleanup interval when component unmounts or upload completes
  useEffect(() => {
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, []);

  const handleFileUploadComplete = (results: { totalContracts: number; totalReceivables: number; totalExpenses: number; totalErrors: number; success: boolean }) => {
    // Clear loading message rotation
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }

    // Update cumulative totals
    setTotalUploaded(prev => ({
      contracts: prev.contracts + results.totalContracts,
      receivables: prev.receivables + results.totalReceivables,
      expenses: prev.expenses + results.totalExpenses
    }));

    // Replace loading message with success summary
    const summary = `Pronto! Encontrei ${results.totalContracts} contrato${results.totalContracts !== 1 ? 's' : ''}, ${results.totalReceivables} recebíve${results.totalReceivables !== 1 ? 'is' : 'l'} e ${results.totalExpenses} despesa${results.totalExpenses !== 1 ? 's' : ''}.`;

    setChatMessages(prev => {
      const newMessages = [...prev];
      // Replace the loading message with the summary (no longer streaming)
      for (let i = newMessages.length - 1; i >= 0; i--) {
        if (newMessages[i].role === 'assistant' && newMessages[i].isStreaming) {
          newMessages[i] = { role: 'assistant', content: summary, isStreaming: false };
          break;
        }
      }
      return newMessages;
    });

    // Ask if user wants to upload more
    setChatMessages(prev => [...prev, { role: 'assistant', content: 'Tem outros arquivos para importar?' }]);

    // Hide file upload to show chip buttons
    setShowFileUpload(false);
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

        {/* Step 1: Chat-Based Profile Setup */}
        {currentStep === 1 && (
          <OnboardingChatContainer
            actions={
              <>
                {/* Show chip buttons for current question */}
                {currentQuestion === 0 && (
                  <ChipButtons
                    options={[
                      { label: 'Profissional Individual', value: 'individual' },
                      { label: 'Pequena Empresa', value: 'small_business' }
                    ]}
                    onSelect={handleChatResponse}
                    disabled={loading}
                  />
                )}

                {currentQuestion === 1 && (
                  <ChipButtons
                    options={[
                      { label: 'Arquitetura', value: 'arquitetura' },
                      { label: 'Engenharia Civil', value: 'engenharia-civil' },
                      { label: 'Design de Interiores', value: 'design-interiores' },
                      { label: 'Paisagismo', value: 'paisagismo' },
                      { label: 'Urbanismo', value: 'urbanismo' },
                      { label: 'Outros', value: 'outros' }
                    ]}
                    onSelect={handleChatResponse}
                    disabled={loading}
                  />
                )}

                {currentQuestion === 2 && (
                  <ChipButtons
                    options={[
                      { label: '1 pessoa (só eu)', value: '1' },
                      { label: '2-5 pessoas', value: '2-5' },
                      { label: '6-10 pessoas', value: '6-10' },
                      { label: '11-20 pessoas', value: '11-20' },
                      { label: '20+ pessoas', value: '20+' }
                    ]}
                    onSelect={handleChatResponse}
                    disabled={loading}
                  />
                )}

                {currentQuestion === 3 && (
                  <ChipButtons
                    options={[
                      { label: 'Até R$ 10 mil', value: '0-10k' },
                      { label: 'R$ 10 mil a R$ 50 mil', value: '10k-50k' },
                      { label: 'R$ 50 mil a R$ 100 mil', value: '50k-100k' },
                      { label: 'Acima de R$ 100 mil', value: '100k+' }
                    ]}
                    onSelect={handleChatResponse}
                    disabled={loading}
                  />
                )}

                {currentQuestion === 4 && (
                  <ChipButtons
                    options={[
                      { label: 'Sim', value: 'yes' },
                      { label: 'Não', value: 'no' }
                    ]}
                    onSelect={handleChatResponse}
                    disabled={loading}
                  />
                )}


                {/* Show "more files?" buttons after upload */}
                {currentQuestion === 5 && !showFileUpload && (
                  <ChipButtons
                    options={[
                      { label: 'Sim, tenho mais', value: 'yes' },
                      { label: 'Não, estou pronto(a)', value: 'no' }
                    ]}
                    onSelect={handleChatResponse}
                    disabled={loading}
                  />
                )}

                {/* Show loading state */}
                {loading && currentQuestion === 6 && (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {/* Show error if any */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                    {error}
                  </div>
                )}
              </>
            }
          >
            {/* Render chat messages */}
            {chatMessages.map((msg, index) => (
              msg.isStreaming ? (
                // Use StreamingMessage for loading messages
                <StreamingMessage
                  key={`${index}-${msg.content}`} // Include content in key to restart on content change
                  content={msg.content}
                  speed={2}
                  interval={30}
                  keepCursorAfterComplete={true} // Keep cursor blinking to show "thinking"
                />
              ) : (
                // Regular static message
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-100 text-neutral-900'
                    }`}
                  >
                    <p className="text-base leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              )
            ))}

            {/* Show file upload when user has spreadsheet */}
            {currentQuestion === 5 && showFileUpload && (
              <ChatFileUpload
                onUploadStart={handleFileUploadStart}
                onUploadComplete={handleFileUploadComplete}
              />
            )}

            {/* Show education phase */}
            {showEducation && (
              <EducationPhase onComplete={handleCompleteOnboarding} />
            )}
          </OnboardingChatContainer>
        )}

        {/* Step 2: Data Import */}
        {currentStep === 2 &&  !importResults && (
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

        {/* Step 3: Import Results - keep existing */}
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
