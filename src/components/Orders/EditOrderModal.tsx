
import { useEffect, useState, type FormEvent } from 'react';

import type {
  BacktestOrder,
  UpdateOrderInput,
} from '../../types/order';

// ============================================
// PROPS & TYPES
// ============================================

interface EditOrderModalProps {
  isOpen: boolean;
  order: BacktestOrder | null;
  onClose: () => void;
  onSubmit: (
    orderId: string,
    input: UpdateOrderInput
  ) => Promise<void>;
}

type InputMode = 'PRICE' | 'USD';

type PositionField = 'SL' | 'TP';

// XAUUSD: 1 lot = 100 oz
const CONTRACT_SIZE = 100;

// ============================================
// HELPERS
// ============================================

function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '-';

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPriceInput(
  value: number | null | undefined
): string {
  if (
    value == null ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return '';
  }

  return String(value);
}

// Hitung estimasi PnL dari harga SL/TP.
function calculatePnL(
  entryPrice: number,
  targetPrice: number,
  lot: number,
  direction: 'BUY' | 'SELL'
): number {
  const directionMultiplier = direction === 'BUY' ? 1 : -1;

  return (
    (targetPrice - entryPrice) *
    CONTRACT_SIZE *
    lot *
    directionMultiplier
  );
}

// Konversi nominal USD menjadi harga SL/TP.
function calculatePriceFromUSD(
  entryPrice: number,
  usd: number,
  lot: number,
  direction: 'BUY' | 'SELL',
  field: PositionField
): number {
  const priceDistance = usd / (CONTRACT_SIZE * lot);

  const isProfit = field === 'TP';

  let multiplier: number;

  if (direction === 'BUY') {
    multiplier = isProfit ? 1 : -1;
  } else {
    multiplier = isProfit ? -1 : 1;
  }

  return entryPrice + priceDistance * multiplier;
}

// Konversi harga menjadi nominal USD.
function calculateUSDFromPrice(
  entryPrice: number,
  targetPrice: number,
  lot: number,
  direction: 'BUY' | 'SELL'
): number {
  return Math.abs(
    calculatePnL(entryPrice, targetPrice, lot, direction)
  );
}

// ============================================
// COMPONENT
// ============================================

export default function EditOrderModal({
  isOpen,
  order,
  onClose,
  onSubmit,
}: EditOrderModalProps) {
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const [slMode, setSlMode] = useState<InputMode>('PRICE');
  const [tpMode, setTpMode] = useState<InputMode>('PRICE');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ============================================
  // INITIALIZE FORM
  // ============================================

  useEffect(() => {
    if (!isOpen || !order) return;

    setStopLoss(formatPriceInput(order.stopLoss));
    setTakeProfit(formatPriceInput(order.takeProfit));

    setSlMode('PRICE');
    setTpMode('PRICE');

    setError('');
  }, [isOpen, order]);

  // ============================================
  // GUARD
  // ============================================

  if (!isOpen || !order) {
    return null;
  }

  const isBuy = order.direction === 'BUY';

  const entryPrice = order.openPrice;
  const lot = order.lot;

  const validCalculation =
    Number.isFinite(entryPrice) &&
    entryPrice > 0 &&
    Number.isFinite(lot) &&
    lot > 0;

  // ============================================
  // CONVERT INPUT TO PRICE
  // ============================================

  const getActualPrice = (
    value: string,
    mode: InputMode,
    field: PositionField
  ): number | null => {
    if (value.trim() === '') return null;

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    if (mode === 'PRICE') {
      return parsed;
    }

    if (!validCalculation) {
      return null;
    }

    return calculatePriceFromUSD(
      entryPrice,
      parsed,
      lot,
      order.direction,
      field
    );
  };

  const actualSL = getActualPrice(stopLoss, slMode, 'SL');
  const actualTP = getActualPrice(takeProfit, tpMode, 'TP');

  // ============================================
  // MODE SWITCHING
  // ============================================

  const changeMode = (
    field: PositionField,
    nextMode: InputMode
  ) => {
    if (field === 'SL') {
      if (slMode === nextMode) return;

      const currentPrice = getActualPrice(
        stopLoss,
        slMode,
        'SL'
      );

      if (currentPrice !== null && validCalculation) {
        if (nextMode === 'USD') {
          const usd = calculateUSDFromPrice(
            entryPrice,
            currentPrice,
            lot,
            order.direction
          );

          setStopLoss(String(Number(usd.toFixed(2))));
        } else {
          setStopLoss(String(Number(currentPrice.toFixed(5))));
        }
      }

      setSlMode(nextMode);
    } else {
      if (tpMode === nextMode) return;

      const currentPrice = getActualPrice(
        takeProfit,
        tpMode,
        'TP'
      );

      if (currentPrice !== null && validCalculation) {
        if (nextMode === 'USD') {
          const usd = calculateUSDFromPrice(
            entryPrice,
            currentPrice,
            lot,
            order.direction
          );

          setTakeProfit(String(Number(usd.toFixed(2))));
        } else {
          setTakeProfit(String(Number(currentPrice.toFixed(5))));
        }
      }

      setTpMode(nextMode);
    }

    setError('');
  };

  // ============================================
  // VALIDATION
  // ============================================

  const validatePrice = (
    price: number | null,
    field: PositionField
  ): string | null => {
    if (price === null) return null;

    if (!Number.isFinite(price) || price <= 0) {
      return `Harga ${field === 'SL' ? 'Stop Loss' : 'Take Profit'} tidak valid.`;
    }

    if (isBuy) {
      if (field === 'SL' && price >= entryPrice) {
        return 'Stop Loss BUY harus lebih rendah dari harga entry.';
      }

      if (field === 'TP' && price <= entryPrice) {
        return 'Take Profit BUY harus lebih tinggi dari harga entry.';
      }
    } else {
      if (field === 'SL' && price <= entryPrice) {
        return 'Stop Loss SELL harus lebih tinggi dari harga entry.';
      }

      if (field === 'TP' && price >= entryPrice) {
        return 'Take Profit SELL harus lebih rendah dari harga entry.';
      }
    }

    return null;
  };

  // ============================================
  // SUBMIT
  // ============================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');

    if (!validCalculation) {
      setError('Data entry price atau lot tidak valid.');
      return;
    }

    const parsedSL = actualSL;
    const parsedTP = actualTP;

    // Validasi nominal USD.
    if (
      (slMode === 'USD' && stopLoss.trim() !== '' &&
        (!Number.isFinite(Number(stopLoss)) || Number(stopLoss) <= 0)) ||
      (tpMode === 'USD' && takeProfit.trim() !== '' &&
        (!Number.isFinite(Number(takeProfit)) || Number(takeProfit) <= 0))
    ) {
      setError('Nominal USD harus lebih besar dari 0.');
      return;
    }

    if (stopLoss.trim() !== '' && parsedSL === null) {
      setError('Nilai Stop Loss tidak valid.');
      return;
    }

    if (takeProfit.trim() !== '' && parsedTP === null) {
      setError('Nilai Take Profit tidak valid.');
      return;
    }

    const slError = validatePrice(parsedSL, 'SL');

    if (slError) {
      setError(slError);
      return;
    }

    const tpError = validatePrice(parsedTP, 'TP');

    if (tpError) {
      setError(tpError);
      return;
    }

    try {
      setSaving(true);

      await onSubmit(order.id, {
        stopLoss: parsedSL,
        takeProfit: parsedTP,
      });

      onClose();
    } catch (err) {
      console.error(
        '[EDIT ORDER] Gagal memperbarui order:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan perubahan order.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // INPUT FIELD RENDERER
  // ============================================

  const renderModeSelector = (
    field: PositionField,
    mode: InputMode
  ) => (
    <div className="flex rounded-md border border-gray-300 p-0.5 dark:border-gray-700">
      <button
        type="button"
        disabled={saving}
        onClick={() => changeMode(field, 'PRICE')}
        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
          mode === 'PRICE'
            ? 'bg-blue-600 text-white'
            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
      >
        Harga
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={() => changeMode(field, 'USD')}
        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
          mode === 'USD'
            ? 'bg-blue-600 text-white'
            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
      >
        USD
      </button>
    </div>
  );

  // ============================================
  // DISPLAY
  // ============================================

  const slPnL =
    actualSL !== null && validCalculation
      ? calculatePnL(entryPrice, actualSL, lot, order.direction)
      : null;

  const tpPnL =
    actualTP !== null && validCalculation
      ? calculatePnL(entryPrice, actualTP, lot, order.direction)
      : null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Edit Posisi
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Order #{order.orderNumber ?? '-'} · {order.direction}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup modal"
            className="rounded-md px-2 py-1 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">

            {/* ORDER INFORMATION */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Entry Price
                </p>

                <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatNumber(entryPrice, 2)}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Lot
                </p>

                <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatNumber(lot, 2)}
                </p>
              </div>
            </div>

            {/* STOP LOSS */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="edit-order-sl"
                  className="text-sm font-medium text-red-600 dark:text-red-400"
                >
                  Stop Loss
                </label>

                {renderModeSelector('SL', slMode)}
              </div>

              <div className="relative">
                <input
                  id="edit-order-sl"
                  type="number"
                  step="any"
                  min="0"
                  value={stopLoss}
                  onChange={(event) =>
                    setStopLoss(event.target.value)
                  }
                  placeholder={
                    slMode === 'PRICE'
                      ? 'Masukkan harga SL'
                      : 'Masukkan nominal USD'
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-14 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {slMode === 'PRICE' ? 'Price' : 'USD'}
                </span>
              </div>

              {slMode === 'PRICE' ? (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Estimasi kerugian:{' '}
                  <span className="font-semibold text-red-500">
                    {slPnL !== null
                      ? `-$${formatNumber(Math.abs(slPnL))}`
                      : '-'}
                  </span>
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Harga Stop Loss:{' '}
                  <span className="font-semibold text-red-500">
                    {actualSL !== null
                      ? formatNumber(actualSL, 2)
                      : '-'}
                  </span>
                </p>
              )}

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Kosongkan jika tidak ingin menggunakan SL.
              </p>
            </div>

            {/* TAKE PROFIT */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="edit-order-tp"
                  className="text-sm font-medium text-green-600 dark:text-green-400"
                >
                  Take Profit
                </label>

                {renderModeSelector('TP', tpMode)}
              </div>

              <div className="relative">
                <input
                  id="edit-order-tp"
                  type="number"
                  step="any"
                  min="0"
                  value={takeProfit}
                  onChange={(event) =>
                    setTakeProfit(event.target.value)
                  }
                  placeholder={
                    tpMode === 'PRICE'
                      ? 'Masukkan harga TP'
                      : 'Masukkan nominal USD'
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-14 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {tpMode === 'PRICE' ? 'Price' : 'USD'}
                </span>
              </div>

              {tpMode === 'PRICE' ? (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Estimasi keuntungan:{' '}
                  <span className="font-semibold text-green-500">
                    {tpPnL !== null
                      ? `+$${formatNumber(Math.abs(tpPnL))}`
                      : '-'}
                  </span>
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Harga Take Profit:{' '}
                  <span className="font-semibold text-green-500">
                    {actualTP !== null
                      ? formatNumber(actualTP, 2)
                      : '-'}
                  </span>
                </p>
              )}

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Kosongkan jika tidak ingin menggunakan TP.
              </p>
            </div>

            {/* VALIDATION ERROR */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
