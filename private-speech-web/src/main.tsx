import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import "./styles.css";

const domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined;

const app = <App authConfigured={Boolean(domain && clientId)} />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {domain && clientId ? (
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          ...(audience ? { audience } : {}),
          scope: "openid profile email"
        }}
        cacheLocation="memory"
        useRefreshTokens={false}
      >
        {app}
      </Auth0Provider>
    ) : app}
  </StrictMode>
);
