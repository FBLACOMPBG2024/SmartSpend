import type { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/utils/sessionConfig";
import { SessionData } from "@/utils/sessionData";
import client from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { stringify } from "csv-stringify/sync";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const session = await getIronSession<SessionData>(req, res, sessionOptions);
    if (!session.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.user._id;
    const { range = "last30days" } = req.query;

    const now = new Date();
    const startDate = new Date();
    switch (range) {
      case "last90days":
        startDate.setDate(now.getDate() - 90);
        break;
      case "last30days":
        startDate.setDate(now.getDate() - 30);
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
      .sort({ date: -1 })
      .toArray();

    const csv = stringify(
      transactions.map((tx) => ({
        Date: new Date(tx.date).toLocaleDateString(),
        Name: tx.name,
        Value: tx.value.toFixed(2),
        Tags: tx.tags?.join(", ") ?? "",
        Type: tx.value > 0 ? "Income" : "Expense",
      })),
      {
        header: true,
      }
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="transactions_${range}.csv"`
    );
    res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate CSV" });
  }
}
