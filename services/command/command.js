/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
* Copyright 2026, Avidbots Corp.
 * @name    api/commandCenterClient.gs
 * @brief   Manages an authenticated API session with the Avidbots Command Center.
 * Handles login with TOTP and performs authenticated requests (GET, POST, DOWNLOAD).
 * @author  Luis N. Espinosa
 */
/**
 * Manages an authenticated API session with the Avidbots Command Center.
 * Handles login with TOTP and performs authenticated requests.
 */
class CommandCenterClient {
    /**
     * Creates an instance of the client.
     * @param {string} site - The site to connect to (e.g., "command", "walmart").
     * @param {object} [credentials] - Optional. An object with { user, password, totpSecret }. 
     * If not provided, it will try to get them from UserProperties.
     */
    constructor(site, credentials) {

        if (!site) {
            throw new Error(`Platform site target is required`);
        }

        this.baseUrl = `https://${site}.avidbots.com/api/v0/`;
        this.sessionCookie = null;

        // Use provided credentials explicitly per-session
        if (!credentials) {
            throw new Error('Credentials not found. Please configure them in the Session Settings first.');
        }

        this.user = credentials.ccEmail;
        this.password = credentials.ccPassword;
        this.totpSecret = credentials.ccTOTP;

        if (!this.user || !this.password || !this.totpSecret) {
            throw new Error('Incomplete credentials. Please supply Email, Password, and TOTP Secret in Session Settings.');
        }
    }

    /**
     * Logs into the API to obtain a valid session cookie.
     * This method MUST be called before making any other requests.
     */
    login() {
        // Step 1: Get initial CSRF cookie.
        const initialResponse = UrlFetchApp.fetch(this.baseUrl + "Logins/login", { muteHttpExceptions: true });
        const cookieHeader = initialResponse.getAllHeaders()["Set-Cookie"];
        const initialCookies = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader;

        if (!initialCookies) {
            throw new Error("Could not retrieve an initial session cookie from the server.");
        }

        // Step 2: Generate TOTP and send the login request.
        const tfaCode = new TotpGenerator(this.totpSecret).getCode();
        const loginPayload = {
            login: this.user,
            password: this.password,
            tfa_code: tfaCode,
        };

        const options = {
            method: "post",
            contentType: "application/json",
            headers: {
                Cookie: initialCookies,
                login: "abcd",
            },
            payload: JSON.stringify(loginPayload),
            muteHttpExceptions: true,
        };

        const url = this.baseUrl + "Logins/login";
        const response = UrlFetchApp.fetch(url, options);

        if (response.getResponseCode() === 200) {
            const data = JSON.parse(response.getContentText());
            this.sessionCookie = `${data.cookie}=${data.id}`;
            Logger.log("Login successful. Session established.");
            return true;
        } else {
            const errorInfo = response.getContentText();
            Logger.log(`Login failed. Code: ${response.getResponseCode()} - ${errorInfo}`);
            throw new Error("Login failed. Please check your credentials and TOTP secret.");
        }
    }

    /**
     * Performs an authenticated GET request to an API endpoint.
     * @param {string} endpoint - The endpoint to call (e.g., "Robots/1310").
     * @returns {object} The JSON response from the API.
     */
    get(endpoint) {
        if (!this.sessionCookie) {
            throw new Error("Not logged in. Call the .login() method first.");
        }

        const url = this.baseUrl + endpoint;
        const options = {
            method: "get",
            headers: {
                Cookie: this.sessionCookie,
            },
            muteHttpExceptions: true,
        };

        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();

        if (responseCode === 200) {
            return JSON.parse(responseBody);
        } else {
            throw new Error(`GET request to '${endpoint}' failed. Code: ${responseCode} - ${responseBody}`);
        }
    }

    /**
     * Realiza una petición GET autenticada para descargar un archivo.
     * @param {string} endpoint - El endpoint a llamar.
     * @returns {GoogleAppsScript.Base.Blob} El archivo descargado como un Blob de Google Apps Script.
     */
    download(endpoint) {
        if (!this.sessionCookie) {
            throw new Error("Not logged in. Call the .login() method first.");
        }

        const url = this.baseUrl + endpoint + "?target=dev";
        const options = {
            method: "get",
            headers: {
                Cookie: this.sessionCookie,
            },
            muteHttpExceptions: true,
        };

        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();

        if (responseCode === 200) {
            const blob = response.getBlob();

            // Intentar extraer el nombre del archivo de los headers
            const headers = response.getAllHeaders();
            const disposition = headers['Content-Disposition'] || headers['content-disposition'];
            if (disposition && disposition.includes('filename=')) {
                const matches = disposition.match(/filename="?([^"]+)"?/);
                if (matches && matches[1]) {
                    blob.setName(matches[1]);
                }
            }

            return blob;
        } else {
            throw new Error(`Download request to '${endpoint}' failed. Code: ${responseCode} - ${response.getContentText()}`);
        }
    }

    /**
     * Performs an authenticated POST request to an API endpoint.
     * @param {string} endpoint - The endpoint to call (e.g., "issue/").
     * @param {object} payload - The JSON payload to send.
     * @returns {object} The JSON response from the API.
     */
    post(endpoint, payload) {
        if (!this.sessionCookie) {
            throw new Error("Not logged in. Call the .login() method first.");
        }

        const url = this.baseUrl + endpoint;
        const options = {
            method: "post",
            contentType: "application/json",
            headers: {
                Cookie: this.sessionCookie,
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true,
        };

        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();

        // Check for success codes (200 OK, 201 Created, etc.)
        if (responseCode >= 200 && responseCode < 300) {
            return JSON.parse(responseBody);
        } else {
            throw new Error(`POST request to '${endpoint}' failed. Code: ${responseCode} - ${responseBody}`);
        }
    }
}