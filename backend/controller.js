/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/controller.gs
 * @brief   Controller layer for the Web App. Receives requests from the
 * frontend, extracts SVGs from archives, and routes them to validators.
 * @author  Luis N. Espinosa
 */

/**
 * Receives the file payload from the frontend. Delegates extraction if
 * necessary, and passes the raw SVG string to the ValidatorService.
 *
 * @param {Object} payload - Object containing the file payload.
 * @param {string} payload.fileName - The name of the uploaded file.
 * @param {string} payload.fileData - The base64 encoded string or raw text of the file.
 * @returns {Object} A response object containing 'success' (boolean), 'message' (string), and optionally 'errors' (Array).
 */
function processUploadedFile(payload) {
  try {
    const fileName = payload.fileName.toLowerCase();
    const fileData = payload.fileData;
    let svgString = "";

    // 1. Basic safety check
    if (!fileData || fileData === "") {
      return { success: false, message: "The uploaded file is empty or corrupted." };
    }

    // 2. Extract SVG based on file type routing
    if (fileName.endsWith('.zip')) {
      svgString = extractSvgFromZip(fileData);
    }
    else if (fileName.endsWith('.tgz') || fileName.endsWith('.tar.gz')) {
      svgString = extractSvgFromTgz(fileData);
    }
    else {
      // Decode Base64 to raw SVG text
      const decodedBytes = Utilities.base64Decode(fileData);
      svgString = Utilities.newBlob(decodedBytes).getDataAsString();
    }

    // Guard against empty extractions
    if (!svgString) {
      return { success: false, message: "No .svg file was found inside the archive: " + fileName };
    }

    // 3. Connect to the Orchestrator (Validator Service)
    const validationResult = ValidatorService.validate(svgString);

    // 4. Standardize the API response payload
    if (validationResult.isValid) {
      let successMessage = "Success! The file '" + fileName + "' meets CPG standards.";
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        successMessage += " (with " + validationResult.warnings.length + " warnings)";
      }
      return {
        success: true,
        message: successMessage,
        errors: validationResult.errors || [],
        warnings: validationResult.warnings || []
      };
    } else {
      let failMessage = "Validation failed with " + validationResult.errors.length + " errors.";
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        failMessage += " and " + validationResult.warnings.length + " warnings.";
      }
      return {
        success: false,
        message: failMessage,
        errors: validationResult.errors,
        warnings: validationResult.warnings || []
      };
    }

  } catch (error) {
    // Global error boundary for the controller
    return { success: false, message: "Server error during processing: " + error.message };
  }
}

/**
 * Entry point for frontend `processLocalFile(args)` execution wrapper.
 * Converts the frontend args to the expected payload and returns the result object.
 * 
 * @param {Object} args - Payload from frontend containing bytes, filename, and credentials.
 * @returns {Object} JSON object containing success, message, and array of errors.
 */
function processLocalFile(args) {
  const payload = {
    fileName: args.filename,
    fileData: args.bytes
  };

  return processUploadedFile(payload);
}

/**
 * Descarga y valida un paquete de plan directamente desde Command Center.
 * @param {Object} args - Payload containing planId (or version), platform, and credentials.
 * @returns {Object} Respuesta estándar de validación hacia el frontend.
 */
function fetchFromCommand(args) {
  try {
    const planId = args.version;
    const platform = args.platform ? args.platform.toLowerCase() : "command";
    const credentials = args.credentials;

    if (!planId) {
      return { success: false, message: "No Plan ID provided." };
    }

    if (!credentials) {
      throw new Error("Missing Session Credentials. Please configure them in Settings.");
    }

    // Switch the exact TOTP based on platform:
    // command (command.avidbots.com) uses commandTOTP; acc (acc.avidbots.com) uses accTOTP
    credentials.ccTOTP = platform === "acc" ? credentials.accTOTP : credentials.commandTOTP;

    // 1. Iniciar sesión y obtener el cliente usando credentials de la sesion
    const client = new CommandCenterClient(platform, credentials);
    client.login();

    // 2. Descargar el archivo binario del paquete asociado al plan
    const fileBlob = client.download(`CleaningPlans/${planId}/package`);
    const rawFileName = fileBlob.getName() || `package_${planId}.zip`;

    // 3. Convertir el contenido del archivo a Base64
    const base64Data = Utilities.base64Encode(fileBlob.getBytes());

    // 4. Crear el payload simulando un archivo local
    const payload = {
      fileName: rawFileName,
      fileData: base64Data
    };

    // 5. Reutilizar la función principal de procesamiento y validación
    return processUploadedFile(payload);

  } catch (error) {
    if (error.message.includes("404")) {
      return { success: false, message: "We couldn't find a matching plan with that ID on the selected platform." };
    }
    return { success: false, message: "Error parsing from Command Center: " + error.message };
  }
}

/**
 * Helper to get credentials from UserProperties for background tasks.
 */
function getStoredCredentials() {
  const props = PropertiesService.getUserProperties();
  const creds = props.getProperty('validator_creds');
  return creds ? JSON.parse(creds) : null;
}

/**
 * Verifies credentials and checks if the user is in the authorized whitelist.
 * @param {Object} creds - The credentials to test
 * @returns {Object} Success object if valid and authorized.
 */
function verifyCredentials(creds) {
  try {
    // 1. Whitelist Check
    const allowed = SVG_CONSTANTS.AUTHORIZED_DEVS.includes(creds.ccEmail) || 
                    SVG_CONSTANTS.AUTHORIZED_DEVS.includes(creds.jiraEmail);
    if (!allowed) {
      return { success: false, message: "Security Error: User email not in the Authorized Developers whitelist." };
    }

    // 2. Jira Verification
    const authPayload = Utilities.base64Encode(`${creds.jiraEmail}:${creds.jiraToken}`);
    const authHeader = `Basic ${authPayload}`;
    const jiraRes = UrlFetchApp.fetch("https://avidbots.atlassian.net/rest/api/3/myself", {
      method: "get",
      headers: { "Authorization": authHeader, "Accept": "application/json" },
      muteHttpExceptions: true
    });
    if (jiraRes.getResponseCode() >= 400) {
      return { success: false, message: "Jira Verification Failed: " + jiraRes.getContentText() };
    }

    // 3. Command Center Verification (Platform 'command' as primary test)
    // We construct a mock credentials object with the commandTOTP explicitly for test
    const testCreds = {
      ccEmail: creds.ccEmail,
      ccPassword: creds.ccPassword,
      ccTOTP: creds.commandTOTP || creds.accTOTP
    };
    const platformToTest = creds.commandTOTP ? "command" : "acc";
    const client = new CommandCenterClient(platformToTest, testCreds);
    client.login(); // will throw if invalid

    return { success: true, message: "Credentials and Authorizations verified successfully." };
  } catch (error) {
    return { success: false, message: "Command Center Verification Failed: " + error.message };
  }
}

/**
 * Saves credentials from the frontend to UserProperties for use in background triggers.
 * @param {Object} creds - Object with Jira and CC credentials.
 * @returns {Object} Success message.
 */
function saveCredentials(creds) {
  try {
    PropertiesService.getUserProperties().setProperty('validator_creds', JSON.stringify(creds));
    return { success: true, message: "Credentials persisted to server successfully." };
  } catch (e) {
    return { success: false, message: "Failed to save credentials: " + e.message };
  }
}

/**
 * Consulta un Google Sheet (del proyecto GPC Metrics) para obtener
 * la Versión y la Plataforma basado en un número de Ticket (ej: CPG-78283).
 *
 * @param {Object} args - Payload que contiene la llave de Jira (key).
 * @returns {Object} JSON object con version y plataforma encontradas.
 */
function fetchByTicket(args) {
  try {
    const key = args.key;
    const credentials = args.credentials || getStoredCredentials();

    if (!key) {
      return { success: false, message: "No Ticket Key provided." };
    }

    if (!credentials) {
      return { success: false, message: "Server-side credentials not found. Please save them in Settings." };
    }

    // ID de "GPC Metrics" / CPG Validator
    const SPREADSHEET_ID = "1srU1W3FthUWeewkgn5BLOml8Ry783yloure-v36HosE";
    const SHEET_NAME = "DB_Validator";

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error(`La pestaña '${SHEET_NAME}' no existe dentro del documento.`);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Obtenemos los índices
    const indices = {
      key: headers.indexOf("Key"),
      version: headers.indexOf("Version"),
      platform: headers.indexOf("Plataform"),
      status: headers.indexOf("Status"),
      answer: headers.indexOf("Answer")
    };

    if (indices.key === -1 || indices.version === -1 || indices.platform === -1 || indices.status === -1 || indices.answer === -1) {
      throw new Error("No se encontraron todas las columnas clave: 'Key', 'Version', 'Plataform', 'Status', 'Answer'.");
    }

    let rowFound = -1;
    let targetVersion = null;
    let targetPlatform = null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][indices.key] === key) {
        targetVersion = data[i][indices.version];
        targetPlatform = data[i][indices.platform].toString().trim().toLowerCase();
        rowFound = i + 1;
        break;
      }
    }

    if (!targetVersion || !targetPlatform) {
      return { success: false, message: `El ticket '${key}' no fue encontrado en el spreadsheet o le faltan datos.` };
    }

    return processSingleTicket(key, targetVersion, targetPlatform, rowFound, sheet, indices, credentials);

  } catch (error) {
    return { success: false, message: "Error al consultar Sheets: " + error.message };
  }
}

/**
 * Realiza la validación y notificación para una fila específica.
 * @internal
 */
function processSingleTicket(key, version, platform, row, sheet, indices, credentials) {
  try {
    const nextArgs = {
      version: version.toString(),
      platform: platform,
      credentials: credentials
    };

    const result = fetchFromCommand(nextArgs);

    // Autocompletar en Base de Datos de Google Sheets  
    const finalStatus = "QA_VTR_REVIEWED";
    let finalAnswer = "Passes";
    if (result.errors && result.errors.length > 0) {
      finalAnswer = "Fails";
    } else if (result.warnings && result.warnings.length > 0) {
      finalAnswer = "Warning";
    }

    sheet.getRange(row, indices.status + 1).setValue(finalStatus);
    sheet.getRange(row, indices.answer + 1).setValue(finalAnswer);

    // Conexión a Jira Feedback Automatizado
    const jira = new JiraClient(credentials);
    if (!result.success) {
      try {
        // Merge errors and warnings so both are posted and distinguished in Jira
        const allFindings = [
          ...(result.errors || []).map(e => ({ ...e, type: "error" })),
          ...(result.warnings || []).map(w => ({ ...w, type: "warning" }))
        ];
        
        if (allFindings.length > 0) {
          jira.postValidationError(key, version, platform, allFindings);
          result.message += " | [Jira Error Posted]";
        }
      } catch (jiraError) {
        result.message += ` | [Jira Error Failed: ${jiraError.message}]`;
      }
    } else if (result.success) {
      try {
        jira.postValidationSuccess(key, version, platform, result.warnings || []);
        result.message += " | [Jira Success Posted]";
      } catch (jiraError) {
        result.message += ` | [Jira Success Failed: ${jiraError.message}]`;
      }
    }

    result.message = `Ticket [${key}] -> ` + result.message;
    return result;

  } catch (err) {
    return { success: false, message: `Error processing ${key}: ${err.message}` };
  }
}

/**
 * Función principal del Trigger Automático.
 * Recorre la base de datos de mayor a menor (descendente) y procesa tickets pendientes.
 */
function runAutomatedValidator() {
  const credentials = getStoredCredentials();
  if (!credentials) {
    Logger.log("Aborting: No credentials found in UserProperties.");
    return;
  }

  const SPREADSHEET_ID = "1srU1W3FthUWeewkgn5BLOml8Ry783yloure-v36HosE";
  const SHEET_NAME = "DB_Validator";
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const indices = {
    key: headers.indexOf("Key"),
    version: headers.indexOf("Version"),
    platform: headers.indexOf("Plataform"),
    status: headers.indexOf("Status"),
    answer: headers.indexOf("Answer")
  };

  // Recorrer de mayor a menor (fila más nueva a más vieja)
  for (let i = data.length - 1; i >= 1; i--) {
    const rowData = data[i];
    const key = rowData[indices.key];
    const status = rowData[indices.status];
    const version = rowData[indices.version];
    const platform = rowData[indices.platform];

    // Solo procesar si el status NO es revisado y tiene datos mínimos
    if (status !== "QA_VTR_REVIEWED" && key && version && platform) {
      Logger.log(`Automating processing for Ticket: ${key}`);
      const result = processSingleTicket(key, version, platform.toString().trim().toLowerCase(), i + 1, sheet, indices, credentials);
      Logger.log(`Result for ${key}: ${result.message}`);
      break; // Procesar solo uno por ejecución
    }
  }
}

/**
 * Crea o elimina el Trigger Automático segun el toggle del frontend.
 */
function toggleAutoAudit(payload) {
  const state = payload.state;
  const FUNCTION_NAME = 'runAutomatedValidator';

  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === FUNCTION_NAME) {
      ScriptApp.deleteTrigger(t);
    }
  });

  if (state) {
    // Crear trigger cada 15 minutos (ajustable)
    ScriptApp.newTrigger(FUNCTION_NAME)
      .timeBased()
      .everyMinutes(10)
      .create();
    return { success: true, message: "Auto-Audit Enabled (10 min cycle)." };
  } else {
    return { success: true, message: "Auto-Audit Disabled." };
  }
}

/**
 * Run this function manually from the Apps Script IDE once to trigger the 
 * Google OAuth permissions screen for SpreadsheetApp.
 */
function authSetup() {
  SpreadsheetApp.openById("1srU1W3FthUWeewkgn5BLOml8Ry783yloure-v36HosE");
}