/**
 * Clase que maneja la comunicación y peticiones hacia la API cloud de Jira Atlassian
 */
class JiraClient {
    /**
     * @param {Object} credentials - Objeto con las llaves extraidas de la sesion del frontend
     * @param {string} credentials.jiraEmail - Correo del usuario de atlassian
     * @param {string} credentials.jiraToken - API token generado desde atlassian account security
     */
    constructor(credentials) {
        if (!credentials || !credentials.jiraEmail || !credentials.jiraToken) {
            throw new Error('Jira Email and API Token are required to initialize JiraClient. Ensure they are configured in Settings.');
        }

        this.baseUrl = "https://avidbots.atlassian.net/rest/api/3";
        this.email = credentials.jiraEmail ? credentials.jiraEmail.trim() : "";
        this.token = credentials.jiraToken ? credentials.jiraToken.trim() : "";

        // Crear el string de Auth basico usando Apps Script encode format nativo
        const authPayload = Utilities.base64Encode(`${this.email}:${this.token}`);
        this.authHeader = `Basic ${authPayload}`;
    }

    /**
     * Publica un Error Log con formato Atlassian Document Format (ADF V3) con Puntos y Negritas
     * @param {string} issueKey - Ticket de Jira, ej: "CPG-78283"
     * @param {string|number} version - Versión del mapa extraida
     * @param {string} platform - Plataforma extraida (acc/wcc/command)
     * @param {Array} findings - Array de strings u objetos con los hallazgos validados (errores y warnings)
     * @returns {Object} Respuesta directa parseada de Jira
     */
    postValidationError(issueKey, version, platform, findings) {
        // Check for duplicate comment for the same version
        const urlGet = `${this.baseUrl}/issue/${issueKey.trim()}/comment`;
        const getOptions = {
            method: "get",
            headers: {
                "Authorization": this.authHeader,
                "Accept": "application/json"
            },
            muteHttpExceptions: true
        };
        const getRes = UrlFetchApp.fetch(urlGet, getOptions);
        if (getRes.getResponseCode() === 200) {
            const data = JSON.parse(getRes.getContentText());
            const comments = data.comments || [];
            const searchStr = `Version ${version}`;
            for (let i = 0; i < comments.length; i++) {
                const bodyStr = JSON.stringify(comments[i].body);
                if (bodyStr.includes(searchStr) && bodyStr.includes("failed with the following findings")) {
                    return { skipped: true, message: "Duplicate error log skipped for same version" };
                }
            }
        }

        const url = `${this.baseUrl}/issue/${issueKey.trim()}/comment`;

        const contentBlocks = [
            {
                type: "paragraph",
                content: [
                    { type: "text", text: "Avidbots SVG Validator Feedback", marks: [{ type: "strong" }] }
                ]
            },
            {
                type: "paragraph",
                content: [
                    { type: "text", text: `The map validation process for Version ${version} on ${platform.toUpperCase()} failed with the following findings:` }
                ]
            },
            {
                type: "bulletList",
                content: findings.map(finding => {
                    const type = (typeof finding === 'object' && finding !== null && finding.type) ? finding.type.toUpperCase() : "ERROR";
                    const isWarning = type === "WARNING";
                    const color = isWarning ? "#ff9900" : "#de350b";
                    const prefix = `[${type}] `;

                    const textStr = (typeof finding === 'string') ? finding : (finding.message || String(finding));
                    const lines = textStr.split('\n');
                    const paragraphContent = [];

                    // Prepend the bold, colored prefix to the first line
                    paragraphContent.push({
                        type: "text",
                        text: prefix,
                        marks: [
                            { type: "strong" },
                            { type: "textColor", attrs: { color: color } }
                        ]
                    });

                    lines.forEach((line, index) => {
                        paragraphContent.push({ type: "text", text: line });
                        if (index < lines.length - 1) {
                            paragraphContent.push({ type: "hardBreak" });
                        }
                    });

                    return {
                        type: "listItem",
                        content: [
                            { type: "paragraph", content: paragraphContent }
                        ]
                    };
                })
            },
            {
                type: "paragraph",
                content: [
                    { type: "text", text: "Please fix these issues and run validation again.", marks: [{ type: "em" }] }
                ]
            }
        ];

        const payload = JSON.stringify({
            body: {
                version: 1,
                type: "doc",
                content: contentBlocks
            }
        });

        const options = {
            method: "post",
            contentType: "application/json",
            headers: {
                "Authorization": this.authHeader,
                "Accept": "application/json"
            },
            payload: payload,
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(url, options);
        const statusCode = response.getResponseCode();
        const responseBody = response.getContentText();

        if (statusCode >= 400) {
            throw new Error(`Jira returned error code ${statusCode}: ${responseBody}`);
        }

        return JSON.parse(responseBody);
    }

    /**
     * Publica un Success Log con formato Atlassian Document Format (ADF V3) indicando mapa valido
     * @param {string} issueKey - Ticket de Jira, ej: "CPG-78283"
     * @param {string|number} version - Versión del mapa extraida
     * @param {string} platform - Plataforma extraida (acc/wcc/command)
     * @param {Array} warnings - Array de strings u objetos con los warnings validados
     * @returns {Object} Respuesta directa parseada de Jira
     */
    postValidationSuccess(issueKey, version, platform, warnings = []) {
        // Check for duplicate comment for the same version
        const urlGet = `${this.baseUrl}/issue/${issueKey.trim()}/comment`;
        const getOptions = {
            method: "get",
            headers: {
                "Authorization": this.authHeader,
                "Accept": "application/json"
            },
            muteHttpExceptions: true
        };
        const getRes = UrlFetchApp.fetch(urlGet, getOptions);
        if (getRes.getResponseCode() === 200) {
            const data = JSON.parse(getRes.getContentText());
            const comments = data.comments || [];
            const searchStr = `Version ${version}`;
            for (let i = 0; i < comments.length; i++) {
                const bodyStr = JSON.stringify(comments[i].body);
                if (bodyStr.includes(searchStr) && bodyStr.includes("completed successfully with no errors found")) {
                    return { skipped: true, message: "Duplicate success log skipped for same version" };
                }
            }
        }

        const url = `${this.baseUrl}/issue/${issueKey.trim()}/comment`;

        const contentBlocks = [
            {
                type: "paragraph",
                content: [
                    { type: "text", text: "Avidbots SVG Validator Feedback", marks: [{ type: "strong" }] }
                ]
            },
            {
                type: "paragraph",
                content: [
                    { type: "text", text: `The SVG validation process for Version ${version} on ${platform.toUpperCase()} completed successfully with no errors found.` }
                ]
            }
        ];

        if (warnings && warnings.length > 0) {
            contentBlocks.push({
                type: "paragraph",
                content: [
                    { type: "text", text: "However, the following warnings were found:", marks: [{ type: "em" }] }
                ]
            });
            contentBlocks.push({
                type: "bulletList",
                content: warnings.map(warn => {
                    const textStr = (typeof warn === 'string') ? warn : (warn.message || String(warn));
                    const lines = textStr.split('\n');
                    const paragraphContent = [];

                    // Prepend [WARNING] prefix
                    paragraphContent.push({
                        type: "text",
                        text: "[WARNING] ",
                        marks: [
                            { type: "strong" },
                            { type: "textColor", attrs: { color: "#ff9900" } }
                        ]
                    });

                    lines.forEach((line, index) => {
                        paragraphContent.push({ type: "text", text: line });
                        if (index < lines.length - 1) {
                            paragraphContent.push({ type: "hardBreak" });
                        }
                    });

                    return {
                        type: "listItem",
                        content: [
                            { type: "paragraph", content: paragraphContent }
                        ]
                    };
                })
            });
        }

        const payload = JSON.stringify({
            body: {
                version: 1,
                type: "doc",
                content: contentBlocks
            }
        });

        const options = {
            method: "post",
            contentType: "application/json",
            headers: {
                "Authorization": this.authHeader,
                "Accept": "application/json"
            },
            payload: payload,
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(url, options);
        const statusCode = response.getResponseCode();
        const responseBody = response.getContentText();

        if (statusCode >= 400) {
            throw new Error(`Jira returned error code ${statusCode}: ${responseBody}`);
        }

        return JSON.parse(responseBody);
    }
}
