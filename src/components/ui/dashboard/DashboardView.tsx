import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import SummaryBox from "@/components/ui/SummaryCard";
import ChartCard from "@/components/ui/ChartCard";
import ReactECharts from "echarts-for-react";
import Card from "@/components/ui/Card";
import { IUser } from "@/components/context/UserContext";
import { fetchTransactions, fetchDashboardData } from "@/utils/apiHelpers";
import {
  generateTreemapData,
  generateSecondTagChartData,
} from "@/utils/dataProcessing";
import {
  lineChartOptions,
  pieChartOptions,
  treemapChartOptions,
} from "@/utils/chartOptions";
import { Transaction } from "@/schemas/transactionSchema";
import { IconDownload } from "@tabler/icons-react";

interface DashboardViewProps {
  user: IUser;
}

export default function DashboardView({ user }: DashboardViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [treemapData, setTreemapData] = useState<any[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [summary, setSummary] = useState<{
    today: number;
    last7days: number;
    last30days: number;
    balance: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<string>("last7days");

  useEffect(() => {
    if (user.firstName) {
      fetchTransactions(setTransactions, setError, setLoading, dateRange);
      fetchDashboardData(
        setChartLabels,
        setChartData,
        setError,
        setLoading,
        dateRange,
        setSummary
      );
    }
  }, [user, dateRange]);

  useEffect(() => {
    if (transactions.length > 0) {
      setTreemapData(generateTreemapData(transactions));
      setPieChartData(generateSecondTagChartData(transactions));
    }
  }, [transactions]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="gap-4">
      <Card>
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <h1 className="text-4xl font-black text-text">Dashboard</h1>

          <div className="flex items-center gap-4">
            <div
              className="sm:max-h-10 max-h-10 transition-all duration-200 hover:opacity-80 sm:text-lg text-sm px-2 py-1 bg-primary text-white rounded flex items-center"
              onClick={() => {
                const link = document.createElement("a");
                link.href = `/api/export/transaction?range=${dateRange}`;
                link.download = `transactions_${dateRange}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <IconDownload className="mr-2" />
              <a className="cursor-pointer">Export Transactions</a>
            </div>
            <select
              className="bg-backgroundGrayLight cursor-pointer p-2 text-base rounded-md"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="last7days">Last Week</option>
              <option value="last30days">Last Month</option>
              <option value="last90days">Last 3 Months</option>
            </select>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
          <SummaryBox title="Today" amount={summary?.today ?? 0} />
          <SummaryBox title="Last 7 Days" amount={summary?.last7days ?? 0} />
          <SummaryBox title="Last 30 Days" amount={summary?.last30days ?? 0} />
          <SummaryBox title="Balance" amount={user.balance ?? 0} highlight />
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title="Spending Over Time">
            <ReactECharts
              className="w-full"
              option={lineChartOptions(chartLabels, chartData)}
            />
          </ChartCard>
          <ChartCard title="Spending">
            <ReactECharts
              className="w-full"
              option={pieChartOptions(pieChartData)}
            />
          </ChartCard>
          <ChartCard title="Spending Distribution">
            <ReactECharts
              className="w-full"
              option={treemapChartOptions(treemapData)}
            />
          </ChartCard>
        </div>

        {/* Transactions List */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold text-text pb-3">
            Latest Transactions
          </h2>
          {transactions.length === 0 ? (
            <a href="#profile" className="text-text">
              No transactions found. Click here to connect a bank account
            </a>
          ) : (
            <ul>
              {transactions.slice(0, 6).map((transaction, index) => (
                <motion.li
                  key={transaction._id.toString()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="py-2 border-b border-backgroundGrayLight"
                >
                  <div className="flex justify-between">
                    <span className="font-medium text-text">
                      {transaction.name}
                    </span>
                    <span
                      className={
                        transaction.value > 0
                          ? "text-green-500"
                          : "text-neutral-500"
                      }
                    >
                      {transaction.value.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
