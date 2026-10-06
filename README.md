# Multi-PSP Checkout Sandbox Demo Playground (Littlepay & Moneris)

An interactive, high-fidelity engineering playground showcasing both **Inline JavaScript SDK Drop-in** and **Hosted Payment Link Redirection** payment flows across multiple Payment Service Providers (PSPs): **Littlepay** and **Moneris**.

The application includes a zero-dependency local Node.js proxy server that reads sensitive API credentials securely from a **server-side configuration variable** (loaded from `env.local.json` which overrides `env.json`), bypassing browser CORS policies entirely while keeping your secret merchant credentials safe.

![img_1.png](img_1.png)
---

## 🚀 Key Features

- **Multi-PSP Selection**:
  - Switch between **Littlepay** and **Moneris** dynamically via a top-level PSP dropdown.
  - Automatically adapts UI configuration forms and credentials based on the selected PSP.
- **Secure Server-Side Credential Management**:
  - API keys and tokens are configured and managed **exclusively on the server-side**.
  - Loads configuration on startup from `env.local.json` (git-ignored for local secrets) with fallback to `env.json`.
- **Supported Integration Flows**:
  - **Littlepay**:
    - **Inline SDK (v2)**: Mounts the secure card input form directly inside your page using the `LittlePay` library.
    - **Hosted Payment Link**: Automates the 4-step backend generation pipeline, appending `sdkVersion=2`, and renders a redirection screen.
  - **Moneris**:
    - **Moneris Checkout (MCO) Inline SDK**: Performs server-to-server `preload` to acquire a ticket and renders the interactive iframe form using `monerisCheckout`. Includes automated `/api/moneris-receipt` server verification upon completion.
- **Dynamic Controls & Theme Customizer**:
  - Custom customer reference, currency, and amount.
  - Dynamic **Locale Selector** and **Theme Customizer** for Littlepay Drop-in.
- **Developer Logs Terminal**:
  - Intercepts all callbacks, webhooks, and backend proxy responses and prints real-time logs with timestamps.

---

## 🧩 Extensible PSP Architecture

The project uses a declarative registry pattern for supported PSPs, decoupling provider configurations from core UI and proxy logic:

1. **Frontend Registry (`app.js` -> `SUPPORTED_PSPS`)**:
   - Each PSP defines its identifier, display name, header badge, default currency, supported checkout methods (`sdk`, `link`), UI feature toggles (`mitType`, `customSettings`, `checkoutMethod`), DOM container ID, UI labels, SDK verification check, cleanup teardown, and mounting logic.
   - The dropdown and form fields adapt automatically based on the active PSP's capabilities without hardcoded conditionals.

2. **Backend Handler Registry (`server.js` -> `PSP_HANDLERS`)**:
   - Each PSP defines an async session creation handler (`handle<Psp>Session`) registered in `PSP_HANDLERS`.
   - The `/api/create-session` proxy dynamically routes requests to the requested PSP handler.

### ➕ How to Add a New PSP

Adding a new PSP requires only two simple steps:

1. **Frontend (`app.js`)**: Add your PSP entry to `SUPPORTED_PSPS`:
   ```javascript
   new_psp: {
       id: 'new_psp',
       name: 'New PSP',
       badge: 'New PSP Gateway',
       defaultCurrency: 'USD',
       defaultMethod: 'sdk',
       supportedMethods: [{ id: 'sdk', label: 'Inline Drop-in SDK' }],
       features: { checkoutMethod: false, mitType: false, customSettings: false },
       containerId: 'new-psp-checkout-ui',
       buttonText: { sdk: 'Initialize New PSP Checkout' },
       previewTexts: {
           sdk: {
               title: '2. New PSP Checkout UI',
               subtitle: 'Secure drop-in rendered by New PSP SDK.',
               placeholderTitle: 'Ready to Initialize',
               placeholderText: 'Click initialize to start checkout.'
           }
       },
       checkSdkAvailable: () => typeof window.NewPspSdk !== 'undefined',
       cleanup: () => { /* unmount active instance */ },
       mount: async (sessionData, context) => { /* mount SDK or redirect */ }
   }
   ```

2. **Backend (`server.js`)**: Implement session creation logic and register it in `PSP_HANDLERS`:
   ```javascript
   async function handleNewPspSession(sessionParams, res) {
       // Call PSP API to initialize payment intent/order/session
       res.writeHead(200, { 'Content-Type': 'application/json' });
       res.end(JSON.stringify({ psp: 'new_psp', client_token: '...' }));
   }

   const PSP_HANDLERS = {
       littlepay: handleLittlepaySession,
       moneris: handleMonerisSession,
       new_psp: handleNewPspSession
   };
   ```

---

## 📁 File Structure

- `index.html`: Scaffolds the dual-column playground workspace, PSP selector, and mount wrappers.
- `style.css`: Modern styling incorporating custom monospace log consoles, glowing active state dots, animations, and responsive grids.
- `app.js`: Connects HTML state, registers color syncs, constructs config payloads, handles PSP switching, and intercepts SDK callbacks.
- `server.js`: Zero-dependency static files and backend proxy server for both Littlepay and Moneris endpoints.
- `env.json`: Template file committed to the repository containing placeholder values.
- `env.local.json`: Local development secure override file (ignored in Git) containing your real secret API credentials.

---

## 🛠️ How to Run & Test

1. **Configure Your Local Secure Override**:
   Create a file named `env.local.json` in the project root directory and paste your Sandbox credentials:
   ```json
   {
     "LITTLEPAY_API_KEY": "your_littlepay_sandbox_key",
     "MONERIS_STORE_ID": "monca00392",
     "MONERIS_API_TOKEN": "your_moneris_api_token",
     "MONERIS_CHECKOUT_ID": "your_moneris_checkout_id",
     "MONERIS_ENV": "qa"
   }
   ```

2. **Start the Local Proxy Server**:
   In your terminal, run:
   ```bash
   node server.js
   ```

3. **Access the Playground**:
   Open your browser and navigate to:
   👉 **`http://localhost:8000`**

4. **Test Moneris Integration**:
   - In the **Payment Service Provider (PSP)** dropdown, select **Moneris**.
   - Click **Initialize Moneris Checkout (MCO)** to load the secure inline iframe drop-in.
