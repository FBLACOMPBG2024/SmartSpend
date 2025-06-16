import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import { IUser, UserProvider } from "@/components/context/UserContext";
import api from "@/utils/api";
import { GoogleOAuthProvider } from "@react-oauth/google";
import PropagateLoader from "react-spinners/PropagateLoader";
import { ToastContainer } from "react-toastify";
import Router from "next/router";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import Head from "next/head";
// Load the Inter font with the Latin subset (The only one our site will require)
const inter = Inter({ subsets: ["latin"] });

// Define the App component
// Import our font and apply it to the main element
export default function App({
  Component,
  pageProps: { ...pageProps },
}: AppProps) {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "phc_qKa8wF3QRiVNUnB6YMQyOaoXHRZVj6UUzpqtNCe7K4O", {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
      // Enable debug mode in development
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") posthog.debug();
      },
    });

    const handleRouteChange = () => posthog?.capture("$pageview");

    Router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      Router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, []);

  useEffect(() => {
    const infoResponse = async () => {
      try {
        const response = await api.get("api/user/info");
        if (response?.status === 200) {
          setUser(response.data.user);
        }
      } catch (error: any) {
        if (error.response?.status !== 401) {
          console.error(error);
        }
        // else: silently ignore 401
      } finally {
        setLoading(false);
      }
    };

    if (!user) {
      infoResponse();
      return;
    }

    if (!user.preferences) {
      // This should almost never happen but just in case
      setLoading(false);
      return;
    }

    if (user.preferences.theme !== "system") {
      // If the user has a theme set, apply it
      document.body.classList.remove("light", "dark");
      document.body.classList.add(user.preferences.theme);
    }
  }, [user]);

  return (
    <>
      <Head>
        <title>SmartSpend</title>
        <meta name="description" content="SmartSpend" />
      </Head>

      {loading ? (
        <main className={inter.className}>
          <div className="w-full h-screen flex items-center justify-center">
            <PropagateLoader color="rgb(var(--primary))" />
          </div>
        </main>
      ) : (
        <PostHogProvider client={posthog}>
          <GoogleOAuthProvider
            clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string}
          >
            <UserProvider value={{ user: user!, setUser }}>
              {/* This is bit of a hack with user!, but it works */}
              <main className={inter.className}>
                <Component {...pageProps} />
                <ToastContainer />
              </main>
            </UserProvider>
          </GoogleOAuthProvider>
        </PostHogProvider>
      )}
    </>
  );
}
