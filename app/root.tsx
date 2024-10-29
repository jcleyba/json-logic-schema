import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";

import { GlobalPendingIndicator } from "@/components/global-pending-indicator";
import { Header } from "@/components/header";
import {
  ThemeSwitcherSafeHTML,
  ThemeSwitcherScript,
} from "@/components/theme-switcher";

import "./globals.css";

function App({ children }: { children: React.ReactNode }) {
  return (
    <ThemeSwitcherSafeHTML lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ThemeSwitcherScript />
      </head>
      <body>
        <GlobalPendingIndicator />
        <Header />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </ThemeSwitcherSafeHTML>
  );
}

export default function Root() {
  return (
    <App>
      <div className="min-h-screen flex flex-col">
        <nav className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <ul className="flex space-x-4">
              <li>
                <Link to="/" className="hover:text-gray-300">
                  JsonLogic to JSON Schema
                </Link>
              </li>
              <li>
                <Link to="/parser" className="hover:text-gray-300">
                  JSON Schema to JsonLogic
                </Link>
              </li>
              <li>
                <Link to="/json-schema" className="hover:text-gray-300">
                  JSON Schema example
                </Link>
              </li>
              <li>
                <Link to="/json-logic" className="hover:text-gray-300">
                  JsonLogic example
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <main className="flex-1 container mx-auto p-4">
          <Outlet />
        </main>
      </div>
    </App>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let status = 500;
  let message = "An unexpected error occurred.";
  if (isRouteErrorResponse(error)) {
    status = error.status;
    switch (error.status) {
      case 404:
        message = "Page Not Found";
        break;
    }
  } else {
    console.error(error);
  }

  return (
    <App>
      <div className="container prose py-8">
        <h1>{status}</h1>
        <p>{message}</p>
      </div>
    </App>
  );
}
