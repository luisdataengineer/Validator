/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/main.gs
 * @brief   Main entry point for the Google Apps Script Web App. 
 * Handles the HTTP GET request and serves the modular frontend HTML.
 * @author  Luis N. Espinosa
 */

/**
 * Handles the HTTP GET request when a user visits the Web App URL.
 * It builds, evaluates, and returns the main HTML interface.
 *
 * @param {Object} e - The event object (contains URL request parameters).
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The evaluated HTML page to be displayed to the user.
 */
function doGet(e) {
  // Create an HTML template from the 'frontend/index' file
  const htmlTemplate = HtmlService.createTemplateFromFile('frontend/index');
  
  // Evaluate the template to process any backend scripts embedded in the HTML,
  // set the browser tab title, and allow the app to be embedded in an iframe.
  return htmlTemplate
      .evaluate()
      .setTitle('SVG Validator - CPG')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper function to include external HTML files (like CSS or JS)
 * inside the main index.html file. This enforces a modular frontend architecture.
 *
 * @param {string} filename - The exact name (or path) of the file to include.
 * @returns {string} The raw string content of the requested file.
 */
function include(filename) {
  // Fetch the file from the Apps Script environment and return its text content
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

