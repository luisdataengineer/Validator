/**
 * ___ _   _ ___ ___  ___   ___ _____ ___ 
 * / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 * |  _  \ V / | || |) | _ \| (_) || | \__ \
 * |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/generals/metadata.js
 * @brief   Validates global document properties by safely bypassing namespaces.
 * @author  Luis N. Espinosa
 */

const MetadataValidator = (function() {

  /**
   * Helper function to find a child node strictly by its text name, 
   * completely ignoring SVG/XML Namespaces and prefixes.
   */
  function getChildIgnoreNS(element, targetName) {
    if (!element) return null;
    const children = element.getChildren();
    for (let i = 0; i < children.length; i++) {
      if (children[i].getName().toLowerCase() === targetName.toLowerCase()) {
        return children[i];
      }
    }
    return null;
  }

  /**
   * Extracts specific key-value pairs from a text block.
   */
  function extractProperty(textBlock, key) {
    if (!textBlock) return null;
    const regex = new RegExp(key + "\\s*:\\s*(.*)", "i");
    const match = textBlock.match(regex);
    if (match) {
      let val = match[1].trim();
      val = val.replace(/^["']|["']$/g, ''); // Remueve comillas
      return val.trim();
    }
    return null;
  }

  // ==========================================
  // MAIN VALIDATION LOGIC
  // ==========================================

  function validate(rootElement, svgNs, errors) {
    
    // 1. SOFTWARE VERSION CHECK 
    const inkscapeNs = XmlService.getNamespace("inkscape", SVG_CONSTANTS.NAMESPACES.INKSCAPE);
    const versionAttr = rootElement.getAttribute("version", inkscapeNs);
    
    if (!versionAttr || versionAttr.getValue().indexOf(SVG_CONSTANTS.SOFTWARE.EXPECTED_INKSCAPE_VERSION) === -1) {
      errors.push(VALIDATION_ANSWERS.SOFTWARE_VERSION_ERROR(SVG_CONSTANTS.SOFTWARE.EXPECTED_INKSCAPE_VERSION));
    }

    // 2. GLOBAL DOCUMENT PROPERTIES (Namespace Bypass Method)
    let combinedMetadataText = "";

    const metadataElement = getChildIgnoreNS(rootElement, "metadata");
    if (metadataElement) {
      const rdfElement = getChildIgnoreNS(metadataElement, "RDF");
      if (rdfElement) {
        const workElement = getChildIgnoreNS(rdfElement, "Work");
        if (workElement) {
          const descElement = getChildIgnoreNS(workElement, "description");
          if (descElement) {
            combinedMetadataText += descElement.getValue() + "\n";
          }
        }
      }
    }

    // Fallback
    const fallbackDesc = getChildIgnoreNS(rootElement, "desc");
    if (fallbackDesc) {
      combinedMetadataText += fallbackDesc.getValue() + "\n";
    }

    // A. Environment Type Validation
    const envType = extractProperty(combinedMetadataText, "environment_type");
    if (!envType || SVG_CONSTANTS.GLOBAL_PROPERTIES.ALLOWED_ENVIRONMENTS.indexOf(envType) === -1) {
      errors.push(VALIDATION_ANSWERS.MISSING_ENVIRONMENT_TYPE());
    }

    // B. is_homebase Validation for Kas plans
    // We assume if 'is_homebase' is present and not 'false', or if it's missing but we know it's Kas (we can only check the string here).
    // The requirement: If it's a Kas plan, is_homebase must be false. Since we might not explicitly know if it's Kas without the planner info,
    // we'll check if the property 'is_homebase: true' exists (which is usually an error for Kas cleaning plans), or if 'is_homebase' is entirely missing
    // we might warn or error if we deduce it's Kas. For now, if they define it wrong, throw.
    const isHomebase = extractProperty(combinedMetadataText, "is_homebase");
    if (isHomebase === "true" || isHomebase === "True") {
      errors.push(VALIDATION_ANSWERS.INVALID_IS_HOMEBASE());
    }
  }

  return { validate: validate };
})();