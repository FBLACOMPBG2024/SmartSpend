import TextInput from "@/components/ui/TextInput";
import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import { motion } from "framer-motion";
import api from "@/utils/api";
import { Transaction } from "@/schemas/transactionSchema";
import Papa from "papaparse";
import {
  IconPencil,
  IconTrash,
  IconPlus,
  IconUpload,
  IconFilter,
  IconX,
  IconSortAscending,
  IconRefresh,
} from "@tabler/icons-react";
import { showError, showSuccess } from "@/utils/toast";

// Component to view, add, edit, delete, sync, filter and bulk upload transactions.
export default function TransactionsView() {
  // Modal visibility states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Transactions and editing states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(
    null
  );
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(
    null
  );

  // Form input states for transaction edit/create
  const [value, setValue] = useState("0.0");
  const [tags, setTags] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState(new Date()); // Default to current time

  // Sorting states
  const [sortKey, setSortKey] = useState<keyof Transaction | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [limit, setLimit] = useState(200);
  const [tagFilter, setTagFilter] = useState("");

  // Function to format Date for the datetime-local input
  const formatDateForInput = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  // Fetch transactions when filter values update
  useEffect(() => {
    fetchTransactions();
  }, [tagFilter, startDate, endDate, limit]);

  // Function to fetch transactions from the API
  const fetchTransactions = async () => {
    try {
      const queryParams: any = {
        ...(limit !== 0 && { limit }), // only include limit if not 0
        startDate,
        endDate,
        filter: tagFilter ? JSON.stringify(tagFilter.split(" ")) : undefined, // format tag filter as an array
      };

      const response = await api.get("/api/transaction/get", {
        params: queryParams,
      });
      setTransactions(response.data);
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    }
  };

  // Sync transactions with bank data and refresh list
  const handleSync = async () => {
    try {
      const response = await api.post("/api/user/bank/sync");
      if (response.status === 200) {
        fetchTransactions();
      }
    } catch (error) {
      console.error("Failed to sync transactions", error);
    }
  };

  // Handle creating or editing a transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert tags string into an array, trimming whitespace
    const tagsArray = tags
      .trim()
      .split(" ")
      .map((tag) => tag.trim());

    const payload = {
      _id: editTransaction?._id || undefined,
      value: parseFloat(value) || 0,
      tags: tagsArray,
      name,
      description,
      date: new Date(dateTime),
    };

    try {
      if (editTransaction) {
        // Update existing transaction
        const response = await api.put(`/api/transaction/edit`, payload);
        if (response.status === 200) {
          setIsModalOpen(false);
          setEditTransaction(null);
        }
      } else {
        // Create new transaction
        const response = await api.post("/api/transaction/add", payload);
        if (response.status === 201) {
          setIsModalOpen(false);
        }
      }

      // Clear form inputs
      setValue("0.0");
      setTags("");
      setName("");
      setDescription("");
      setDateTime(new Date());

      fetchTransactions();
    } catch (error) {
      console.error("Failed to create or edit transaction", error);
    }
  };

  // Prepare form fields for editing a transaction
  const handleEdit = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setValue(transaction.value.toString());
    setTags(transaction.tags.join(" "));
    setName(transaction.name);
    setDescription(transaction.description);
    setDateTime(new Date(transaction.date));
    setIsModalOpen(true);
  };

  // Delete a transaction after user confirmation
  const handleDelete = async () => {
    if (!transactionToDelete) return;

    try {
      const response = await api.delete(`/api/transaction/delete`, {
        data: { _id: transactionToDelete },
      });
      if (response.status === 200) {
        showSuccess("Transaction deleted");
        fetchTransactions();
        setIsConfirmModalOpen(false);
        setTransactionToDelete(null);
      }
    } catch (error) {
      showError("Failed to delete transaction");
      console.error("Failed to delete transaction", error);
    }
  };

  // Set up confirmation before deleting a transaction
  const confirmDelete = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setIsConfirmModalOpen(true);
  };

  // Handle bulk upload from a CSV file using PapaParse
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById(
      "csvFileInput"
    ) as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      Papa.parse(fileInput.files[0], {
        header: true,
        complete: async (results) => {
          try {
            const finalTransactions = results.data.map((transaction: any) => {
              return {
                value: parseFloat(transaction.value) || 0,
                tags: transaction.tags
                  .split(",")
                  .map((tag: string) => tag.trim()),
                name: transaction.name,
                description: transaction.description,
                date: new Date(transaction.date),
              };
            });

            const response = await api.post(
              "/api/transaction/bulk-add",
              finalTransactions
            );
            if (response.status === 201) {
              showSuccess("Transactions added");
              setIsBulkUploadModalOpen(false);
              fetchTransactions();
            }
          } catch (error) {
            showError("Failed to bulk upload transactions");
            console.error("Bulk upload error", error);
          }
        },
      });
    }
  };

  // Toggle tag filter on or off
  const toggleTagFilter = (tag: string) => {
    if (tagFilter.split(" ").includes(tag)) {
      setTagFilter(
        tagFilter
          .split(" ")
          .filter((t) => t !== tag)
          .join(" ")
      );
    } else {
      setTagFilter((tagFilter + " " + tag).trim());
    }
  };

  // Sort transactions by a specific key, toggling the sort direction if same key
  const sortTransactionsByKey = (key: keyof Transaction) => {
    let direction: "asc" | "desc" = "asc";
    if (key === sortKey) {
      direction = sortDirection === "asc" ? "desc" : "asc";
    }

    const sorted = [...transactions].sort((a, b) => {
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      return 0;
    });

    setTransactions(sorted);
    setSortKey(key);
    setSortDirection(direction);
  };

  return (
    <div className="h-full w-full">
      <Card className="min-h-[90vh] w-full">
        <h1 className="text-4xl font-black text-text">Transactions</h1>
        <div className="mt-4 gap-2 flex flex-row sm:absolute sm:top-0 sm:right-0 sm:mt-4 sm:mr-4 space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            className="sm:max-h-10 max-h-10 transition-all duration-200 hover:opacity-80 sm:text-lg text-sm px-2 py-1 bg-primary text-white rounded flex items-center"
            onClick={() => handleSync()}
          >
            <IconRefresh className="mr-1" />
            <p className="hidden sm:block">Sync</p>
          </button>
          <button
            className="sm:max-h-10 max-h-10 transition-all duration-200 hover:opacity-80 sm:text-lg text-sm px-2 py-1 bg-primary text-white rounded flex items-center"
            onClick={() => setIsFilterModalOpen(true)}
          >
            <IconFilter className="mr-1" />
            <p className="hidden sm:block">Filter</p>
          </button>
          <button
            className="sm:max-h-10 max-h-10 transition-all duration-200 hover:opacity-80 sm:text-lg text-sm px-2 py-1 bg-primary text-white rounded flex items-center"
            onClick={() => setIsModalOpen(true)}
          >
            <IconPlus className="mr-1" />
            <p className="hidden sm:block">Add Transaction</p>
          </button>
          <button
            className="sm:max-h-10 max-h-10 transition-all duration-200 hover:opacity-80 sm:text-lg text-sm px-2 py-1 bg-primary text-white rounded flex items-center"
            onClick={() => setIsBulkUploadModalOpen(true)}
          >
            <IconUpload className="mr-1" />
            <p className="hidden sm:block">Bulk Upload</p>
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[80vh] mt-8">
          {transactions.length > 0 ? (
            <table className="min-w-full bg-backgroundGray">
              <thead>
                <tr className="text-left">
                  {[
                    { label: "Name", key: "name" as keyof Transaction },
                    { label: "Value", key: "value" as keyof Transaction },
                    { label: "Tags", key: "tags" as keyof Transaction },
                    {
                      label: "Description",
                      key: "description" as keyof Transaction,
                    },
                    { label: "Created", key: "date" as keyof Transaction },
                  ].map(({ label, key }) => (
                    <th
                      key={key}
                      className="transition-all sm:text-sm text-base px-4 py-2 cursor-pointer"
                      onClick={() => sortTransactionsByKey(key)}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {sortKey === key && (
                          <IconSortAscending
                            className={`w-4 h-auto transition-transform ${sortDirection === "asc" ? "rotate-0" : "rotate-180"}`}
                          />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="transition-all sm:text-sm text-base px-4 py-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction: Transaction, index: number) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={
                      index < transactions.length - 1
                        ? "border-b border-backgroundGrayLight"
                        : ""
                    }
                  >
                    <td className="sm:text-base text-xs px-4 py-2">
                      {transaction.name}
                    </td>
                    <td className="sm:text-base text-xs px-4 py-2">
                      {transaction.value.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                    <td className="px-4 py-2">
                      {transaction.tags ? (
                        <div className="flex flex-wrap gap-1 relative">
                          {transaction.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className={`sm:text-base text-xs transition-all duration-200 relative select-none bg-primary hover:opacity-80 text-white px-2 py-1 rounded flex items-center ${tagFilter.includes(tag) ? "bg-accent" : ""}`}
                              onClick={() => toggleTagFilter(tag)}
                            >
                              <span className="mr-1">{tag}</span>
                              {tagFilter.includes(tag) && (
                                <IconX className="w-3 h-auto" />
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="sm:text-base text-xs px-4 py-2">
                      {transaction.description || "-"}
                    </td>
                    <td className="sm:text-base text-xs px-4 py-2">
                      {new Date(transaction.date).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="hover:text-blue-500"
                      >
                        <IconPencil className="stroke-text" />
                      </button>
                      <button
                        onClick={() =>
                          confirmDelete(transaction._id.toString() || "")
                        }
                        className="hover:text-red-500"
                      >
                        <IconTrash className="stroke-text transition-all duration-200" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No transactions found. Add some to get started.
            </div>
          )}
        </div>
      </Card>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-text">
            {editTransaction ? "Edit Transaction" : "Create Transaction"}
          </h1>
          <div>
            <label>
              Value:
              <TextInput
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Tags:
              <TextInput
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Name:
              <TextInput
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Description:
              <TextInput
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              Date and Time:
              <TextInput
                type="datetime-local"
                value={formatDateForInput(dateTime)}
                onChange={(e) => setDateTime(new Date(e.target.value))}
                required
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full mt-4 px-4 py-2 bg-backgroundGray rounded"
          >
            {editTransaction ? "Update Transaction" : "Create Transaction"}
          </button>
        </form>
      </Modal>

      <Modal
        open={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
      >
        <form onSubmit={handleBulkUpload}>
          <h1 className="text-2xl font-bold text-text">Bulk Upload</h1>
          <div>
            <label>
              Upload CSV:
              <input
                id="csvFileInput"
                type="file"
                accept=".csv"
                className="block w-full text-sm text-text border border-backgroundGrayLight rounded-lg cursor-pointer focus:outline-none"
                required
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full mt-4 px-4 py-2 bg-backgroundGray rounded"
          >
            Upload
          </button>
        </form>
      </Modal>

      <Modal
        open={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
      >
        <div className="p-4">
          <h2 className="text-xl font-bold text-text">Are you sure?</h2>
          <p className="text-text">
            Do you really want to delete this transaction? This process cannot
            be undone.
          </p>
          <div className="flex justify-end mt-4">
            <button
              className="mr-2 px-4 py-2 bg-gray-300 text-gray-800 rounded"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      >
        <div className="flex flex-col gap-2 mb-4">
          <h2 className="text-xl font-bold text-text">Filter</h2>
          <h1 className="text-md font-bold text-text">Tags</h1>
          <TextInput
            type="text"
            placeholder="Filter by tags (space separated)"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="w-full sm:w-auto"
          />
          <h1 className="text-md font-bold text-text">Start Date</h1>
          <TextInput
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full sm:w-auto"
          />
          <h1 className="text-md font-bold text-text">End Date</h1>
          <TextInput
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full sm:w-auto"
          />
          <h1 className="text-md font-bold text-text">Limit</h1>
          <TextInput
            type="number"
            value={limit.toString()}
            onChange={(e) => setLimit(Number.parseInt(e.target.value))}
            placeholder="Limit"
            className="w-full sm:w-auto"
          />
        </div>
      </Modal>
    </div>
  );
}
