/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/generals/objects.js
 * @brief   Ensures no drawing objects exist outside of standard layer tags.
 * @author  Luis N. Espinosa
 */

const ObjectsValidator = (function() {

  /**
   * Scans the root of the SVG to detect and reject any orphaned drawing objects 
   * (like <rect> or <path>) that were accidentally drawn outside of a layer group <g>.
   *
   * @param {GoogleAppsScript.XML_Service.Element} rootElement - The parsed root <svg> element.
   * @param {string[]} errors - The shared array to push validation errors into.
   */
  function validate(rootElement, errors) {
    const rootChildren = rootElement.getChildren();

    // Using ES6 for...of to iterate over the root's direct children
    for (const child of rootChildren) {
      const childName = child.getName().toLowerCase();

      // Check if the child tag is in our SSOT Whitelist of allowed root elements
      if (SVG_CONSTANTS.ALLOWED_ROOT_TAGS.indexOf(childName) === -1) {
        const idAttr = child.getAttribute("id");
        const objId = idAttr ? idAttr.getValue() : "unnamed";
        
        // Push error using modern template literals
        errors.push(VALIDATION_ANSWERS.UNENCAPSULATED_OBJECT(objId));
      }
    }
  }

  return { validate: validate };
})();