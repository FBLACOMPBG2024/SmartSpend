import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/utils/sessionConfig";
import { SessionData } from "@/utils/sessionData";
import TransactionSchema, { parseTransaction } from "@/schemas/transactionSchema";
import { captureEvent } from "@/utils/posthogHelper";

// Utility to pull user info from session
async function getUserFromSession(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user?._id) return null;

  return await client
    .db()
    .collection("users")
    .findOne({ _id: new ObjectId(session.user._id) });
}

// Route handler entry point
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    return await createTransaction(req, res);
  } else if (req.method === "PUT") {
    return await editTransaction(req, res);
  } else {
    res.setHeader("Allow", ["POST", "PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// POST: create a new transaction and update user balance
async function createTransaction(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserFromSession(req, res);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const parsed = parseTransaction(req.body);
    const { value, tags, name, description } = parsed;

    const transaction = {
      _id: new ObjectId(),
      value,
      tags,
      name,
      description,
      userId: user._id,
      date: new Date(),
    };

    await client.db().collection("transactions").insertOne(transaction);

    const newBalance = user.balance + value;

    await client
      .db()
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { balance: newBalance } });

    return res.status(201).json(transaction);
  } catch (error: any) {
    console.error("Create error:", error);
    captureEvent("Transaction Create Failed", {
      error: error?.message,
      stack: error?.stack,
      issues: error?.errors || null,
    });
    return res
      .status(400)
      .json({ message: "Invalid request data", errors: error.errors });
  }
}

// PUT: update an existing transaction and adjust balance accordingly
async function editTransaction(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserFromSession(req, res);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const parsed = TransactionSchema.parse(req.body);
    const { _id, value, tags, name, description } = parsed;

    if (!_id || !ObjectId.isValid(_id)) {
      return res.status(400).json({ message: "Transaction ID is required" });
    }

    const txId = new ObjectId(_id);

    const existingTx = await client
      .db()
      .collection("transactions")
      .findOne({ _id: txId, userId: user._id });

    if (!existingTx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const balanceDelta = value - existingTx.value;

    const updateFields = {
      value,
      tags,
      name,
      description,
      updatedAt: new Date(),
    };

    await client
      .db()
      .collection("transactions")
      .updateOne({ _id: txId }, { $set: updateFields });

    const newBalance = user.balance + balanceDelta;

    await client
      .db()
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { balance: newBalance } });

    return res.status(200).json({ ...existingTx, ...updateFields });
  } catch (error: any) {
    console.error("Edit error:", error);
    captureEvent("Transaction Edit Failed", {
      error,
    });
    return res
      .status(400)
      .json({ message: "Invalid request data", errors: error.errors });
  }
}
