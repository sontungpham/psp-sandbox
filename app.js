/**
 * Littlepay Checkout SDK v2 - MIT registerCard Demo Playground
 */

// State variables
let littlePayInstance = null;
let monerisCheckoutInstance = null;

// DOM Elements
const configForm = document.getElementById('sdk-config-form');
const pspProviderSelect = document.getElementById('pspProvider');
const checkoutMethodSelect = document.getElementById('checkoutMethod');
const autoTokenFields = document.getElementById('auto-token-fields');
const littlepaySettingsContainer = document.getElementById('littlepay-settings-container');
const mitTypeGroup = document.getElementById('mit-type-group');

// Mode Inputs
const customerRefInput = document.getElementById('customerRef');
const orderAmountInput = document.getElementById('orderAmount');
const orderCurrencyInput = document.getElementById('orderCurrency');
const mitTypeSelect = document.getElementById('mitType');

// Theme Elements
const primaryColorInput = document.getElementById('primaryColor');
const bgColorInput = document.getElementById('bgColor');
const buttonBgInput = document.getElementById('buttonBg');
const buttonColorInput = document.getElementById('buttonColor');
const borderRadiusInput = document.getElementById('borderRadius');
const fontFamilySelect = document.getElementById('fontFamily');

// UI Controls
const submitBtn = document.getElementById('btn-submit');
const unmountBtn = document.getElementById('btn-unmount');
const clearLogsBtn = document.getElementById('btn-clear-logs');
const logsContainer = document.getElementById('logs-container');
const sdkPlaceholder = document.getElementById('sdk-placeholder');
const sdkContainer = document.getElementById('littlepay-dropin-ui');
const monerisContainer = document.getElementById('moneris-checkout-ui');

// Settings
const localeSelect = document.getElementById('locale');
const labelPositionSelect = document.getElementById('labelPosition');
const cardholderDetailSelect = document.getElementById('cardholderDetailFields');
const disableSavedSelect = document.getElementById('disableSavedCards');

/**
 * Utility to log messages into our simulated console log view
 */
function log(message, type = 'system') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-timestamp';
    timeSpan.textContent = `[${timestamp}]`;
    
    entry.appendChild(timeSpan);
    entry.appendChild(document.createTextNode(` ${message}`));
    
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

/**
 * Synchronizes color pickers text displays
 */
function setupColorPickers() {
    const colorPickers = [
        primaryColorInput,
        bgColorInput,
        buttonBgInput,
        buttonColorInput
    ];
    
    colorPickers.forEach(picker => {
        if (!picker) return;
        picker.addEventListener('input', (e) => {
            const valSpan = picker.nextElementSibling;
            if (valSpan && valSpan.classList.contains('color-value')) {
                valSpan.textContent = e.target.value.toUpperCase();
            }
        });
    });
}

/**
 * Updates UI based on the selected Payment Service Provider (PSP)
 */
function updatePspUI() {
    const psp = pspProviderSelect ? pspProviderSelect.value : 'littlepay';
    const pspBadge = document.getElementById('psp-badge');
    const checkoutMethodGroup = document.getElementById('checkout-method-group');

    if (psp === 'moneris') {
        if (pspBadge) pspBadge.textContent = 'Moneris Gateway';
        if (littlepaySettingsContainer) littlepaySettingsContainer.style.display = 'none';
        if (mitTypeGroup) mitTypeGroup.style.display = 'none';
        if (checkoutMethodGroup) checkoutMethodGroup.style.display = 'none';
        if (checkoutMethodSelect) checkoutMethodSelect.value = 'sdk';
        if (orderCurrencyInput && orderCurrencyInput.value === 'EUR') {
            orderCurrencyInput.value = 'CAD';
        }
        log('[System] Switched Payment Service Provider to Moneris.', 'system');
    } else {
        if (pspBadge) pspBadge.textContent = 'Littlepay SDK';
        if (littlepaySettingsContainer) littlepaySettingsContainer.style.display = 'block';
        if (mitTypeGroup) mitTypeGroup.style.display = 'block';
        if (checkoutMethodGroup) checkoutMethodGroup.style.display = 'block';
        if (orderCurrencyInput && orderCurrencyInput.value === 'CAD') {
            orderCurrencyInput.value = 'EUR';
        }
        log('[System] Switched Payment Service Provider to Littlepay.', 'system');
    }

    updateCheckoutMethodUI();
}

/**
 * Updates UI labels and placeholders based on chosen checkout method
 */
function updateCheckoutMethodUI() {
    const method = checkoutMethodSelect.value;
    const psp = pspProviderSelect ? pspProviderSelect.value : 'littlepay';
    
    const previewTitle = document.getElementById('preview-section-title');
    const previewSubtitle = document.getElementById('preview-section-subtitle');
    const placeholderTitle = document.getElementById('placeholder-title');
    const placeholderText = document.getElementById('placeholder-text');

    if (psp === 'moneris') {
        submitBtn.textContent = 'Initialize Moneris Checkout (MCO)';
        
        if (previewTitle) previewTitle.textContent = '2. Moneris Checkout Drop-in UI';
        if (previewSubtitle) previewSubtitle.textContent = 'Secure interactive iframe rendered by Moneris Checkout JS SDK.';
        if (placeholderTitle) placeholderTitle.textContent = 'Ready to Initialize Moneris Checkout';
        if (placeholderText) placeholderText.textContent = 'Configure parameters and click "Initialize Moneris Checkout (MCO)" to load the secure inline drop-in.';
    } else {
        if (method === 'link') {
            submitBtn.textContent = 'Generate Payment Link';
            
            if (previewTitle) previewTitle.textContent = '2. Hosted Checkout Link';
            if (previewSubtitle) previewSubtitle.textContent = 'Secure redirect options generated by Littlepay Sandbox.';
            if (placeholderTitle) placeholderTitle.textContent = 'Ready to Generate Link';
            if (placeholderText) placeholderText.textContent = 'Configure parameters and click "Generate Payment Link" to construct your hosted checkout redirect.';
        } else {
            submitBtn.textContent = 'Generate Token & Register Card';
            
            if (previewTitle) previewTitle.textContent = '2. Checkout Drop-in UI';
            if (previewSubtitle) previewSubtitle.textContent = 'Secure interactive elements rendered by Littlepay SDK.';
            if (placeholderTitle) placeholderTitle.textContent = 'Ready to Initialize SDK';
            if (placeholderText) placeholderText.textContent = 'Configure parameters and click "Generate Token & Register Card" to load the secure inline drop-in.';
        }
    }
}

/**
 * Clears and unmounts the previous SDK instance safely
 */
function cleanupExistingSession() {
    if (littlePayInstance) {
        log('[System] Cleaning up previous Littlepay SDK instance...', 'system');
        try {
            littlePayInstance.unmount();
            log('[System] Previous Littlepay SDK instance successfully unmounted.', 'success');
        } catch (err) {
            log(`[System] Warning on Littlepay unmount: ${err.message}`, 'error');
        }
        littlePayInstance = null;
    }

    if (monerisCheckoutInstance) {
        log('[System] Cleaning up previous Moneris Checkout instance...', 'system');
        try {
            if (typeof monerisCheckoutInstance.closeCheckout === 'function') {
                monerisCheckoutInstance.closeCheckout();
            }
            log('[System] Previous Moneris Checkout instance successfully closed.', 'success');
        } catch (err) {
            log(`[System] Warning on Moneris close: ${err.message}`, 'error');
        }
        monerisCheckoutInstance = null;
    }

    if (monerisContainer) {
        monerisContainer.innerHTML = '';
        monerisContainer.classList.add('hidden');
    }
    if (sdkContainer) {
        sdkContainer.innerHTML = '';
        sdkContainer.classList.add('hidden');
    }
}

/**
 * Builds the theme and layout parameters for SDK mode
 */
function buildSdkConfig(clientToken) {
    const primaryColor = primaryColorInput.value;
    const bgColor = bgColorInput.value;
    const buttonBg = buttonBgInput.value;
    const buttonColor = buttonColorInput.value;
    const borderRadius = borderRadiusInput.value || '4px';
    const fontFamily = fontFamilySelect.value;
    const locale = localeSelect.value;
    const labelPosition = labelPositionSelect.value;
    const cardholderDetailFields = cardholderDetailSelect.value;
    const disableSavedCards = disableSavedSelect.value === 'true';

    return {
        clientToken: clientToken.trim(),
        targetElementId: 'littlepay-dropin-ui',
        locale: locale,
        options: {
            disableSavedCards: disableSavedCards,
            cardholderDetailFields: cardholderDetailFields,
            theme: {
                color: primaryColor,
                backgroundColor: bgColor,
                fontFamily: fontFamily,
                labelPosition: labelPosition,
                loadingScreen: {
                    color: buttonBg,
                    backgroundColor: bgColor,
                },
                button: {
                    color: buttonColor,
                    backgroundColor: buttonBg,
                    borderRadius: borderRadius,
                },
                errorMessage: {
                    color: '#ffffff',
                    backgroundColor: '#e53e3e',
                },
                navigationBar: {
                    color: primaryColor,
                    backgroundColor: bgColor,
                },
                input: {
                    borderRadius: '6px',
                    borderWidth: '1px',
                    color: primaryColor,
                    backgroundColor: bgColor
                }
            }
        }
    };
}

/**
 * Communicates with our zero-dependency backend proxy to construct a secure checkout session
 */
async function createCheckoutSession() {
    const psp = pspProviderSelect ? pspProviderSelect.value : 'littlepay';
    const customerRef = customerRefInput.value.trim() || '1';
    const amount = parseInt(orderAmountInput.value.trim(), 10) || 811;
    const currency = orderCurrencyInput.value.trim() || (psp === 'moneris' ? 'CAD' : 'EUR');
    const mitType = mitTypeSelect.value;
    const checkoutMethod = checkoutMethodSelect.value;
    const disableSavedCards = disableSavedSelect.value === 'true';

    log(`[Proxy API] Initializing payload for secure local proxy (/api/create-session) for PSP [${psp.toUpperCase()}] in ${checkoutMethod.toUpperCase()} mode...`, 'system');
    
    // Parse custom dynamic metadata fields
    const metadata = {};
    
    const metadataContainer = document.getElementById('metadata-rows-container');
    if (metadataContainer) {
        const keyInputs = metadataContainer.querySelectorAll('.metadata-key');
        const valueInputs = metadataContainer.querySelectorAll('.metadata-value');
        keyInputs.forEach((keyInput, index) => {
            const key = keyInput.value.trim();
            const val = valueInputs[index].value.trim();
            if (key) {
                metadata[key] = val;
            }
        });
    }

    const payload = {
        psp: psp,
        mitType: mitType,
        checkoutMethod: checkoutMethod,
        disableSavedCards: disableSavedCards,
        locale: localeSelect ? localeSelect.value : 'en-GB',
        orderPayload: {
            customer_ref: customerRef,
            charge: {
                amount: amount,
                currency: currency
            },
            metadata: metadata
        }
    };

    try {
        const proxyResponse = await fetch('/api/create-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!proxyResponse.ok) {
            const errText = await proxyResponse.text();
            let parsedErr;
            try {
                parsedErr = JSON.parse(errText).error;
            } catch(e) {
                parsedErr = errText;
            }
            throw new Error(parsedErr || proxyResponse.statusText);
        }

        const sessionData = await proxyResponse.json();
        log(`[Proxy API] Session successfully registered via secure local backend proxy for PSP [${psp.toUpperCase()}]!`, 'success');
        
        return sessionData;

    } catch (err) {
        log(`[Proxy API Error] Local proxy server request failed: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * High-level form submission handler
 */
async function initializeSdkFlow(e) {
    e.preventDefault();
    
    let sessionData = null;
    
    // UI Loading state
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Preparing Session...';

    cleanupExistingSession();

    try {
        sessionData = await createCheckoutSession();
    } catch (apiError) {
        log(`[Error] Failed to initialize checkout session: ${apiError.message}`, 'error');
        alert(`Failed to initialize checkout session:\n"${apiError.message}"`);
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
    }

    // Reset UI Panel
    sdkPlaceholder.classList.add('hidden');
    unmountBtn.disabled = false;

    // ==========================================
    // MONERIS FLOWS
    // ==========================================
    if (sessionData.psp === 'moneris') {
        // Moneris Checkout (MCO) Inline SDK Flow
        if (typeof window.monerisCheckout !== 'function') {
            const errorMsg = 'Moneris Checkout SDK script failed to load from CDN. Direct connection testing requires internet access.';
            log(`[Error] ${errorMsg}`, 'error');
            alert(errorMsg);
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            sdkPlaceholder.classList.remove('hidden');
            return;
        }

        log(`[System] Initializing Moneris Checkout (MCO) with ticket: ${sessionData.ticket}`, 'system');
        monerisContainer.classList.remove('hidden');
        sdkContainer.classList.add('hidden');

        try {
            monerisCheckoutInstance = new window.monerisCheckout();
            monerisCheckoutInstance.setMode(sessionData.environment || 'qa');
            monerisCheckoutInstance.setCheckoutDiv('moneris-checkout-ui');

            monerisCheckoutInstance.setCallback('page_loaded', () => {
                log('[Moneris Callback] Checkout page loaded inside iframe.', 'system');
            });

            monerisCheckoutInstance.setCallback('cancel_transaction', () => {
                log('[Moneris Callback] User cancelled transaction.', 'error');
                cleanupExistingSession();
                sdkPlaceholder.classList.remove('hidden');
            });

            monerisCheckoutInstance.setCallback('error_event', (err) => {
                log(`[Moneris Callback] Error: ${JSON.stringify(err)}`, 'error');
            });

            monerisCheckoutInstance.setCallback('payment_complete', async (callbackData) => {
                log(`[Moneris Callback] payment_complete: ${callbackData}`, 'success');
                let parsed = {};
                try {
                    parsed = typeof callbackData === 'string' ? JSON.parse(callbackData) : callbackData;
                } catch (e) {
                    parsed = { raw: callbackData };
                }

                // Verify Receipt server-to-server
                log('[Proxy Moneris] Verifying transaction receipt via /api/moneris-receipt...', 'system');
                try {
                    const ticketToVerify = parsed.ticket || sessionData.ticket;
                    const receiptRes = await fetch('/api/moneris-receipt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ticket: ticketToVerify })
                    });
                    const receiptData = await receiptRes.json();
                    log(`[Proxy Moneris] Receipt Status: ${JSON.stringify(receiptData.response ? receiptData.response.receipt : receiptData)}`, 'success');
                } catch (rErr) {
                    log(`[Proxy Moneris Error] Receipt verification error: ${rErr.message}`, 'error');
                }

                cleanupExistingSession();
                sdkContainer.classList.remove('hidden');
                sdkContainer.innerHTML = `
                    <div class="card-success-message" style="text-align: center; padding: 40px 20px; animation: fadeIn 0.4s ease-out;">
                        <div style="font-size: 3rem; margin-bottom: 16px;">✅</div>
                        <h3 style="color: var(--success); font-weight: 700; margin-bottom: 8px;">Moneris Payment Complete!</h3>
                        <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 16px;">The transaction was processed by Moneris.</p>
                        <div style="background-color: var(--success-light); color: var(--success); border: 1px solid rgba(56, 161, 105, 0.2); font-family: var(--font-mono); font-size: 0.75rem; padding: 12px; border-radius: var(--radius-md); word-break: break-all; text-align: left;">
                            <strong>Order No:</strong> ${sessionData.order_no}<br>
                            <strong>Ticket:</strong> ${sessionData.ticket}
                        </div>
                    </div>
                `;
            });

            log('[System] Launching Moneris startCheckout()...', 'system');
            monerisCheckoutInstance.startCheckout(sessionData.ticket);

        } catch (mcoErr) {
            log(`[System Error] Moneris Checkout launch failure: ${mcoErr.message}`, 'error');
            console.error('Moneris Checkout initialization failure:', mcoErr);
            sdkPlaceholder.classList.remove('hidden');
            monerisContainer.classList.add('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }

        return;
    }

    // ==========================================
    // LITTLEPAY FLOWS (Default)
    // ==========================================
    sdkContainer.classList.remove('hidden');
    sdkContainer.innerHTML = '';

    // ROUTE A: PAYMENT LINK (Hosted Redirection)
    if (sessionData.checkoutMethod === 'link') {
        log(`[System] Payment Link checkout flow initiated. Rendering redirection view.`, 'system');
        log(`[System] Final Link: ${sessionData.url}`, 'success');

        sdkContainer.innerHTML = `
            <div class="payment-link-card" style="text-align: center; padding: 40px 20px; animation: fadeIn 0.4s ease-out; font-family: var(--font-sans);">
                <div style="font-size: 3.5rem; margin-bottom: 16px; color: var(--primary);">🔗</div>
                <h3 style="color: var(--text-main); font-weight: 700; margin-bottom: 8px;">Payment Link Generated!</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 24px;">Your hosted checkout payment link is ready for secure card registration.</p>
                
                <div style="display: flex; gap: 8px; margin-bottom: 20px;">
                    <input type="text" id="pl-url-input" value="${sessionData.url}" readonly style="flex-grow: 1; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 0.75rem; background-color: #f8fafc; color: var(--text-main);">
                    <button id="btn-pl-copy" class="btn btn-secondary btn-sm" style="width: auto; padding: 10px 16px; font-size: 0.85rem; border-radius: var(--radius-md);">Copy</button>
                </div>

                <button id="btn-pl-open" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 0.95rem; border-radius: var(--radius-md); background-color: var(--primary); font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span>Open Hosted Checkout</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </button>
            </div>
        `;

        // Copy button event
        const copyBtn = document.getElementById('btn-pl-copy');
        copyBtn.addEventListener('click', () => {
            const urlInput = document.getElementById('pl-url-input');
            urlInput.select();
            document.execCommand('copy');
            log('[System] Payment link URL copied to clipboard.', 'success');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });

        // Open button event
        const openBtn = document.getElementById('btn-pl-open');
        openBtn.addEventListener('click', () => {
            log('[System] Redirecting customer to hosted payment page in a new tab...', 'system');
            window.open(sessionData.url, '_blank');
        });

        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
    }

    // ROUTE B: INLINE SDK (Direct Mount Form)
    if (typeof window.LittlePay !== 'function') {
        const errorMsg = 'Littlepay Checkout SDK script failed to load from CDN. Direct connection testing requires internet access.';
        log(`[Error] ${errorMsg}`, 'error');
        alert(errorMsg);
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        sdkPlaceholder.classList.remove('hidden');
        sdkContainer.classList.add('hidden');
        return;
    }

    // Generate configuration for the SDK
    const config = buildSdkConfig(sessionData.client_token);
    log('[System] Initializing window.LittlePay() with configuration...', 'system');

    try {
        littlePayInstance = window.LittlePay(config);
        log('[System] Littlepay SDK Instance created successfully.', 'success');
        unmountBtn.disabled = false;
        
        const errorCallback = (error) => {
            log(`[Callback] errorCallback fired: ${JSON.stringify(error)}`, 'error');
            console.error('Littlepay SDK Error callback:', error);
        };
        
        const successCallback = (paymentIntentId) => {
            log(`[Callback] successCallback fired with ID: ${paymentIntentId}`, 'success');
            log('[System] Stored Payment Method registered successfully! Card saved.', 'success');
            
            cleanupExistingSession();
            unmountBtn.disabled = true;
            
            sdkContainer.innerHTML = `
                <div class="card-success-message" style="text-align: center; padding: 40px 20px; animation: fadeIn 0.4s ease-out;">
                    <div style="font-size: 3rem; margin-bottom: 16px;">✅</div>
                    <h3 style="color: var(--success); font-weight: 700; margin-bottom: 8px;">Registration Successful!</h3>
                    <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 16px;">The stored payment method was registered securely.</p>
                    <div style="background-color: var(--success-light); color: var(--success); border: 1px solid rgba(56, 161, 105, 0.2); font-family: var(--font-mono); font-size: 0.75rem; padding: 12px; border-radius: var(--radius-md); word-break: break-all; text-align: left;">
                        <strong>Payment Intent ID:</strong><br>${paymentIntentId}
                    </div>
                </div>
            `;
        };

        log('[System] Launching registerCard() flow...', 'system');
        littlePayInstance.registerCard(errorCallback, successCallback);
        log('[System] registerCard() form rendering within target container.', 'system');

    } catch (err) {
        log(`[System] Initialisation Error: ${err.message}`, 'error');
        console.error('Initialization failure:', err);
        sdkPlaceholder.classList.remove('hidden');
        sdkContainer.classList.add('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Attach Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setupColorPickers();
    
    // Attach checkout method and PSP change listeners
    checkoutMethodSelect.addEventListener('change', updateCheckoutMethodUI);
    if (pspProviderSelect) {
        pspProviderSelect.addEventListener('change', updatePspUI);
        updatePspUI();
    } else {
        updateCheckoutMethodUI();
    }
    
    // Check script load status immediately on page load
    if (typeof window.LittlePay !== 'function') {
        log('[System] Warning: window.LittlePay is not available. Please make sure you are online to load the CDN script.', 'error');
    } else {
        log('[System] Littlepay SDK CDN script loaded successfully.', 'success');
    }

    if (typeof window.monerisCheckout !== 'function') {
        log('[System] Note: Moneris Checkout SDK script is not available or loading.', 'system');
    } else {
        log('[System] Moneris Checkout SDK CDN script loaded successfully.', 'success');
    }
    
    configForm.addEventListener('submit', initializeSdkFlow);

    // Setup Custom Dynamic Metadata Rows
    const addMetadataBtn = document.getElementById('btn-add-metadata');
    const metadataContainer = document.getElementById('metadata-rows-container');

    if (addMetadataBtn && metadataContainer) {
        // Wire up existing pre-rendered remove buttons
        const existingRemoveBtns = metadataContainer.querySelectorAll('.btn-remove-row');
        existingRemoveBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.parentElement.remove();
                log('[System] Custom metadata field removed.', 'system');
            });
        });

        addMetadataBtn.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'metadata-row';
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.alignItems = 'center';
            row.style.animation = 'fadeIn 0.2s ease';
            
            row.innerHTML = `
                <input type="text" class="metadata-key" placeholder="Key" style="flex: 1; padding: 6px 10px; font-size: 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                <input type="text" class="metadata-value" placeholder="Value" style="flex: 1; padding: 6px 10px; font-size: 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                <button type="button" class="btn-remove-row" style="background: none; border: none; color: var(--error); font-size: 1.25rem; cursor: pointer; padding: 0 4px; line-height: 1;">×</button>
            `;
            
            // Remove button handler
            const removeBtn = row.querySelector('.btn-remove-row');
            removeBtn.addEventListener('click', () => {
                row.remove();
                log('[System] Custom metadata field removed.', 'system');
            });
            
            metadataContainer.appendChild(row);
            log('[System] New custom metadata field added.', 'system');
        });
    }
    
    unmountBtn.addEventListener('click', () => {
        cleanupExistingSession();
        unmountBtn.disabled = true;
        sdkPlaceholder.classList.remove('hidden');
        sdkContainer.classList.add('hidden');
        sdkContainer.innerHTML = '';
    });
    
    clearLogsBtn.addEventListener('click', () => {
        logsContainer.innerHTML = '';
        log('[System] Logs cleared.', 'system');
    });
    
    log('[System] Demo playground ready. Configure theme or input a token to start.', 'system');
});
