/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validator.gs
 * @brief   Core validation logic for SVG files.
 * Parses the XML structure and validates Avidbots-specific layers.
 * @author  Luis N. Espinosa
 */

const ValidatorService = (function() {

  /**
   * Performs the main validation of the SVG structure.
   * Acts as the orchestrator, passing the parsed DOM to specific validation phases.
   *
   * @param {string} svgString - The raw text content of the SVG.
   * @returns {Object} An object containing 'isValid' (boolean), 'errors' and 'warnings' arrays.
   */
  function validate(svgString) {
    let findings = [];

    // 0. PHASE 0: PRE-FLIGHT CHECK: Validate File Size 
    const sizeInMB = svgString.length / (1024 * 1024);
    if (sizeInMB > SVG_CONSTANTS.MAX_FILE_SIZE_MB) {
      findings.push(VALIDATION_ANSWERS.FILE_SIZE_ERROR(sizeInMB));
    }

    try {
      
      // 1. PHASE 1: Parse the XML tree (DOM Creation)
      const document = XmlService.parse(svgString);
      const rootElement = document.getRootElement();
      const rootName = rootElement.getName();
      
      if (rootName.toLowerCase() !== 'svg') {
        findings.push(VALIDATION_ANSWERS.LEGACY_MESSAGE("CRITICAL: Invalid root element. Expected <svg>, found <" + rootName + ">."));
        // Stop execution here if it's not even an SVG document
        return { isValid: false, errors: findings, warnings: [] }; 
      }

      // 2. PHASE 2 & 3: General Validations
      // Evaluates global boundaries, structure, and metadata
      const generalFindings = GeneralValidator.validate(rootElement);
      if (generalFindings.length > 0) {
        findings = findings.concat(generalFindings);
      }

      // 3. PHASE 4: Layer Specific Validations
      // Evaluates internal contents, attributes, and styles of VIP layers
      const layerFindings = LayerValidator.validate(rootElement);
      if (layerFindings.length > 0) {
        findings = findings.concat(layerFindings);
      }

    } catch (error) {
      // Catches malformed XML exceptions thrown by XmlService
      findings.push(VALIDATION_ANSWERS.LEGACY_MESSAGE("CRITICAL: Malformed XML/SVG format. " + error.message));
    }

    // 4. Return the final consolidated report
    // Wrap legacy strings into standard objects
    const standardizedFindings = findings.map(f => typeof f === 'string' ? VALIDATION_ANSWERS.LEGACY_MESSAGE(f) : f);

    // 5. Group Findings by Rule and Layer to reduce UI clutter
    function groupFindings(findingsArray) {
      const grouped = {};
      const result = [];

      for (let i = 0; i < findingsArray.length; i++) {
        const f = findingsArray[i];
        if (!f.groupKey || !f.objId) {
          result.push(f);
        } else {
          if (!grouped[f.groupKey]) {
            grouped[f.groupKey] = [];
          }
          grouped[f.groupKey].push(f);
        }
      }

      for (const key in grouped) {
        const group = grouped[key];
        if (group.length === 1) {
          result.push(group[0]);
        } else {
          const first = group[0];
          
          // Collect all unique IDs
          const uniqueIdsMap = {};
          for (let j = 0; j < group.length; j++) {
            uniqueIdsMap[group[j].objId] = true;
          }
          const uniqueIds = Object.keys(uniqueIdsMap);
          const mergedIdsStr = uniqueIds.join("', '");
          
          let newMessage = first.message;
          // Dynamically replace the ID string in the message to represent multiple IDs
          newMessage = newMessage.replace("ID: '" + first.objId + "'", "IDs: '" + mergedIdsStr + "'");
          
          result.push({
            type: first.type,
            message: newMessage
          });
        }
      }

      return result;
    }

    const consolidatedFindings = groupFindings(standardizedFindings);
    
    const errors = consolidatedFindings.filter(f => f.type === 'error');
    const warnings = consolidatedFindings.filter(f => f.type === 'warning');

    return {
      isValid: errors.length === 0, // Only errors cause validation to fail
      errors: errors,
      warnings: warnings
    };
  }

  // Expose the public methods
  return {
    validate: validate
  };

})();