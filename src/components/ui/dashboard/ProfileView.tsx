import { IUser } from "@/components/context/UserContext";
import { useTellerConnect } from "teller-connect-react";
import { showError, showSuccess } from "@/utils/toast";
import TextInput from "@/components/ui/TextInput";
import { IconHelp } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import "driver.js/dist/driver.css";
import { driver } from "driver.js";
import api from "@/utils/api";
import {
  connectBankAccount,
  fetchBankAccounts,
  updateUserProfile,
} from "@/utils/apiHelpers";
import { showWarning } from "@/utils/toast";

interface ProfileViewProps {
  user: IUser;
}

interface BankAccount {
  id: string;
  name: string;
}

const driverObj = driver({
  popoverClass: "driverjs-theme", // custom class applied to each popover
  allowClose: false,
  showProgress: true,
  steps: [
    {
      element: "#connect-button",
      popover: {
        title: "Connect Your Bank",
        description: "Click here to securely connect your bank account.",
        side: "bottom",
      },
    },
    {
      element: "#account-dropdown",
      popover: {
        title: "Choose an Account",
        description: "Pick the account you want to track from the dropdown.",
        side: "bottom",
      },
    },
    {
      element: "#save-button",
      popover: {
        title: "Save Settings",
        description: "Click save to lock in your choices and start tracking.",
        side: "top",
      },
    },
  ],
});
export default function ProfileView({ user }: ProfileViewProps) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [theme, setTheme] = useState(user.preferences.theme || "system");
  const [accountId, setAccountId] = useState(user.preferences.accountId);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tellerCompleted, setTellerCompleted] = useState(false);

  const { open, ready } = useTellerConnect({
    applicationId: "app_p8gs0depa90f4sgbou000",
    appearance: "dark",
    environment:
      process.env.NODE_ENV === "development" ? "sandbox" : "development",
    onSuccess: async (authorization) => {
      try {
        await connectBankAccount(authorization.accessToken);
        setTellerCompleted(true); // mark it done
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      }
    },
  });

  useEffect(() => {
    if (!user.bankAccessToken) {
      showError("No bank account connected. Please connect your bank account.");
      return;
    }

    (async () => {
      try {
        const accounts = await fetchBankAccounts(user);
        setBankAccounts(accounts);
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (loading) return;

    const updatedUser: IUser = {
      ...user,
      firstName,
      lastName,
      email,
      preferences: {
        ...user.preferences,
        theme,
        accountId,
      },
    };

    try {
      // If the user has changed their accountId
      if ((accountId || "") !== (user.preferences.accountId || "")) {
        const confirmChange = window.confirm(
          "Changing your account will remove the current account's transactions. Proceed?"
        );
        if (!confirmChange) return;
        await api.delete("/api/transaction/bulk-delete");
        showWarning("Transactions deleted");
      }

      await updateUserProfile(updatedUser, setLoading);
    } catch (err: any) {
      setError(err.message);
    }
  };
  return (
    <div className="flex justify-center ">
      <Card className="w-full p-6 rounded-2xl shadow-lg space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black text-text">Profile</h1>
          <button
            onClick={() => {
              if (user.bankAccessToken || tellerCompleted) {
                driverObj.drive();
              } else {
                showWarning("Please finish connecting your bank first.");
              }
            }}
            className="text-sm text-primary underline flex items-center gap-1"
          >
            <IconHelp className="h-4 w-4" />
            Need help setting up?
          </button>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Profile Info</h2>
          <div className="flex gap-4 mb-4">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-bold text-text">First Name</label>
              <TextInput
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-bold text-text">Last Name</label>
              <TextInput
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <label className="text-sm font-bold text-text">Email</label>
            <TextInput
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Preferences</h2>
          <div className="flex flex-col gap-4 mb-4">
            <div>
              <label className="text-sm font-bold text-text mb-1 block">
                Theme
              </label>
              <select
                className="bg-backgroundGrayLight p-2 h-8 text-base rounded-md w-full"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-text mb-1 block">
                Account
              </label>
              <select
                id="account-dropdown"
                className="bg-backgroundGrayLight p-2 h-8 text-base rounded-md w-full"
                value={accountId || ""}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <button
            id="connect-button"
            className="text-lg bg-primary text-white rounded-md shadow-md py-2 px-4 disabled:opacity-50 hover:bg-primary/90"
            onClick={open}
            disabled={!ready}
          >
            Connect Bank Account
          </button>
          <button
            id="save-button"
            className={`text-lg rounded-md shadow-md py-2 px-6 ${
              loading
                ? "bg-backgroundGray"
                : "bg-backgroundGrayLight hover:bg-backgroundGray"
            }`}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>

        {error && <p className="text-red-500 pt-2">{error}</p>}
      </Card>
    </div>
  );
}
