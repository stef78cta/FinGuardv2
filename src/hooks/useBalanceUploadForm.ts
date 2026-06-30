import { useCallback, useRef, useState } from 'react';
import { startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import {
  parseExcelFile,
  type ParsedAccount,
  type ParseResult,
  type ValidationWarning,
} from '@/lib/excel-parser';
import { formatBlockingValidationErrors } from '@/lib/importPipeline';

/** Număr maxim de rânduri afișate în preview-ul tabelului */
export const BALANCE_PREVIEW_ROW_LIMIT = 50;

export type UploadStatus = 'idle' | 'parsing' | 'ready' | 'uploading' | 'success' | 'error';

export interface BalanceUploadTotals {
  opening_debit: number;
  opening_credit: number;
  debit_turnover: number;
  credit_turnover: number;
  closing_debit: number;
  closing_credit: number;
}

export interface BalanceUploadFormState {
  balanceMonth?: Date;
  uploadedFile: File | null;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  monthError: boolean;
  isDragging: boolean;
  parsedData: ParseResult | null;
  previewData: ParsedAccount[];
  validationErrors: string[];
  validationWarnings: ValidationWarning[];
  uploadErrorMessage: string | null;
  totals: BalanceUploadTotals | null;
  balanceRows: ParsedAccount[];
  duplicateAccounts: string[];
  accountsCount: number;
}

interface ResetUploadStateOptions {
  /** Dacă este setat, luna balanței este păstrată/actualizată după reset */
  keepBalanceMonth?: Date;
}

function extractDuplicateAccounts(parseResult: ParseResult | null): string[] {
  if (!parseResult) return [];

  const duplicateError = parseResult.blockingErrors.find(
    (err) => err.code === 'DUPLICATE_ACCOUNTS',
  );
  if (!duplicateError?.details) return [];

  const details = duplicateError.details as { duplicateCodes?: string[] };
  return details.duplicateCodes ?? [];
}

function buildValidationErrors(parseResult: ParseResult | null): string[] {
  if (!parseResult) return [];

  const messages: string[] = [];

  if (!parseResult.ok) {
    messages.push(formatBlockingValidationErrors(parseResult));
  }

  parseResult.rowErrors.forEach((rowErr) => {
    messages.push(`Rândul ${rowErr.rowIndex}: ${rowErr.message}`);
  });

  return messages;
}

const VALID_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Exportate pentru testare unitară a logicii de reset/validare */
export const balanceUploadFormUtils = {
  extractDuplicateAccounts,
  buildValidationErrors,
};

/**
 * Gestionează starea formularului de upload balanță, inclusiv resetarea completă
 * la schimbarea lunii balanței sau a fișierului selectat.
 */
export function useBalanceUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadGenerationRef = useRef(0);

  const [balanceMonth, setBalanceMonth] = useState<Date>();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [monthError, setMonthError] = useState(false);
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [previewData, setPreviewData] = useState<ParsedAccount[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [totals, setTotals] = useState<BalanceUploadTotals | null>(null);
  const [balanceRows, setBalanceRows] = useState<ParsedAccount[]>([]);
  const [duplicateAccounts, setDuplicateAccounts] = useState<string[]>([]);
  const [accountsCount, setAccountsCount] = useState(0);

  /**
   * Curăță toată starea temporară a formularului de upload.
   * Opțional păstrează luna balanței (la schimbarea lunii).
   */
  const resetUploadState = useCallback((options?: ResetUploadStateOptions) => {
    uploadGenerationRef.current += 1;

    setUploadedFile(null);
    setIsDragging(false);
    setUploadProgress(0);
    setUploadStatus('idle');
    setMonthError(false);
    setParsedData(null);
    setPreviewData([]);
    setValidationErrors([]);
    setValidationWarnings([]);
    setUploadErrorMessage(null);
    setTotals(null);
    setBalanceRows([]);
    setDuplicateAccounts([]);
    setAccountsCount(0);

    if (options && 'keepBalanceMonth' in options) {
      setBalanceMonth(options.keepBalanceMonth);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const applyParseResult = useCallback(
    (parseResult: ParseResult, file: File, generation: number) => {
      if (generation !== uploadGenerationRef.current) return;

      setParsedData(parseResult);
      setPreviewData(parseResult.accounts.slice(0, BALANCE_PREVIEW_ROW_LIMIT));
      setBalanceRows(parseResult.accounts);
      setValidationWarnings(parseResult.warnings);
      setValidationErrors(buildValidationErrors(parseResult));
      setDuplicateAccounts(extractDuplicateAccounts(parseResult));
      setTotals(parseResult.totals);
      setAccountsCount(parseResult.accountsCount);
      setUploadedFile(file);

      if (parseResult.ok) {
        setUploadStatus('ready');
        setUploadErrorMessage(null);
        toast.success('Fișier selectat și validat cu succes!');
        return;
      }

      setUploadStatus('error');
      toast.error('Fișierul conține erori de validare. Corectați fișierul înainte de import.');
    },
    [],
  );

  const handleBalanceMonthChange = useCallback(
    (date: Date | undefined) => {
      if (date) {
        resetUploadState({ keepBalanceMonth: startOfMonth(date) });
      } else {
        resetUploadState();
        setBalanceMonth(undefined);
      }
    },
    [resetUploadState],
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!VALID_FILE_TYPES.includes(file.type)) {
        toast.error(
          'Format fișier neacceptat. Vă rugăm să încărcați un fișier Excel (.xlsx, .xls)',
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error('Fișierul depășește dimensiunea maximă de 10MB');
        return;
      }

      resetUploadState(
        balanceMonth ? { keepBalanceMonth: balanceMonth } : undefined,
      );

      const generation = uploadGenerationRef.current;
      setUploadedFile(file);
      setUploadStatus('parsing');

      try {
        const parseResult = await parseExcelFile(file);
        applyParseResult(parseResult, file, generation);
      } catch (error) {
        if (generation !== uploadGenerationRef.current) return;

        console.error('[useBalanceUploadForm] Parse error:', error);
        setUploadedFile(file);
        setUploadStatus('error');
        setUploadErrorMessage('Eroare la parsarea fișierului Excel.');
        toast.error('Eroare la parsarea fișierului Excel.');
      }
    },
    [applyParseResult, balanceMonth, resetUploadState],
  );

  const handleRemoveFile = useCallback(() => {
    resetUploadState(balanceMonth ? { keepBalanceMonth: balanceMonth } : undefined);
  }, [balanceMonth, resetUploadState]);

  const beginUpload = useCallback(() => {
    setMonthError(false);
    setUploadErrorMessage(null);
    setUploadStatus('uploading');
    setUploadProgress(10);
    return uploadGenerationRef.current;
  }, []);

  const completeUpload = useCallback(
    (generation: number) => {
      if (generation !== uploadGenerationRef.current) return;

      setUploadProgress(100);
      setUploadStatus('success');
    },
    [],
  );

  const failUpload = useCallback(
    (generation: number, errorMessage: string) => {
      if (generation !== uploadGenerationRef.current) return;

      setUploadStatus('error');
      setUploadErrorMessage(errorMessage);
    },
    [],
  );

  const resetAfterSuccessfulImport = useCallback(
    (generation: number) => {
      if (generation !== uploadGenerationRef.current) return;
      resetUploadState();
    },
    [resetUploadState],
  );

  const isUploadFormDirty =
    uploadedFile !== null ||
    parsedData !== null ||
    validationErrors.length > 0 ||
    validationWarnings.length > 0 ||
    uploadErrorMessage !== null ||
    uploadStatus === 'uploading' ||
    uploadStatus === 'parsing';

  return {
    fileInputRef,
    balanceMonth,
    uploadedFile,
    isDragging,
    setIsDragging,
    uploadProgress,
    setUploadProgress,
    uploadStatus,
    monthError,
    setMonthError,
    parsedData,
    previewData,
    validationErrors,
    validationWarnings,
    uploadErrorMessage,
    totals,
    balanceRows,
    duplicateAccounts,
    accountsCount,
    isUploadFormDirty,
    resetUploadState,
    handleBalanceMonthChange,
    handleFileSelect,
    handleRemoveFile,
    beginUpload,
    completeUpload,
    failUpload,
    resetAfterSuccessfulImport,
  };
}
