/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/attributes.js
 * @brief   Whitelist-based attribute validator for official layers.
 * Acts as "Customs", rejecting any attribute (like transform) not explicitly allowed.
 * @author  Luis N. Espinosa
 */

const LayerAttributesValidator = (function() {

  /**
   * Evaluates the integrity of VIP layers. Ensures they have mandatory identification 
   * attributes and blocks unauthorized properties (like layer-level transforms).
   *
   * @param {GoogleAppsScript.XML_Service.Element} rootElement - The parsed root <svg> element.
   * @param {GoogleAppsScript.XML_Service.Namespace} svgNs - The standard SVG namespace.
   * @param {GoogleAppsScript.XML_Service.Namespace} inkscapeNs - The Inkscape namespace.
   * @param {string[]} errors - The shared array to push validation errors into.
   */
  function validate(rootElement, svgNs, inkscapeNs, errors) {
    const layers = rootElement.getChildren("g", svgNs);

    // Using ES6 for...of to iterate over the layers
    for (const layer of layers) {
      
      // Capture the full attribute objects to verify their strict existence
      const idAttr = layer.getAttribute("id");
      const labelAttr = layer.getAttribute("label", inkscapeNs);
      const groupModeAttr = layer.getAttribute("groupmode", inkscapeNs);

      const layerId = idAttr ? idAttr.getValue().trim() : "";
      const layerLabel = labelAttr ? labelAttr.getValue().trim() : "";
      
      // Attempt to identify the layer by ID or Label (fallback to "unnamed")
      const layerName = layerId || layerLabel || "unnamed";

      // 1. VIP Layer Check: Ignore custom/unofficial layers not in the SSOT
      if (SVG_CONSTANTS.FULL_EXPECTED_ORDER.indexOf(layerName) === -1) {
        continue; 
      }

      // 2. MANDATORY DOCUMENTS (The "Holy Trinity" of layers)
      if (!idAttr || !labelAttr || !groupModeAttr || groupModeAttr.getValue() !== "layer") {
        errors.push(VALIDATION_ANSWERS.MISSING_LAYER_ATTRIBUTE());
      }

      // 3. THE CUSTOMS CHECK (Whitelist): Scan and reject unauthorized attributes
      const allAttributes = layer.getAttributes();
      
      for (const attr of allAttributes) {
        const attrName = attr.getName(); 

        // If the attribute is not in the ALLOWED_LAYER_ATTRIBUTES SSOT, reject the map
        if (SVG_CONSTANTS.ALLOWED_LAYER_ATTRIBUTES.indexOf(attrName) === -1) {
           if (attrName.toLowerCase() === "transform") {
               errors.push(VALIDATION_ANSWERS.LAYER_TRANSFORM(layerName));
           } else {
               errors.push(VALIDATION_ANSWERS.RESTRICTED_PROPERTY(attrName, layerName));
           }
        }
      }
    }
  }

  return { validate: validate };
})();