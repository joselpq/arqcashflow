
// Auto-generated validation code
import * as React from 'react';
import { NextRequest, NextResponse } from 'next/server';

// Mock common ArqCashflow types
interface Contract {
  id: string;
  clientName: string;
  projectName: string;
  totalValue: number;
  signedDate: string;
  status: string;
  teamId: string;
}

interface Receivable {
  id: string;
  contractId?: string;
  amount: number;
  expectedDate: string;
  status: string;
  teamId: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  type: string;
  teamId: string;
}

// Mock globals
declare global {
  interface Window {
    [key: string]: any;
  }
  const process: any;
  const console: any;
  const require: any;
  const module: any;
  const exports: any;
  const __dirname: string;
  const __filename: string;
}

// Mock Next.js and React types
declare module 'next/server' {
  export class NextRequest {}
  export class NextResponse {
    static json(body: any): NextResponse;
  }
}

// Wrap code in async function to handle various patterns
async function validateCodeBlock() {
  try {
    const CurrencyInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}> = ({ label, value, onChange, error }) => {
  const [displayValue, setDisplayValue] = useState(
    value ? value.toString() : ''
  );

  const handleChange = (inputValue: string) => {
    setDisplayValue(inputValue);
    const numericValue = parseFloat(inputValue.replace(/[^\d.-]/g, ''));
    if (!isNaN(numericValue)) {
      onChange(numericValue);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">R$</span>
        </div>
        <input
          type="number"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()} // CRITICAL: Precision bug fix
          className={`block w-full pl-10 px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="0,00"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};
  } catch (e) {
    // Allow runtime errors, we only check syntax
  }
}
