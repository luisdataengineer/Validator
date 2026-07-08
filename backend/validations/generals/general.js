/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 * 
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/generals/general.js
 * @brief   Orchestrator for all general validation modules.
 * @author  Luis N. Espinosa
 */

const GeneralValidator = (function() {

  /**
   * Runs all general validations on the root element of the SVG.
   * Acts as a sub-orchestrator, delegating tasks to specific worker modules.
   *
   * @param {GoogleAppsScript.XML_Service.Element} rootElement - The parsed root <svg> element.
   * @returns {string[]} An array of error messages found during general validation.
   */
  function validate(rootElement) {
    const errors = [];
    
    // Initialize required XML namespaces once to pass down to workers (performance optimization)
    const inkscapeNs = XmlService.getNamespace("inkscape", SVG_CONSTANTS.NAMESPACES.INKSCAPE);
    const svgNs = XmlService.getNamespace("", SVG_CONSTANTS.NAMESPACES.SVG); 
    
    // Delegate validation to specialized worker modules.
    // The 'errors' array is passed by reference, allowing workers to push (mutate) directly to it.
    MetadataValidator.validate(rootElement, inkscapeNs, errors);
    DimensionsValidator.validate(rootElement, svgNs, inkscapeNs, errors);
    StructureValidator.validate(rootElement, svgNs, inkscapeNs, errors);
    ObjectsValidator.validate(rootElement, errors);
    BoundsValidator.validate(rootElement, svgNs, errors);

    return errors;
  }

  // Expose only the main validation method to the global scope
  return {
    validate: validate
  };

})();