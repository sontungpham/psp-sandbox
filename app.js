/**
 * Multi-PSP Checkout Demo Playground
 *
 * Supported PSP Registry Architecture:
 * Each PSP is defined declaratively in `SUPPORTED_PSPS` with its metadata,
 * supported features, UI labels, SDK validation, cleanup, and mounting logic.
 *
 * To add a new PSP:
 * 1. Add a new key and configuration object to `SUPPORTED_PSPS`.
 * 2. The UI dropdown, badges, controls, cleanup, and mount flows will automatically adapt.
 */

// State variables for active SDK instances
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
    
    if (logsContainer) {
        logsContainer.appendChild(entry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
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
 * Builds the theme and layout parameters for Littlepay SDK mode
 */
function buildSdkConfig(clientToken) {
    const primaryColor = primaryColorInput ? primaryColorInput.value : '#2d3748';
    const bgColor = bgColorInput ? bgColorInput.value : '#ffffff';
    const buttonBg = buttonBgInput ? buttonBgInput.value : '#ed7625';
    const buttonColor = buttonColorInput ? buttonColorInput.value : '#ffffff';
    const borderRadius = (borderRadiusInput && borderRadiusInput.value) || '4px';
    const fontFamily = fontFamilySelect ? fontFamilySelect.value : 'Rubik, sans-serif';
    const locale = localeSelect ? localeSelect.value : 'en-GB';
    const labelPosition = labelPositionSelect ? labelPositionSelect.value : 'floating';
    const cardholderDetailFields = cardholderDetailSelect ? cardholderDetailSelect.value : 'HIDE';
    const disableSavedCards = disableSavedSelect ? disableSavedSelect.value === 'true' : false;

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

// =============================================================================
// SUPPORTED PSP REGISTRY
// =============================================================================
/**
 * Master Registry of Supported Payment Service Providers (PSPs).
 *
 * Each PSP configuration defines:
 * - id: Unique identifier matching backend route expectations
 * - name: Human-readable display label for dropdown and logs
 * - badge: Label shown in the header badge
 * - defaultCurrency: Default ISO 4217 currency code
 * - defaultMethod: Default checkout method ('sdk', 'link', etc.)
 * - supportedMethods: Array of selectable checkout methods [{ id, label }]
 * - features: Toggles for UI feature panels:
 *     - checkoutMethod: Show/hide checkout method dropdown
 *     - mitType: Show/hide MIT registration type dropdown
 *     - customSettings: Show/hide locale, layout, and theme settings
 * - containerId: ID of container element rendered for drop-in
 * - buttonText: Mapping of method -> button label
 * - previewTexts: Mapping of method -> { title, subtitle, placeholderTitle, placeholderText }
 * - checkSdkAvailable: Function verifying whether external SDK is ready
 * - sdkMissingMessage: User-facing warning when SDK CDN script is absent
 * - cleanup: Teardown logic for previously running instances
 * - mount: Handler to render the drop-in UI or redirect link
 */
const SUPPORTED_PSPS = {
    littlepay: {
        id: 'littlepay',
        name: 'Littlepay',
        badge: 'Littlepay SDK',
        defaultCurrency: 'EUR',
        defaultMethod: 'sdk',
        supportedMethods: [
            { id: 'sdk', label: 'Inline Drop-in SDK' },
            { id: 'link', label: 'Payment Link / Hosted Redirection' }
        ],
        features: {
            checkoutMethod: true,
            mitType: true,
            customSettings: true
        },
        containerId: 'littlepay-dropin-ui',
        buttonText: {
            sdk: 'Generate Token & Register Card',
            link: 'Generate Payment Link'
        },
        previewTexts: {
            sdk: {
                title: '2. Checkout Drop-in UI',
                subtitle: 'Secure interactive elements rendered by Littlepay SDK.',
                placeholderTitle: 'Ready to Initialize SDK',
                placeholderText: 'Configure parameters and click "Generate Token & Register Card" to load the secure inline drop-in.'
            },
            link: {
                title: '2. Hosted Checkout Link',
                subtitle: 'Secure redirect options generated by Littlepay Sandbox.',
                placeholderTitle: 'Ready to Generate Link',
                placeholderText: 'Configure parameters and click "Generate Payment Link" to construct your hosted checkout redirect.'
            }
        },
        checkSdkAvailable: () => typeof window.LittlePay === 'function',
        sdkMissingMessage: 'Littlepay Checkout SDK script failed to load from CDN. Direct connection testing requires internet access.',
        cleanup: () => {
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
        },
        mount: async (sessionData, context) => {
            if (sdkContainer) {
                sdkContainer.classList.remove('hidden');
                sdkContainer.innerHTML = '';
            }

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

                const copyBtn = document.getElementById('btn-pl-copy');
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        const urlInput = document.getElementById('pl-url-input');
                        if (urlInput) {
                            urlInput.select();
                            document.execCommand('copy');
                            log('[System] Payment link URL copied to clipboard.', 'success');
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
                        }
                    });
                }

                const openBtn = document.getElementById('btn-pl-open');
                if (openBtn) {
                    openBtn.addEventListener('click', () => {
                        log('[System] Redirecting customer to hosted payment page in a new tab...', 'system');
                        window.open(sessionData.url, '_blank');
                    });
                }
                return;
            }

            // ROUTE B: INLINE SDK (Direct Mount Form)
            const config = buildSdkConfig(sessionData.client_token);
            log('[System] Initializing window.LittlePay() with configuration...', 'system');

            littlePayInstance = window.LittlePay(config);
            log('[System] Littlepay SDK Instance created successfully.', 'success');
            if (unmountBtn) unmountBtn.disabled = false;
            
            const errorCallback = (error) => {
                log(`[Callback] errorCallback fired: ${JSON.stringify(error)}`, 'error');
                console.error('Littlepay SDK Error callback:', error);
            };
            
            const successCallback = (paymentIntentId) => {
                log(`[Callback] successCallback fired with ID: ${paymentIntentId}`, 'success');
                log('[System] Stored Payment Method registered successfully! Card saved.', 'success');
                
                cleanupExistingSession();
                if (unmountBtn) unmountBtn.disabled = true;
                
                if (sdkContainer) {
                    sdkContainer.classList.remove('hidden');
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
                }
            };

            log('[System] Launching registerCard() flow...', 'system');
            littlePayInstance.registerCard(errorCallback, successCallback);
            log('[System] registerCard() form rendering within target container.', 'system');
        }
    },

    moneris: {
        id: 'moneris',
        name: 'Moneris',
        badge: 'Moneris Gateway',
        defaultCurrency: 'CAD',
        defaultMethod: 'sdk',
        supportedMethods: [
            { id: 'sdk', label: 'Inline Drop-in SDK' }
        ],
        features: {
            checkoutMethod: false,
            mitType: false,
            customSettings: false
        },
        containerId: 'moneris-checkout-ui',
        buttonText: {
            sdk: 'Initialize Moneris Checkout (MCO)'
        },
        previewTexts: {
            sdk: {
                title: '2. Moneris Checkout Drop-in UI',
                subtitle: 'Secure interactive iframe rendered by Moneris Checkout JS SDK.',
                placeholderTitle: 'Ready to Initialize Moneris Checkout',
                placeholderText: 'Configure parameters and click "Initialize Moneris Checkout (MCO)" to load the secure inline drop-in.'
            }
        },
        checkSdkAvailable: () => typeof window.monerisCheckout === 'function',
        sdkMissingMessage: 'Moneris Checkout SDK script failed to load from CDN. Direct connection testing requires internet access.',
        cleanup: () => {
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
        },
        mount: async (sessionData, context) => {
            log(`[System] Initializing Moneris Checkout (MCO) with ticket: ${sessionData.ticket}`, 'system');
            if (monerisContainer) monerisContainer.classList.remove('hidden');
            if (sdkContainer) sdkContainer.classList.add('hidden');

            monerisCheckoutInstance = new window.monerisCheckout();
            monerisCheckoutInstance.setMode(sessionData.environment || 'qa');
            monerisCheckoutInstance.setCheckoutDiv('moneris-checkout-ui');

            monerisCheckoutInstance.setCallback('page_loaded', () => {
                log('[Moneris Callback] Checkout page loaded inside iframe.', 'system');
            });

            monerisCheckoutInstance.setCallback('cancel_transaction', () => {
                log('[Moneris Callback] User cancelled transaction.', 'error');
                cleanupExistingSession();
                if (sdkPlaceholder) sdkPlaceholder.classList.remove('hidden');
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
                if (sdkContainer) {
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
                }
            });

            log('[System] Launching Moneris startCheckout()...', 'system');
            monerisCheckoutInstance.startCheckout(sessionData.ticket);
        }
    }
};

/**
 * Returns the currently selected PSP configuration object
 */
function getSelectedPsp() {
    const pspId = pspProviderSelect ? pspProviderSelect.value : 'littlepay';
    return SUPPORTED_PSPS[pspId] || SUPPORTED_PSPS.littlepay;
}

/**
 * Populates the PSP select element dynamically from the registry
 */
function populatePspSelect() {
    if (!pspProviderSelect) return;
    const currentVal = pspProviderSelect.value;
    pspProviderSelect.innerHTML = '';
    
    Object.values(SUPPORTED_PSPS).forEach((psp, index) => {
        const option = document.createElement('option');
        option.value = psp.id;
        option.textContent = psp.name;
        if (currentVal ? psp.id === currentVal : index === 0) {
            option.selected = true;
        }
        pspProviderSelect.appendChild(option);
    });
}

/**
 * Synchronizes checkout methods dropdown options with current PSP capabilities
 */
function populateCheckoutMethods(pspConfig) {
    if (!checkoutMethodSelect) return;
    const currentVal = checkoutMethodSelect.value;
    checkoutMethodSelect.innerHTML = '';

    pspConfig.supportedMethods.forEach(method => {
        const option = document.createElement('option');
        option.value = method.id;
        option.textContent = method.label;
        if (method.id === currentVal) {
            option.selected = true;
        }
        checkoutMethodSelect.appendChild(option);
    });

    if (!pspConfig.supportedMethods.some(m => m.id === currentVal)) {
        checkoutMethodSelect.value = pspConfig.defaultMethod || pspConfig.supportedMethods[0]?.id || 'sdk';
    }
}

/**
 * Updates UI based on the selected Payment Service Provider (PSP)
 */
function updatePspUI() {
    const psp = getSelectedPsp();
    const pspBadge = document.getElementById('psp-badge');
    const checkoutMethodGroup = document.getElementById('checkout-method-group');

    if (pspBadge) {
        pspBadge.textContent = psp.badge;
    }
    if (littlepaySettingsContainer) {
        littlepaySettingsContainer.style.display = psp.features.customSettings ? 'block' : 'none';
    }
    if (mitTypeGroup) {
        mitTypeGroup.style.display = psp.features.mitType ? 'block' : 'none';
    }
    if (checkoutMethodGroup) {
        checkoutMethodGroup.style.display = psp.features.checkoutMethod ? 'block' : 'none';
    }

    // Populate checkout methods supported by this PSP
    populateCheckoutMethods(psp);

    // Auto-update currency if field is empty or was set to another PSP's default currency
    if (orderCurrencyInput) {
        const otherDefaults = Object.values(SUPPORTED_PSPS)
            .filter(p => p.id !== psp.id)
            .map(p => p.defaultCurrency);

        if (!orderCurrencyInput.value || otherDefaults.includes(orderCurrencyInput.value)) {
            orderCurrencyInput.value = psp.defaultCurrency;
        }
    }

    log(`[System] Switched Payment Service Provider to ${psp.name}.`, 'system');
    updateCheckoutMethodUI();
}

/**
 * Updates UI labels and placeholders based on chosen checkout method & PSP
 */
function updateCheckoutMethodUI() {
    const psp = getSelectedPsp();
    const method = checkoutMethodSelect ? checkoutMethodSelect.value : psp.defaultMethod;
    
    const previewTitle = document.getElementById('preview-section-title');
    const previewSubtitle = document.getElementById('preview-section-subtitle');
    const placeholderTitle = document.getElementById('placeholder-title');
    const placeholderText = document.getElementById('placeholder-text');

    const texts = (psp.previewTexts && (psp.previewTexts[method] || psp.previewTexts.default)) || {};
    const btnText = (psp.buttonText && (psp.buttonText[method] || psp.buttonText.default)) || 'Initialize Checkout';

    if (submitBtn) submitBtn.textContent = btnText;
    if (previewTitle && texts.title) previewTitle.textContent = texts.title;
    if (previewSubtitle && texts.subtitle) previewSubtitle.textContent = texts.subtitle;
    if (placeholderTitle && texts.placeholderTitle) placeholderTitle.textContent = texts.placeholderTitle;
    if (placeholderText && texts.placeholderText) placeholderText.textContent = texts.placeholderText;
}

/**
 * Clears and unmounts any active PSP sessions safely
 */
function cleanupExistingSession() {
    Object.values(SUPPORTED_PSPS).forEach(psp => {
        if (typeof psp.cleanup === 'function') {
            psp.cleanup();
        }
        if (psp.containerId) {
            const container = document.getElementById(psp.containerId);
            if (container) {
                container.innerHTML = '';
                container.classList.add('hidden');
            }
        }
    });

    if (sdkContainer) {
        sdkContainer.innerHTML = '';
        sdkContainer.classList.add('hidden');
    }
}

/**
 * Communicates with our zero-dependency backend proxy to construct a secure checkout session
 */
async function createCheckoutSession() {
    const psp = getSelectedPsp();
    const customerRef = customerRefInput.value.trim() || '1';
    const amount = parseInt(orderAmountInput.value.trim(), 10) || 811;
    const currency = orderCurrencyInput.value.trim() || psp.defaultCurrency;
    const mitType = mitTypeSelect.value;
    const checkoutMethod = checkoutMethodSelect ? checkoutMethodSelect.value : psp.defaultMethod;
    const disableSavedCards = disableSavedSelect ? disableSavedSelect.value === 'true' : false;

    log(`[Proxy API] Initializing payload for secure local proxy (/api/create-session) for PSP [${psp.name.toUpperCase()}] in ${checkoutMethod.toUpperCase()} mode...`, 'system');
    
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
        psp: psp.id,
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
        log(`[Proxy API] Session successfully registered via secure local backend proxy for PSP [${psp.name.toUpperCase()}]!`, 'success');
        
        return sessionData;

    } catch (err) {
        log(`[Proxy API Error] Local proxy server request failed: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * High-level form submission handler delegating to the selected PSP mount flow
 */
async function initializeSdkFlow(e) {
    e.preventDefault();
    
    let sessionData = null;
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

    const pspConfig = SUPPORTED_PSPS[sessionData.psp] || getSelectedPsp();
    if (!pspConfig) {
        const errorMsg = `Unsupported PSP: ${sessionData.psp}`;
        log(`[Error] ${errorMsg}`, 'error');
        alert(errorMsg);
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
    }

    // Verify SDK availability if required by PSP
    if (typeof pspConfig.checkSdkAvailable === 'function' && !pspConfig.checkSdkAvailable()) {
        const errorMsg = pspConfig.sdkMissingMessage || `${pspConfig.name} SDK script failed to load.`;
        log(`[Error] ${errorMsg}`, 'error');
        alert(errorMsg);
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        if (sdkPlaceholder) sdkPlaceholder.classList.remove('hidden');
        return;
    }

    // Reset UI Panel
    if (sdkPlaceholder) sdkPlaceholder.classList.add('hidden');
    if (unmountBtn) unmountBtn.disabled = false;

    try {
        await pspConfig.mount(sessionData, {
            log,
            cleanupExistingSession,
            submitBtn,
            originalBtnText,
            sdkPlaceholder,
            unmountBtn,
            sdkContainer,
            monerisContainer
        });
    } catch (err) {
        log(`[System Error] ${pspConfig.name} initialization failure: ${err.message}`, 'error');
        console.error(`${pspConfig.name} initialization failure:`, err);
        if (sdkPlaceholder) sdkPlaceholder.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Attach Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setupColorPickers();
    
    // Populate PSP select from registry
    populatePspSelect();

    // Attach checkout method and PSP change listeners
    if (checkoutMethodSelect) {
        checkoutMethodSelect.addEventListener('change', updateCheckoutMethodUI);
    }
    if (pspProviderSelect) {
        pspProviderSelect.addEventListener('change', updatePspUI);
        updatePspUI();
    } else {
        updateCheckoutMethodUI();
    }
    
    // Check script load status dynamically for all registered PSPs
    Object.values(SUPPORTED_PSPS).forEach(psp => {
        if (typeof psp.checkSdkAvailable === 'function') {
            if (!psp.checkSdkAvailable()) {
                log(`[System] Note: ${psp.name} SDK script is not available or loading.`, 'system');
            } else {
                log(`[System] ${psp.name} SDK CDN script loaded successfully.`, 'success');
            }
        }
    });
    
    if (configForm) {
        configForm.addEventListener('submit', initializeSdkFlow);
    }

    // Setup Custom Dynamic Metadata Rows
    const addMetadataBtn = document.getElementById('btn-add-metadata');
    const metadataContainer = document.getElementById('metadata-rows-container');

    if (addMetadataBtn && metadataContainer) {
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
            
            const removeBtn = row.querySelector('.btn-remove-row');
            removeBtn.addEventListener('click', () => {
                row.remove();
                log('[System] Custom metadata field removed.', 'system');
            });
            
            metadataContainer.appendChild(row);
            log('[System] New custom metadata field added.', 'system');
        });
    }
    
    if (unmountBtn) {
        unmountBtn.addEventListener('click', () => {
            cleanupExistingSession();
            unmountBtn.disabled = true;
            if (sdkPlaceholder) sdkPlaceholder.classList.remove('hidden');
            if (sdkContainer) {
                sdkContainer.classList.add('hidden');
                sdkContainer.innerHTML = '';
            }
        });
    }
    
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            if (logsContainer) logsContainer.innerHTML = '';
            log('[System] Logs cleared.', 'system');
        });
    }
    
    log('[System] Demo playground ready. Configure theme or input a token to start.', 'system');
});
