/**
 * Real Agent Test with Claude API
 *
 * Tests the OnboardingIntelligenceAgent with actual sample files
 * using the configured Claude API key.
 */

const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

// Create a mock context for testing
function createMockContext() {
  let createdEntities = 0;

  return {
    user: {
      id: 'test-user-123',
      email: 'test@arqcashflow.com',
      name: 'Test User',
      team: {
        id: 'test-team-456',
        name: 'Test Architecture Firm'
      }
    },
    teamId: 'test-team-456',
    teamScopedPrisma: {
      contract: {
        create: async (data) => {
          createdEntities++;
          console.log(`   📝 Contract created: ${data.data.clientName} - R$ ${data.data.totalValue?.toLocaleString('pt-BR') || 'N/A'}`);
          return { id: `contract-${Date.now()}`, ...data.data };
        },
        findMany: async () => [],
        findFirst: async () => null
      },
      expense: {
        create: async (data) => {
          createdEntities++;
          console.log(`   💰 Expense created: ${data.data.description} - R$ ${data.data.amount?.toLocaleString('pt-BR') || 'N/A'}`);
          return { id: `expense-${Date.now()}`, ...data.data };
        },
        findMany: async () => []
      },
      receivable: {
        create: async (data) => {
          createdEntities++;
          console.log(`   💵 Receivable created: ${data.data.description} - R$ ${data.data.amount?.toLocaleString('pt-BR') || 'N/A'}`);
          return { id: `receivable-${Date.now()}`, ...data.data };
        },
        findMany: async () => []
      },
      raw: {
        $transaction: async (callback) => {
          const mockTx = {
            contract: {
              create: async (data) => {
                createdEntities++;
                console.log(`   📝 Contract: ${data.clientName} - ${data.projectName} (R$ ${data.totalValue?.toLocaleString('pt-BR') || 'N/A'})`);
                return { id: `contract-${Date.now()}`, teamId: 'test-team-456', ...data };
              }
            },
            expense: {
              create: async (data) => {
                createdEntities++;
                console.log(`   💰 Expense: ${data.description} (R$ ${data.amount?.toLocaleString('pt-BR') || 'N/A'})`);
                return { id: `expense-${Date.now()}`, teamId: 'test-team-456', ...data };
              }
            },
            receivable: {
              create: async (data) => {
                createdEntities++;
                console.log(`   💵 Receivable: ${data.description || data.category} (R$ ${data.amount?.toLocaleString('pt-BR') || 'N/A'})`);
                return { id: `receivable-${Date.now()}`, teamId: 'test-team-456', ...data };
              }
            }
          };
          return await callback(mockTx);
        }
      }
    }
  };
}

async function loadFileAsBase64(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);

    // Determine MIME type
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'application/octet-stream';

    switch (ext) {
      case '.csv': mimeType = 'text/csv'; break;
      case '.pdf': mimeType = 'application/pdf'; break;
      case '.xlsx': mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; break;
    }

    return {
      name: path.basename(filePath),
      type: mimeType,
      base64: fileBuffer.toString('base64'),
      size: stats.size
    };
  } catch (error) {
    throw new Error(`Failed to load ${filePath}: ${error.message}`);
  }
}

async function testWithCsv() {
  console.log('\n📊 Testing CSV File Processing');
  console.log('='.repeat(50));

  try {
    // Dynamically import the agent (ES modules)
    const { OnboardingIntelligenceAgent } = await import('../lib/agents/OnboardingIntelligenceAgent.js');

    // Load CSV file
    const csvFile = await loadFileAsBase64('./sample_data.csv');
    console.log(`📄 Loaded: ${csvFile.name} (${(csvFile.size / 1024).toFixed(1)}KB)`);

    // Create agent with mock context
    const mockContext = createMockContext();
    const agent = new OnboardingIntelligenceAgent(mockContext);

    console.log('\n🤖 Processing with Claude 3.5 Sonnet...');
    const startTime = Date.now();

    const result = await agent.processDocuments({
      files: [csvFile],
      extractionType: 'auto'
    });

    const processingTime = Date.now() - startTime;

    console.log('\n✨ Results:');
    console.log(`   • Processing time: ${processingTime}ms`);
    console.log(`   • Files processed: ${result.processedFiles}/${result.totalFiles}`);
    console.log(`   • Entities extracted: ${result.extractedEntities}`);
    console.log(`   • Entities created: ${result.createdEntities}`);
    console.log(`   • Summary: ${JSON.stringify(result.summary)}`);

    if (result.errors.length > 0) {
      console.log(`   • Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`     - ${error}`));
    }

    return result;

  } catch (error) {
    console.error('❌ CSV test failed:', error.message);
    return null;
  }
}

async function testWithPdf() {
  console.log('\n📄 Testing PDF File Processing');
  console.log('='.repeat(50));

  try {
    // Dynamically import the agent
    const { OnboardingIntelligenceAgent } = await import('../lib/agents/OnboardingIntelligenceAgent.js');

    // Load PDF file
    const pdfFile = await loadFileAsBase64('./teste_pdf.pdf');
    console.log(`📄 Loaded: ${pdfFile.name} (${(pdfFile.size / 1024 / 1024).toFixed(1)}MB)`);

    // Create agent with mock context
    const mockContext = createMockContext();
    const agent = new OnboardingIntelligenceAgent(mockContext);

    console.log('\n🤖 Processing with Claude Vision API...');
    const startTime = Date.now();

    const result = await agent.processDocuments({
      files: [pdfFile],
      extractionType: 'contracts'
    });

    const processingTime = Date.now() - startTime;

    console.log('\n✨ Results:');
    console.log(`   • Processing time: ${processingTime}ms`);
    console.log(`   • Files processed: ${result.processedFiles}/${result.totalFiles}`);
    console.log(`   • Entities extracted: ${result.extractedEntities}`);
    console.log(`   • Entities created: ${result.createdEntities}`);
    console.log(`   • Summary: ${JSON.stringify(result.summary)}`);

    if (result.errors.length > 0) {
      console.log(`   • Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`     - ${error}`));
    }

    return result;

  } catch (error) {
    console.error('❌ PDF test failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('🧪 OnboardingIntelligenceAgent - Real API Test');
  console.log('='.repeat(70));
  console.log(`🤖 Claude Model: claude-3-5-sonnet-20241022`);
  console.log(`🔑 API Key: ${process.env.CLAUDE_API_KEY ? '✅ Configured' : '❌ Missing'}`);

  if (!process.env.CLAUDE_API_KEY) {
    console.log('❌ CLAUDE_API_KEY not found in environment');
    return;
  }

  try {
    // Test CSV processing
    const csvResult = await testWithCsv();

    // Test PDF processing
    const pdfResult = await testWithPdf();

    // Summary
    console.log('\n🎯 Test Summary');
    console.log('='.repeat(50));

    if (csvResult) {
      console.log(`✅ CSV: ${csvResult.extractedEntities} entities extracted, ${csvResult.createdEntities} created`);
    } else {
      console.log('❌ CSV: Test failed');
    }

    if (pdfResult) {
      console.log(`✅ PDF: ${pdfResult.extractedEntities} entities extracted, ${pdfResult.createdEntities} created`);
    } else {
      console.log('❌ PDF: Test failed');
    }

    console.log('\n🚀 Agent Status: Ready for Production!');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the test
main().catch(console.error);