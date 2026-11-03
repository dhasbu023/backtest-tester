
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Crosshair,
  Download,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const monthlyData = [
  { month: 'May', profit: 420, loss: 180 },
  { month: 'Jun', profit: 650, loss: 230 },
  { month: 'Jul', profit: 380, loss: 290 },
  { month: 'Aug', profit: 780, loss: 250 },
  { month: 'Sep', profit: 920, loss: 310 },
  { month: 'Oct', profit: 570, loss: 190 },
  { month: 'Nov', profit: 850, loss: 270 },
  { month: 'Dec', profit: 1050, loss: 320 },
];

const recentTrades = [
  {
    id: '#TRD-0081',
    pair: 'XAUUSD',
    type: 'BUY',
    entry: '4,012.50',
    exit: '4,025.80',
    pnl: 133.00,
    date: 'Nov 02, 2026',
  },
  {
    id: '#TRD-0080',
    pair: 'XAUUSD',
    type: 'SELL',
    entry: '4,028.20',
    exit: '4,031.50',
    pnl: -33.00,
    date: 'Nov 01, 2026',
  },
  {
    id: '#TRD-0079',
    pair: 'XAUUSD',
    type: 'BUY',
    entry: '3,995.00',
    exit: '4,010.00',
    pnl: 150.00,
    date: 'Oct 31, 2026',
  },
  {
    id: '#TRD-0078',
    pair: 'XAUUSD',
    type: 'SELL',
    entry: '4,015.00',
    exit: '4,008.50',
    pnl: 65.00,
    date: 'Oct 30, 2026',
  },
  {
    id: '#TRD-0077',
    pair: 'XAUUSD',
    type: 'BUY',
    entry: '4,020.00',
    exit: '4,016.00',
    pnl: -40.00,
    date: 'Oct 29, 2026',
  },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  positive = true,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  positive?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {title}
        </p>

        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
        {value}
      </h3>

      <div className="flex items-center gap-1 mt-2">
        {positive ? (
          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-rose-500" />
        )}

        <span
          className={`text-xs font-semibold ${
            positive ? 'text-emerald-500' : 'text-rose-500'
          }`}
        >
          {change}
        </span>

        <span className="text-xs text-slate-400">
          vs previous period
        </span>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const totalProfit = 1248.50;
  const totalTrades = 128;
  const winRate = 68.75;

  const maxProfit = Math.max(
    ...monthlyData.map((item) => item.profit)
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-[1600px] mx-auto p-5 md:p-7 space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ChartNoAxesCombined className="w-6 h-6 text-blue-600 dark:text-blue-400" />

              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Trading Statistics
              </h1>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Analyze your trading performance and backtest results.
            </p>

            <span className="inline-flex mt-2 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              DEMO DATA
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 px-3 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
            >
              <CalendarDays className="w-4 h-4" />
              All Time
            </button>

            <button
              type="button"
              className="h-10 px-3 flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* MAIN STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Net Profit"
            value={formatMoney(totalProfit)}
            change="+18.5%"
            icon={Wallet}
          />

          <StatCard
            title="Win Rate"
            value={`${winRate}%`}
            change="+4.2%"
            icon={Target}
          />

          <StatCard
            title="Total Trades"
            value={String(totalTrades)}
            change="+12.8%"
            icon={Activity}
          />

          <StatCard
            title="Profit Factor"
            value="1.85"
            change="+0.24"
            icon={TrendingUp}
          />
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* MONTHLY PERFORMANCE */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Monthly Performance
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Monthly profit and loss comparison
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  Profit
                </span>

                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  Loss
                </span>
              </div>
            </div>

            <div className="mt-7 flex items-end justify-between gap-3 h-52 border-b border-slate-200 dark:border-slate-800">
              {monthlyData.map((item) => (
                <div
                  key={item.month}
                  className="flex-1 h-full flex flex-col justify-end items-center gap-2"
                >
                  <div className="w-full max-w-12 flex items-end justify-center gap-1 h-full">
                    <div
                      className="flex-1 rounded-t-sm bg-emerald-500 min-w-0"
                      style={{
                        height: `${(item.profit / maxProfit) * 85}%`,
                      }}
                      title={`Profit: $${item.profit}`}
                    />

                    <div
                      className="flex-1 rounded-t-sm bg-rose-500 min-w-0"
                      style={{
                        height: `${(item.loss / maxProfit) * 85}%`,
                      }}
                      title={`Loss: $${item.loss}`}
                    />
                  </div>

                  <span className="text-[10px] text-slate-400">
                    {item.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* WIN RATE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="font-bold text-slate-900 dark:text-white">
              Trade Results
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Win and loss distribution
            </p>

            <div className="flex flex-col items-center justify-center py-7">
              <div className="relative w-40 h-40 rounded-full flex items-center justify-center"
                style={{
                  background: 'conic-gradient(#10b981 0% 68.75%, #f43f5e 68.75% 100%)',
                }}
              >
                <div className="w-28 h-28 rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    68.75%
                  </span>

                  <span className="text-xs text-slate-500">
                    Win Rate
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Winning Trades
                </span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  88 (68.75%)
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Losing Trades
                </span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  40 (31.25%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECONDARY STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <BarChart3 className="w-4 h-4" />
              Gross Profit
            </div>

            <p className="text-xl font-bold text-emerald-500 mt-3">
              $2,450.00
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <ArrowDownRight className="w-4 h-4" />
              Gross Loss
            </div>

            <p className="text-xl font-bold text-rose-500 mt-3">
              -$1,201.50
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Crosshair className="w-4 h-4" />
              Average Win
            </div>

            <p className="text-xl font-bold text-slate-900 dark:text-white mt-3">
              $27.84
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Clock3 className="w-4 h-4" />
              Average Loss
            </div>

            <p className="text-xl font-bold text-slate-900 dark:text-white mt-3">
              -$30.04
            </p>
          </div>
        </div>

        {/* RECENT TRADES */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Recent Trades
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Latest trading activity
              </p>
            </div>

            <button
              type="button"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Trade ID</th>
                  <th className="px-5 py-3 font-medium">Symbol</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Entry</th>
                  <th className="px-5 py-3 font-medium">Exit</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-right">P&L</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                      {trade.id}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                      {trade.pair}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          trade.type === 'BUY'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {trade.entry}
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {trade.exit}
                    </td>

                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {trade.date}
                    </td>

                    <td
                      className={`px-5 py-4 text-right font-bold ${
                        trade.pnl >= 0
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {formatMoney(trade.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-3">
          Statistics currently display sample data for UI development.
        </p>
      </div>
    </div>
  );
}
