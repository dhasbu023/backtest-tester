import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Dataset, Timeframe, CSVPreviewResult } from '../../types/index.js';
import { fetchDatasets, previewCSV, importCSV, createSession } from "../../services/api.js";
import { getAllowedTimeframes } from '../../server/timeframeAggregator.js';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (sessionId: string) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'EXISTING' | 'UPLOAD'>('UPLOAD');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTfFilter, setSelectedTfFilter] = useState<string>('ALL');

  // Selected dataset for session
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSymbol, setUploadSymbol] = useState('XAUUSD');
  const [uploadName, setUploadName] = useState('');
  const [uploadTf, setUploadTf] = useState<Timeframe | ''>('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<CSVPreviewResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Session configuration step
  const [sessionName, setSessionName] = useState('');
  const [sessionTf, setSessionTf] = useState<Timeframe>('M1');
  const [sessionSpeed, setSessionSpeed] = useState<number>(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load datasets on open
  useEffect(() => {
    if (isOpen) {
      loadDatasets();
    }
  }, [isOpen]);

  const loadDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const data = await fetchDatasets();
      setDatasets(data);
      if (data.length > 0) {
        if (!selectedDataset) {
          setSelectedDataset(data[0]);
          setSessionName(`${data[0].symbol} Backtest ${new Date().toLocaleDateString('id-ID')}`);
          setSessionTf(data[0].timeframe);
        }
        setActiveTab('EXISTING');
      } else {
        // If 0 datasets exist, default directly to upload tab
        setActiveTab('UPLOAD');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDatasets(false);
    }
  };

  const handleSelectDataset = (ds: Dataset) => {
    setSelectedDataset(ds);
    setSessionName(`${ds.symbol} Backtest ${new Date().toLocaleDateString('id-ID')}`);
    setSessionTf(ds.timeframe);
    setErrorMessage(null);
  };

  // Handle CSV file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    const inferredName = file.name.replace(/\.[^/.]+$/, '');
    setUploadName(`${uploadSymbol} MT5 ${inferredName}`);
    setPreviewResult(null);
    setErrorMessage(null);

    setIsPreviewing(true);
    try {
      const content = await file.text();
      const preview = await previewCSV(content, file.name, uploadSymbol, uploadTf || undefined);
      setPreviewResult(preview);
      if (preview.detectedTimeframe && !uploadTf) {
        setUploadTf(preview.detectedTimeframe);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses file CSV');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Perform Import to PostgreSQL / Database
  const handlePerformImport = async () => {
    if (!uploadFile) return;

    setIsImporting(true);
    setImportProgress(25);
    setErrorMessage(null);

    try {
      const content = await uploadFile.text();
      setImportProgress(60);

      const res = await importCSV({
        csvContent: content,
        fileName: uploadFile.name,
        name: uploadName || `${uploadSymbol} MT5 Data`,
        symbol: uploadSymbol,
        timeframe: uploadTf || undefined,
      });

      setImportProgress(100);
      await loadDatasets();
      setSelectedDataset(res.dataset);
      setActiveTab('EXISTING');
      setUploadFile(null);
      setPreviewResult(null);
      setSessionName(`${res.dataset.symbol} Replay ${new Date().toLocaleDateString('id-ID')}`);
      setSessionTf(res.dataset.timeframe);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengimpor file CSV ke database.');
    } finally {
      setIsImporting(false);
    }
  };

  // Create session and launch
  const handleStartSession = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!selectedDataset) {
      setErrorMessage('Pilih atau upload dataset terlebih dahulu sebelum memulai backtest.');
      return;
    }
    if (!sessionName.trim()) {
      setErrorMessage('Nama sesi backtest tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    const effectiveTf = (allowedTimeframes.includes(sessionTf) ? sessionTf : selectedDataset.timeframe) as Timeframe;

    try {
      const res = await createSession({
        name: sessionName.trim(),
        datasetId: selectedDataset.id,
        activeTimeframe: effectiveTf,
        replaySpeed: sessionSpeed,
      });

      onClose();
      onSessionCreated(res.id);
    } catch (err: any) {
      setErrorMessage('Gagal membuat sesi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredDatasets = datasets.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTf = selectedTfFilter === 'ALL' || d.timeframe === selectedTfFilter;
    return matchesSearch && matchesTf;
  });

  const allowedTimeframes = selectedDataset ? getAllowedTimeframes(selectedDataset.timeframe) : ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Buat Sesi Backtest Baru
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih dataset MT5 yang tersimpan atau upload CSV baru untuk replay
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tabs: Existing vs Upload */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('EXISTING')}
              className={`pb-2.5 flex items-center gap-2 transition-colors relative cursor-pointer ${
                activeTab === 'EXISTING'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Pilihan A — Gunakan Dataset yang Tersedia ({datasets.length})</span>
              {activeTab === 'EXISTING' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('UPLOAD')}
              className={`pb-2.5 flex items-center gap-2 transition-colors relative cursor-pointer ${
                activeTab === 'UPLOAD'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Pilihan B — Upload Dataset MT5 Baru</span>
              {activeTab === 'UPLOAD' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          </div>

          {/* Tab Content: Existing */}
          {activeTab === 'EXISTING' && (
            <div className="space-y-3">
              {/* Filter & Search */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari dataset berdasarkan nama atau simbol..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={selectedTfFilter}
                  onChange={(e) => setSelectedTfFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="ALL">Semua TF</option>
                  <option value="M1">M1</option>
                  <option value="M5">M5</option>
                  <option value="M15">M15</option>
                  <option value="H1">H1</option>
                  <option value="D1">D1</option>
                </select>
              </div>

              {/* Dataset Cards List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {filteredDatasets.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-lg border-slate-300 dark:border-slate-800 space-y-2">
                    <p>Belum ada dataset yang di-upload ke database.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('UPLOAD')}
                      className="px-3 py-1 rounded-md bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 cursor-pointer"
                    >
                      Upload File MT5 CSV Sekarang
                    </button>
                  </div>
                ) : (
                  filteredDatasets.map((ds) => {
                    const isSelected = selectedDataset?.id === ds.id;
                    return (
                      <div
                        key={ds.id}
                        onClick={() => handleSelectDataset(ds)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {ds.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {ds.timeframe}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            READY ({ds.candleCount.toLocaleString()} candles)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Simbol: <b className="text-slate-700 dark:text-slate-300">{ds.symbol}</b></span>
                          <span>Format: {ds.sourceFormat}</span>
                          <span>
                            Rentang: {new Date(ds.startDate).toLocaleDateString('id-ID')} s/d {new Date(ds.endDate).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Upload New CSV */}
          {activeTab === 'UPLOAD' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-xl p-5 text-center border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-800/20">
                <input
                  type="file"
                  id="mt5-file-input"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="mt5-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      Pilih file MT5 CSV
                    </span>
                    <span className="text-xs text-slate-500"> atau seret ke sini</span>
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-sm">
                    Mendukung delimiter titik koma (<code className="text-blue-500 font-mono">;</code>), koma, atau tab MT5 standard: <code className="font-mono">Time;Open;High;Low;Close;TickVolume;RealVolume;Spread</code>
                  </p>
                </label>
              </div>

              {uploadFile && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>{uploadFile.name}</span>
                      <span className="text-slate-400 text-[11px]">
                        ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    {previewResult?.valid && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Valid MT5 CSV
                      </span>
                    )}
                  </div>

                  {/* Preview Metrics */}
                  {previewResult && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px]">
                      <div className="p-2 rounded bg-white dark:bg-slate-800">
                        <span className="text-slate-400 block">Valid Candles:</span>
                        <b className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          {previewResult.validRows.toLocaleString()}
                        </b>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-800">
                        <span className="text-slate-400 block">Timeframe Terdeteksi:</span>
                        <b className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                          {previewResult.detectedTimeframe}
                        </b>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-800">
                        <span className="text-slate-400 block">Rentang Harga:</span>
                        <b className="text-slate-800 dark:text-slate-200 font-mono text-xs">
                          {previewResult.minPrice?.toFixed(2)} - {previewResult.maxPrice?.toFixed(2)}
                        </b>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-800">
                        <span className="text-slate-400 block">Baris Duplikat/Invalid:</span>
                        <b className="text-amber-600 font-mono text-xs">
                          {previewResult.duplicateRows} / {previewResult.invalidRows}
                        </b>
                      </div>
                    </div>
                  )}

                  {/* Import Button */}
                  {previewResult?.valid && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handlePerformImport}
                        disabled={isImporting}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>{isImporting ? `Mengimpor ke Database (${importProgress}%)...` : 'Simpan Dataset ke Database'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Konfigurasi Sesi Backtest */}
          {selectedDataset && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Konfigurasi Sesi Replay
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nama Sesi
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Contoh: XAUUSD Scalping London Breakout"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Timeframe Chart Awal
                  </label>
                  <select
                    value={sessionTf}
                    onChange={(e) => setSessionTf(e.target.value as Timeframe)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  >
                    {allowedTimeframes.map((tf) => (
                      <option key={tf} value={tf}>
                        {tf} (Didukung oleh sumber {selectedDataset.timeframe})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>
                    Replay dimulai dari candle pertama ({new Date(selectedDataset.startDate).toLocaleString('id-ID')})
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <span>Kecepatan:</span>
                  <select
                    value={sessionSpeed}
                    onChange={(e) => setSessionSpeed(parseFloat(e.target.value))}
                    className="bg-transparent border-0 font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1.0}>1x</option>
                    <option value={2.0}>2x</option>
                    <option value={5.0}>5x</option>
                    <option value={10.0}>10x</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500">
            {selectedDataset ? (
              <span>Dataset terpilih: <b className="text-slate-800 dark:text-slate-200">{selectedDataset.name}</b></span>
            ) : (
              <span>Pilih atau upload dataset MT5 terlebih dahulu</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleStartSession}
              disabled={!selectedDataset || isSubmitting}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isSubmitting ? 'Menyiapkan Sesi...' : 'Mulai Backtest'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
