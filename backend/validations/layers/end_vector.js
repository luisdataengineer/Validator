/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/end_vector.js
 * @brief   Validation rules for the "End vector" VIP layer.
 * @author  Luis N. Espinosa
 */

const EndVectorValidator = (function () {

  const RULES = {
    ALLOWED_TAG: "path",
    EXPECTED_NODES: 2
  };

  /**
   * Helper to safely extract all actual geometric shapes inside the layer.
   * This bypasses any XML Namespace issues or invisible grouping tags.
   */
  function getGeometricShapes(layerElement) {
    const shapes = [];
    const descendants = layerElement.getDescendants();
    const geometricTags = ["path", "polyline", "rect", "circle", "ellipse", "polygon", "line"];

    for (let i = 0; i < descendants.length; i++) {
      const node = descendants[i];
      if (node.getType() === XmlService.ContentTypes.ELEMENT) {
        const elem = node.asElement();
        const tagName = (typeof elem.getName === "function" ? elem.getName() : (elem.tagName || elem.name || "")).toLowerCase()

        if (geometricTags.indexOf(tagName) !== -1) {
          shapes.push(elem);
        }
      }
    }
    return shapes;
  }

  /**
   * Parses the SVG path 'd' attribute to count the exact number of nodes.
   * Returns -1 if forbidden curves are detected.
   */
  function getPathNodeCount(dAttrValue) {
    if (/[CcSsQqTtAa]/.test(dAttrValue)) {
      return -1;
    }

    let nodeCount = 0;
    const commandRegex = /([MmLlHhVv])([^MmLlHhVv]*)/g;
    let match;

    while ((match = commandRegex.exec(dAttrValue)) !== null) {
      const cmd = match[1].toUpperCase();
      const argsStr = match[2].trim();

      const nums = argsStr.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];

      if (cmd === 'M' || cmd === 'L') {
        nodeCount += Math.floor(nums.length / 2);
      } else if (cmd === 'H' || cmd === 'V') {
        nodeCount += nums.length;
      }
    }
    return nodeCount;
  }

  // ==========================================
  // MAIN VALIDATION LOGIC
  // ==========================================

  function validate(layerElement, svgNs, errors) {
    const shapes = getGeometricShapes(layerElement);

    // 1. Optional Existence & Uniqueness Check
    if (shapes.length === 0) {
      // Layer is empty, which is now allowed (optional). Exit successfully.
      return;
    }

    if (shapes.length > 1) {
      errors.push(VALIDATION_ANSWERS.END_VECTOR_MULTIPLE_OBJECTS(shapes.length));
      return;
    }

    const vector = shapes[0];
    const tagName = vector.getName().toLowerCase();
    const objId = vector.getAttribute("id") ? vector.getAttribute("id").getValue() : "unnamed_object";

    // 2. Allowed Tag Check
    if (tagName !== RULES.ALLOWED_TAG) {
      errors.push(VALIDATION_ANSWERS.END_VECTOR_FORBIDDEN_TAG(objId, tagName, RULES.ALLOWED_TAG));
      return;
    }

    // 3. Open Path & Node Count Check
    const dAttr = vector.getAttribute("d");
    if (!dAttr) {
      errors.push(VALIDATION_ANSWERS.END_VECTOR_EMPTY_PATH(objId));
    } else {
      const dValue = dAttr.getValue();

      const isClosed = /[Zz]/.test(dValue);
      if (isClosed) {
        errors.push(VALIDATION_ANSWERS.END_VECTOR_CLOSED_PATH(objId));
      }

      const nodeCount = getPathNodeCount(dValue);
      if (nodeCount === -1) {
        errors.push(VALIDATION_ANSWERS.END_VECTOR_HAS_CURVES(objId));
      } else if (nodeCount !== RULES.EXPECTED_NODES) {
        errors.push(VALIDATION_ANSWERS.END_VECTOR_WRONG_NODE_COUNT(objId, nodeCount, RULES.EXPECTED_NODES));
      }
    }
  }

  return { validate: validate };
})();