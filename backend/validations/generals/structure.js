/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/generals/structure.js
 * @brief   Validates layer IDs, mandatory existence, duplicates, and strict top-to-bottom order.
 * @author  Luis N. Espinosa
 */

const StructureValidator = (function() {

  /**
   * Enforces layer taxonomy, ensuring correct naming conventions, mandatory layer inclusion, 
   * absence of junk layers, and strict Z-index visual ordering.
   *
   * @param {GoogleAppsScript.XML_Service.Element} rootElement - The parsed root <svg> element.
   * @param {GoogleAppsScript.XML_Service.Namespace} svgNs - The standard SVG namespace.
   * @param {GoogleAppsScript.XML_Service.Namespace} inkscapeNs - The Inkscape namespace.
   * @param {string[]} errors - The shared array to push validation errors into.
   */
  function validate(rootElement, svgNs, inkscapeNs, errors) {
    const rootGroups = rootElement.getChildren("g", svgNs);
    const foundLayers = [];

    // 1. Check ID vs Label Synchronization
    for (let k = 0; k < rootGroups.length; k++) {
      const group = rootGroups[k];
      const labelAttr = group.getAttribute("label", inkscapeNs);
      const idAttr = group.getAttribute("id");

      const labelText = labelAttr ? labelAttr.getValue().trim() : "";
      const idText = idAttr ? idAttr.getValue().trim() : "";

      if (!labelText || !idText || labelText !== idText) {
        errors.push(VALIDATION_ANSWERS.LAYER_FORMAT_ERROR(idText, labelText));
      }
      
      if (labelText || idText) {
        foundLayers.push(labelText || idText);
      }
    }

    // 2. Missing Mandatory Layers Validation
    for (const requiredLayer of SVG_CONSTANTS.MANDATORY_LAYERS) {
      if (foundLayers.indexOf(requiredLayer) === -1) {
        errors.push(VALIDATION_ANSWERS.MISSING_LAYER(requiredLayer));
      }
    }

    // 3. Order, Duplicates and Trash (Unknown Layers) Validation
    const seenLayers = {};
    const validKnownLayers = []; 
    let hasFormatErrors = false; 
    
    // Reverse the array because XML parses bottom-to-top, but we validate visual top-to-bottom
    const inkscapeVisualOrder = foundLayers.slice().reverse();

    for (let n = 0; n < inkscapeVisualOrder.length; n++) {
      const currentLayer = inkscapeVisualOrder[n];

      // Check for duplicates
      if (seenLayers[currentLayer]) {
        errors.push(VALIDATION_ANSWERS.DUPLICATE_LAYER(currentLayer));
        hasFormatErrors = true;
        continue; 
      }
      seenLayers[currentLayer] = true;

      // Check for garbage/unrecognized layers
      const expectedIndex = SVG_CONSTANTS.FULL_EXPECTED_ORDER.indexOf(currentLayer);
      if (expectedIndex === -1) {
        errors.push(VALIDATION_ANSWERS.UNKNOWN_LAYER(currentLayer));
        hasFormatErrors = true;
        continue; 
      }
      
      validKnownLayers.push(currentLayer);
    }

    // 4. Strict Z-Index Ordering
    // Only process ordering if there are no duplicates or garbage layers disrupting the list
    if (!hasFormatErrors) {
      const perfectlySortedLayers = validKnownLayers.slice().sort(function(a, b) {
        return SVG_CONSTANTS.FULL_EXPECTED_ORDER.indexOf(a) - SVG_CONSTANTS.FULL_EXPECTED_ORDER.indexOf(b);
      });

      for (let i = 0; i < validKnownLayers.length; i++) {
        if (validKnownLayers[i] !== perfectlySortedLayers[i]) {
          errors.push(VALIDATION_ANSWERS.LAYER_ORDER_ERROR(validKnownLayers[i], perfectlySortedLayers[i]));
          break; // Stop at the first order error to avoid spamming the UI
        }
      }
    }
  }

  return { validate: validate };
})();