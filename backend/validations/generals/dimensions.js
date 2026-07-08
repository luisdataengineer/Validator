/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/generals/dimensions.js
 * @brief   Validates canvas size against the original map image and checks Max Size limits.
 * @author  Luis N. Espinosa
 */

const DimensionsValidator = (function() {

  /**
   * Cleans and parses a dimension string into a float.
   * @param {string} val - The raw dimension string (e.g., "2048px", "100.5").
   * @returns {number} The parsed numeric value, or 0 if invalid.
   */
  function parseDimension(val) {
    if (!val) return 0;
    const cleanVal = val.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleanVal);
    return isNaN(parsed) ? 0 : parsed; 
  }

  /**
   * Validates the canvas dimensions, image scale match, and hardware memory limits.
   * @param {GoogleAppsScript.XML_Service.Element} rootElement - The parsed root <svg> element.
   * @param {GoogleAppsScript.XML_Service.Namespace} svgNs - The standard SVG namespace.
   * @param {GoogleAppsScript.XML_Service.Namespace} inkscapeNs - The Inkscape namespace.
   * @param {string[]} errors - The shared array to push validation errors into.
   */
  function validate(rootElement, svgNs, inkscapeNs, errors) {
    const canvasWidthAttr = rootElement.getAttribute("width");
    const canvasHeightAttr = rootElement.getAttribute("height");
    const canvasWidth = canvasWidthAttr ? parseDimension(canvasWidthAttr.getValue()) : 0;
    const canvasHeight = canvasHeightAttr ? parseDimension(canvasHeightAttr.getValue()) : 0;

    let mapLayer = null;
    const children = rootElement.getChildren("g", svgNs);
    
    // Locate the official "original map" layer
    for (let j = 0; j < children.length; j++) {
      const group = children[j];
      const id = group.getAttribute("id") ? group.getAttribute("id").getValue() : "";
      const label = group.getAttribute("label", inkscapeNs) ? group.getAttribute("label", inkscapeNs).getValue() : "";
      
      if (id === "original map" || label === "original map") {
        mapLayer = group;
        break;
      }
    }

    if (!mapLayer) {
      errors.push(VALIDATION_ANSWERS.ORIGINAL_MAP_NOT_FOUND());
      return;
    }

    const images = mapLayer.getChildren("image", svgNs);
    if (images.length === 0) {
      errors.push(VALIDATION_ANSWERS.ORIGINAL_MAP_NO_IMAGE());
      return;
    }

    const mapImage = images[0];
    const imgWidth = mapImage.getAttribute("width") ? parseDimension(mapImage.getAttribute("width").getValue()) : 0;
    const imgHeight = mapImage.getAttribute("height") ? parseDimension(mapImage.getAttribute("height").getValue()) : 0;
    
    // Validate hardware limit (Megapixels)
    const originalMapSize = imgWidth * imgHeight;
    if (originalMapSize > SVG_CONSTANTS.MAP_MAX_SIZE) {
      errors.push(VALIDATION_ANSWERS.MAP_SIZE_EXCEEDED(originalMapSize, SVG_CONSTANTS.MAP_MAX_SIZE));
    }

    if (imgWidth === 0 || imgHeight === 0) {
      errors.push(VALIDATION_ANSWERS.INVALID_MAP_DIMENSIONS());
    } else {
      // Calculate the absolute difference between canvas and image dimensions
      const diffWidth = Math.abs(canvasWidth - imgWidth);
      const diffHeight = Math.abs(canvasHeight - imgHeight);
      const tolerance = 2; // Maximum pixel tolerance for export artifacts

      // Evaluate 1:1 scale ratio with tolerance margin
      if (diffWidth > tolerance || diffHeight > tolerance) {
        errors.push(VALIDATION_ANSWERS.CANVAS_DIMENSIONS_ERROR());
      }
    }
  }

  return { validate: validate };
})();