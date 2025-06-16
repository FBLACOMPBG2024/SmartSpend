import type { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/utils/sessionConfig";
import { SessionData } from "@/utils/sessionData";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return await getSpendingData(req, res);
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getSpendingData(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getIronSession<SessionData>(req, res, sessionOptions);
    if (!session.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.user._id;
    const { range = "last7days" } = req.query;

    const now = new Date();
    const startDate = new Date();
    switch (range) {
      case "last30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "last90days":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
        break;
    }

    const transactions = await client
      .db()
      .collection("transactions")
      .find({
        userId: new ObjectId(userId),
        date: { $gte: startDate },
      })
      .sort({ date: 1 })
      .toArray();

    const summary = await getSpendingSummary(userId);

    if (range === "last7days") {
      const weekday = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const spending = Array(7).fill(0);

      transactions.forEach((tx) => {
        if (tx.value >= 0) return;
        const day = new Date(tx.date).getDay();
        spending[day] += Math.abs(tx.value);
      });

      // Ensure the data is rounded to two decimal places
      for (let i = 0; i < spending.length; i++) {
        spending[i] = Math.round(spending[i] * 100) / 100;
      }

      return res.status(200).json({ labels: weekday, data: spending, summary });
    }

    const weekMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.value >= 0) return;
      const d = new Date(tx.date);
      const weekStart = new Date(d);
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - day);
      weekStart.setHours(0, 0, 0, 0);
      const label = weekStart.toLocaleDateString("default", {
        month: "short",
        day: "numeric",
      });
      weekMap[label] = (weekMap[label] || 0) + Math.abs(tx.value);
    });

    const labels = Object.keys(weekMap).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const data = labels.map((label) => weekMap[label]);

    // Ensure the data is rounded to two decimal places
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.round(data[i] * 100) / 100;
    }

    return res.status(200).json({ labels, data, summary });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getSpendingSummary(userId: string) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const last7 = new Date(now);
  last7.setDate(now.getDate() - 7);

  const last30 = new Date(now);
  last30.setDate(now.getDate() - 30);

  const allTx = await client
    .db()
    .collection("transactions")
    .find({
      userId: new ObjectId(userId),
      date: { $gte: last30 },
    })
    .toArray();

  let today = 0;
  let last7days = 0;
  let last30days = 0;

  allTx.forEach((tx) => {
    if (tx.value >= 0) return;
    const d = new Date(tx.date);
    const absVal = Math.abs(tx.value);

    if (d >= startOfToday) today += absVal;
    if (d >= last7) last7days += absVal;
    if (d >= last30) last30days += absVal;
  });

  // Ensure the values are rounded to two decimal places
  today = Math.round(today * 100) / 100;
  last7days = Math.round(last7days * 100) / 100;
  last30days = Math.round(last30days * 100) / 100;

  return { today, last7days, last30days };
}
