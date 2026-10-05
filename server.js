const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;

// Load default Environment Variables from env.json if present
if (fs.existsSync('env.json')) {
    try {
        const envData = JSON.parse(fs.readFileSync('env.json', 'utf-8'));
        for (const [key, val] of Object.entries(envData)) {
            process.env[key] = val;
        }
        console.log(`[Config] Loaded default variables from env.json.`);
    } catch (e) {
        console.warn(`[Config] Failed to parse env.json:`, e.message);
    }
}

// Load secure local overrides from env.local.json if present
if (fs.existsSync('env.local.json')) {
    try {
        const envLocalData = JSON.parse(fs.readFileSync('env.local.json', 'utf-8'));
        for (const [key, val] of Object.entries(envLocalData)) {
            process.env[key] = val;
        }
        console.log(`[Config] Loaded secure overrides from env.local.json successfully.`);
    } catch (e) {
        console.warn(`[Config] Failed to parse env.local.json:`, e.message);
    }
}

/**
 * Modern Promise wrapper around Node's native HTTPS request module (Zero Dependencies)
 */
function makeHttpsRequest(urlStr, method, headers, requestBody) {
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new url.URL(urlStr);
            const options = {
                hostname: parsedUrl.hostname,
                port: 443,
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                headers: {
                    ...headers,
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };

            const req = https.request(options, (res) => {
                let resBody = '';
                res.on('data', (chunk) => {
                    resBody += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        headers: res.headers,
                        body: resBody
                    });
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.write(requestBody);
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Core Request Router & Server Logic
 */
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Route: API proxy to bypass CORS for localhost development
    if (req.method === 'POST' && pathname === '/api/create-session') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', async () => {
            try {
                const { psp, mitType, orderPayload, checkoutMethod, disableSavedCards, locale } = JSON.parse(body);

                // ==========================================
                // ROUTE PSP: MONERIS
                // ==========================================
                if (psp === 'moneris') {
                    const storeId = (process.env.MONERIS_STORE_ID || '').trim();
                    const apiToken = (process.env.MONERIS_API_TOKEN || '').trim();
                    const checkoutId = (process.env.MONERIS_CHECKOUT_ID || '').trim();
                    const envMode = (process.env.MONERIS_ENV || 'qa').trim().toLowerCase();

                    if (!storeId || storeId === 'FILLME' || !apiToken || apiToken === 'FILLME') {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'MONERIS_STORE_ID or MONERIS_API_TOKEN is not configured or set to FILLME. Please check your env.local.json file.' }));
                        return;
                    }

                    if (!checkoutId || checkoutId === 'FILLME') {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'MONERIS_CHECKOUT_ID is not configured or set to FILLME. Please configure MONERIS_CHECKOUT_ID in your env.local.json file.' }));
                        return;
                    }

                    const chargeAmount = orderPayload && orderPayload.charge ? (orderPayload.charge.amount / 100).toFixed(2) : '10.00';
                    const orderNo = `ORDER-${Date.now()}`;

                    const mcoUrl = envMode === 'prod'
                        ? 'https://gateway.moneris.com/chktv2/request/request.php'
                        : 'https://gatewayt.moneris.com/chktv2/request/request.php';

                    // Moneris Checkout (MCO) Inline SDK Preload Flow
                    console.log(`[Proxy Moneris] Initiating MCO Preload for Store: ${storeId}, Order: ${orderNo}, Amount: ${chargeAmount}, Env: ${envMode} (${mcoUrl})...`);

                    const preloadPayload = {
                        store_id: storeId,
                        api_token: apiToken,
                        checkout_id: checkoutId,
                        environment: envMode,
                        action: 'preload',
                        txn_total: chargeAmount,
                        order_no: orderNo
                    };

                    if (orderPayload && orderPayload.customer_ref) {
                        preloadPayload.cust_id = String(orderPayload.customer_ref);
                    }

                    const mcoRes = await makeHttpsRequest(
                        mcoUrl,
                        'POST',
                        {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        JSON.stringify(preloadPayload)
                    );

                    console.log(`[Proxy Moneris] MCO Preload Response (${mcoRes.statusCode}):`, mcoRes.body);

                    let parsedData;
                    try {
                        parsedData = JSON.parse(mcoRes.body);
                    } catch (e) {
                        parsedData = null;
                    }

                    if (parsedData && parsedData.response && parsedData.response.ticket) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            psp: 'moneris',
                            checkoutMethod: 'sdk',
                            ticket: parsedData.response.ticket,
                            environment: envMode,
                            order_no: orderNo
                        }));
                    } else {
                        const errDetail = parsedData && parsedData.response && parsedData.response.error
                            ? `${parsedData.response.error.field}: ${parsedData.response.error.message}`
                            : mcoRes.body;
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: `Moneris Checkout preload failed (${errDetail}). Please verify your MONERIS_STORE_ID, MONERIS_API_TOKEN, MONERIS_CHECKOUT_ID, and MONERIS_ENV.`
                        }));
                    }
                    return;
                }

                // ==========================================
                // ROUTE PSP: LITTLEPAY (Default)
                // ==========================================
                const apiKey = process.env.LITTLEPAY_API_KEY;

                if (!apiKey) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'LITTLEPAY_API_KEY environment variable is not configured on the server. Please check your env.json file.' }));
                    return;
                }

                console.log(`[Proxy] Step 1: POST /merchant/v1/orders for Customer: ${orderPayload.customer_ref}...`);

                // Create Order on Littlepay Sandbox (common to both SDK and Payment Link)
                const orderRes = await makeHttpsRequest(
                    'https://checkout.sandbox.littlepay.com/merchant/v1/orders',
                    'POST',
                    {
                        'Content-Type': 'application/json',
                        'X-Api-Key': apiKey
                    },
                    JSON.stringify(orderPayload)
                );

                if (orderRes.statusCode < 200 || orderRes.statusCode >= 300) {
                    console.error(`[Proxy] Order creation failed with status ${orderRes.statusCode}:`, orderRes.body);
                    res.writeHead(orderRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Order creation failed: ${orderRes.body}` }));
                    return;
                }

                const orderData = JSON.parse(orderRes.body);
                const paymentIntentId = orderData.payment_intent_id;
                const orderId = orderData.id;
                console.log(`[Proxy] Order created successfully! ID: ${orderId}, Intent: ${paymentIntentId}`);

                if (checkoutMethod === 'link') {
                    // Flow A: PAYMENT LINK (4 steps)
                    
                    // Step 2: PATCH payment-intent to set capture_method to AUTO
                    console.log(`[Proxy] Step 2: PATCH /payment-intents/${paymentIntentId} (Set Capture to AUTO)...`);
                    const captureRes = await makeHttpsRequest(
                        `https://checkout.sandbox.littlepay.com/merchant/v1/payment-intents/${paymentIntentId}`,
                        'PATCH',
                        {
                            'Content-Type': 'application/json',
                            'X-Api-Key': apiKey
                        },
                        JSON.stringify({ capture_method: 'AUTO' })
                    );

                    if (captureRes.statusCode < 200 || captureRes.statusCode >= 300) {
                        console.error(`[Proxy] PATCH Capture failed with status ${captureRes.statusCode}:`, captureRes.body);
                        res.writeHead(captureRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `Setting capture method to AUTO failed: ${captureRes.body}` }));
                        return;
                    }

                    // Step 3: PUT payment-intent mit_type (conditional)
                    if (mitType) {
                        console.log(`[Proxy] Step 3: PUT /payment-intents/${paymentIntentId}/payment-method-options (Add MIT Type)...`);
                        const optionsRes = await makeHttpsRequest(
                            `https://checkout.sandbox.littlepay.com/merchant/v1/payment-intents/${paymentIntentId}/payment-method-options`,
                            'PUT',
                            {
                                'Content-Type': 'application/json',
                                'X-Api-Key': apiKey
                            },
                            JSON.stringify({ mit_type: mitType })
                        );

                        if (optionsRes.statusCode < 200 || optionsRes.statusCode >= 300) {
                            console.error(`[Proxy] Setting MIT options failed with status ${optionsRes.statusCode}:`, optionsRes.body);
                            res.writeHead(optionsRes.statusCode, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: `Setting MIT options failed: ${optionsRes.body}` }));
                            return;
                        }
                    } else {
                        console.log(`[Proxy] Step 3: Skipping PUT /payment-method-options (mitType is null/empty).`);
                    }

                    // Step 4: POST /orders/{order_id}/payment-links
                    console.log(`[Proxy] Step 4: POST /orders/${orderId}/payment-links (Generate Hosted Link)...`);
                    const linkPayload = {
                        callback_url: 'https://google.com',
                        locale: locale || 'en-GB',
                        sdk_options: {
                            disableSavedCards: disableSavedCards
                        },
                        auth_type: 'CODE'
                    };

                    const linkRes = await makeHttpsRequest(
                        `https://checkout.sandbox.littlepay.com/merchant/v1/orders/${orderId}/payment-links`,
                        'POST',
                        {
                            'Content-Type': 'application/json',
                            'X-Api-Key': apiKey
                        },
                        JSON.stringify(linkPayload)
                    );

                    if (linkRes.statusCode < 200 || linkRes.statusCode >= 300) {
                        console.error(`[Proxy] Create payment link failed with status ${linkRes.statusCode}:`, linkRes.body);
                        res.writeHead(linkRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `Create payment link failed: ${linkRes.body}` }));
                        return;
                    }

                    const linkData = JSON.parse(linkRes.body);
                    let finalLinkUrl = linkData.url || linkData.payment_link || linkData.payment_link_url;
                    
                    if (finalLinkUrl) {
                        // Append sdkVersion=2 query parameter as required by documentation
                        if (finalLinkUrl.includes('?')) {
                            finalLinkUrl += '&sdkVersion=2';
                        } else {
                            finalLinkUrl += '?sdkVersion=2';
                        }
                    }
                    
                    console.log(`[Proxy] Payment link created successfully (sdkVersion=2 added)! URL: ${finalLinkUrl}`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        checkoutMethod: 'link',
                        url: finalLinkUrl,
                        id: orderId,
                        payment_intent_id: paymentIntentId,
                        linkData: linkData
                    }));

                } else {
                    // Flow B: SDK INLINE (2 steps)
                    if (mitType) {
                        console.log(`[Proxy] Step 2: PUT /payment-intents/${paymentIntentId}/payment-method-options (Add MIT Type)...`);
                        
                        const optionsRes = await makeHttpsRequest(
                            `https://checkout.sandbox.littlepay.com/merchant/v1/payment-intents/${paymentIntentId}/payment-method-options`,
                            'PUT',
                            {
                                'Content-Type': 'application/json',
                                'X-Api-Key': apiKey
                            },
                            JSON.stringify({ mit_type: mitType })
                        );

                        if (optionsRes.statusCode < 200 || optionsRes.statusCode >= 300) {
                            console.error(`[Proxy] Setting MIT options failed with status ${optionsRes.statusCode}:`, optionsRes.body);
                            res.writeHead(optionsRes.statusCode, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: `Setting MIT options failed: ${optionsRes.body}` }));
                            return;
                        }
                        console.log(`[Proxy] MIT Setup complete (204).`);
                    } else {
                        console.log(`[Proxy] Step 2: Skipping PUT /payment-method-options (mitType is null/empty).`);
                    }

                    console.log(`[Proxy] Returning client_token to client.`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        checkoutMethod: 'sdk',
                        client_token: orderData.client_token,
                        payment_intent_id: paymentIntentId,
                        id: orderId
                    }));
                }

            } catch (err) {
                console.error('[Proxy Error] Core failure:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Local proxy core failure: ${err.message}` }));
            }
        });
        return;
    }

    // Route: Moneris Receipt Verification Endpoint
    if (req.method === 'POST' && pathname === '/api/moneris-receipt') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', async () => {
            try {
                const { ticket } = JSON.parse(body);
                const storeId = process.env.MONERIS_STORE_ID;
                const apiToken = process.env.MONERIS_API_TOKEN;
                const checkoutId = process.env.MONERIS_CHECKOUT_ID;
                const envMode = process.env.MONERIS_ENV || 'qa';

                if (!checkoutId || checkoutId === 'FILLME') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'MONERIS_CHECKOUT_ID is not configured or set to FILLME. Please configure MONERIS_CHECKOUT_ID in your env.local.json file.' }));
                    return;
                }

                const mcoUrl = envMode === 'prod'
                    ? 'https://gateway.moneris.com/chktv2/request/request.php'
                    : 'https://gatewayt.moneris.com/chktv2/request/request.php';

                const receiptPayload = {
                    store_id: storeId,
                    api_token: apiToken,
                    checkout_id: checkoutId,
                    ticket: ticket,
                    environment: envMode,
                    action: 'receipt'
                };

                const receiptRes = await makeHttpsRequest(
                    mcoUrl,
                    'POST',
                    {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    JSON.stringify(receiptPayload)
                );

                console.log(`[Proxy Moneris] Receipt Verification Response (${receiptRes.statusCode}):`, receiptRes.body);
                res.writeHead(receiptRes.statusCode, { 'Content-Type': 'application/json' });
                res.end(receiptRes.body);

            } catch (err) {
                console.error('[Proxy Moneris Error] Receipt verification error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Route: Static Files Server
    let filePath = '.' + pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    filePath = filePath.split('?')[0];

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h3>404 Not Found</h3>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code} ..\n`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`------------------------------------------------------------`);
    console.log(`🚀 Littlepay Checkout MIT Demo running at http://localhost:${PORT}`);
    console.log(`🛡️  Direct Sandbox calls are proxied securely to prevent CORS blocks!`);
    console.log(`------------------------------------------------------------`);
});
