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
