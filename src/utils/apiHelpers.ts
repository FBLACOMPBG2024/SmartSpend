// utils/apiHelpers.ts

import api from "@/utils/api";
import { Transaction } from "@/schemas/transactionSchema";
import { Goal } from "@/schemas/goalSchema";
import { IUser } from "@/components/context/UserContext";
import Router from "next/router";
import { showError, showSuccess } from "./toast";

// Utility: round float to 2 decimals
const roundTo2 = (num: number): number => Math.round(num * 100) / 100;

export const fetchTransactions = async (
  setTransactions: (transactions: Transaction[]) => void,
  setError: (error: string | null) => void,
  setLoading: (loading: boolean) => void,
  dateRange: string = "last7days"
): Promise<void> => {
  try {
    setLoading(true);

    const endDate = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case "last30days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "last90days":
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
        break;
    }

    const response = await api.get("/api/transaction/get", {
      params: {
        limit: 100,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    setTransactions(
      response.data.map((tx: Transaction) => ({
        ...tx,
        value: roundTo2(tx.value),
      }))
    );
  } catch (error) {
    console.error("Error fetching transactions:", error);
    setError("Failed to fetch transactions.");
  } finally {
    setLoading(false);
  }
};

export const fetchDashboardData = async (
  setChartLabels: (labels: string[]) => void,
  setChartData: (data: number[]) => void,
  setError: (error: string | null) => void,
  setLoading: (loading: boolean) => void,
  dateRange: string = "last7days",
  setSummary?: (summary: {
    today: number;
    last7days: number;
    last30days: number;
    balance: number;
  }) => void
): Promise<void> => {
  try {
    setLoading(true);
    const response = await api.get("/api/transaction/summary", {
      params: { range: dateRange },
    });

    if (response.status === 200) {
      const { labels, data, summary } = response.data;

      setChartLabels(labels);
      setChartData(data.map((d: number) => roundTo2(d)));

      if (setSummary && summary) {
        setSummary({
          today: roundTo2(summary.today),
          last7days: roundTo2(summary.last7days),
          last30days: roundTo2(summary.last30days),
          balance: roundTo2(summary.balance),
        });
      }
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    setError("Failed to fetch dashboard data.");
  } finally {
    setLoading(false);
  }
};

export const fetchGoals = async (): Promise<Goal[]> => {
  try {
    const response = await api.get("/api/user/goal/get");
    return response.data.map((goal: Goal) => ({
      ...goal,
      target: roundTo2(goal.target),
      progress: roundTo2(goal.progress),
    }));
  } catch (error) {
    console.error("Error fetching goals:", error);
    throw new Error("Failed to fetch goals. Please try again later.");
  }
};

export const createGoal = async (goal: Goal): Promise<any> => {
  try {
    const goalToSend = {
      ...goal,
      target: roundTo2(goal.target),
      progress: roundTo2(goal.progress),
    };
    const response = await api.post("/api/user/goal/create", goalToSend);
    return response.data;
  } catch (error) {
    console.error("Error creating goal:", error);
    throw new Error("Failed to create goal. Please try again later.");
  }
};

export const editGoal = async (goal: Goal): Promise<any> => {
  try {
    const goalToSend = {
      ...goal,
      target: roundTo2(goal.target),
      progress: roundTo2(goal.progress),
    };
    const response = await api.put("/api/user/goal/edit", goalToSend);
    if (response.status === 200) {
      await Router.reload();
    }
    return response.data;
  } catch (error) {
    console.error("Error editing goal:", error);
    throw new Error("Failed to edit goal. Please try again later.");
  }
};

export const deleteGoal = async (goalId: string): Promise<any> => {
  try {
    const response = await api.delete("/api/user/goal/delete", {
      data: { goalId },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting goal:", error);
    throw new Error("Failed to delete goal. Please try again later.");
  }
};

export const connectBankAccount = async (
  accessToken: string
): Promise<void> => {
  try {
    const response = await api.post("/api/user/bank-connect", { accessToken });

    if (response.status === 200) {
      showSuccess("Connected bank account");
    }

    await Router.reload();
  } catch (error) {
    showError("Unable to connect bank account. Please try again.");
    throw new Error("Unable to connect bank account. Please try again.");
  }
};

export const fetchBankAccounts = async (user: IUser): Promise<any> => {
  try {
    if (!user.bankAccessToken) throw new Error("No access token found.");
    const response = await api.get("/api/user/bank/accounts");
    return response.data;
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    throw new Error("Unable to fetch bank accounts. Please try again.");
  }
};

export const updateUserProfile = async (
  user: IUser,
  setLoading: (loading: boolean) => void
): Promise<void> => {
  setLoading(true);
  try {
    if (!user) throw new Error("User is required");

    if (!user.preferences || !user.preferences.accountId) {
      showError("Invalid user preferences");
      throw new Error("Invalid user preferences");
    }

    const updatedAccountId = user.preferences.accountId;

    if (updatedAccountId !== user.preferences.accountId) {
      const confirmChange = window.confirm(
        "Changing your account will remove the current account's transactions. Proceed?"
      );

      if (!confirmChange) {
        setLoading(false);
        return;
      }

      await api.delete("/api/transaction/bulk-delete");
    }

    await api.post("/api/user/info", {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      preferences: user.preferences,
    });

    await Router.reload();
  } catch (error) {
    console.error("Failed to update profile:", error);
    throw new Error("Unable to save profile. Please try again.");
  } finally {
    setLoading(false);
  }
};
