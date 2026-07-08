/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 * 
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/sectors.js
 * @brief   Validation rules for the "sectors" VIP layer.
 * Enforces geometric and color constraints for Hallways and Navigation Routes.
 * @author  Luis N. Espinosa
 */

const SectorsValidator = (function () {

  // ==========================================
  // LOCAL SSOT: Sectors Rules Configuration
  // ==========================================
  const RULES = {
    // Minimum geometric dimensions (in pixels) to prevent micro/invisible objects
    MIN_DIMENSIONS: {
      SIDE: 60.0, // At least one side (width or height) must meet this
      PATH_LENGTH: 60.0 // Minimum total path length
    },
    FAMILIES: {
      HALLWAY: {
        COLOR: "#00ff00", // Lime Green
        ALLOWED_TAGS: ["rect", "path"],
        ALLOW_TRANSFORM: true,
        REQUIRE_CLOSED: true,
        REQUIRED_NODES: 4 // Exact number of vertices for a closed area
      },
      ROUTES: {
        COLORS: ["#008000", "#0000ff", "#808000"], // CHS, Teach & Repeat, Olive
        ALLOWED_TAGS: ["path"],
        ALLOW_TRANSFORM: false,
        REQUIRE_CLOSED: false
      }
    }
  };

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  function extractStrokeColor(styleStr) {
    if (!styleStr) return null;
    const match = styleStr.match(/stroke:\s*(#[0-9a-fA-F]{6})/i);
    return match ? match[1].toLowerCase() : null;
  }

  function parseDim(val) {
    if (!val) return 0;
    const parsed = parseFloat(val.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Advanced Mathematical Parser for SVG Linear Paths.
   * Extracts total geometric length (Euclidean distance) and the exact number of nodes (vertices).
   * @param {string} dStr - The raw path data string.
   * @returns {Object} An object containing total 'length' and 'nodes' count.
   */
  function getPathMetrics(dStr) {
    const tokens = dStr.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g);
    if (!tokens) return { length: 0, nodes: 0 };

    let totalLength = 0, nodes = 0;
    let currentX = 0, currentY = 0, startX = 0, startY = 0;
    let cmd = 'M';
    let i = 0;

    while (i < tokens.length) {
      let token = tokens[i];

      if (/[A-Za-z]/.test(token)) {
        cmd = token;
        i++;
        if (cmd.toUpperCase() === 'Z') {
          totalLength += Math.sqrt(Math.pow(startX - currentX, 2) + Math.pow(startY - currentY, 2));
          currentX = startX;
          currentY = startY;
          continue;
        }
      }

      if (i >= tokens.length) break;

      let isRelative = (cmd === cmd.toLowerCase());
      let upperCmd = cmd.toUpperCase();
      let x = currentX, y = currentY;

      if (upperCmd === 'H') {
        let val = parseFloat(tokens[i++]);
        x = isRelative ? currentX + val : val;
        nodes++;
      } else if (upperCmd === 'V') {
        let val = parseFloat(tokens[i++]);
        y = isRelative ? currentY + val : val;
        nodes++;
      } else if (upperCmd === 'M' || upperCmd === 'L') {
        let valX = parseFloat(tokens[i++]);
        let valY = parseFloat(tokens[i++]);
        x = isRelative ? currentX + valX : valX;
        y = isRelative ? currentY + valY : valY;
        nodes++;
        if (upperCmd === 'M' && nodes === 1) {
          startX = x; startY = y;
        }
      } else {
        i++; continue;
      }

      if (nodes > 1) {
        totalLength += Math.sqrt(Math.pow(x - currentX, 2) + Math.pow(y - currentY, 2));
      }
      currentX = x; currentY = y;

      if (upperCmd === 'M') {
        cmd = isRelative ? 'l' : 'L';
      }
    }
    return { length: totalLength, nodes: nodes };
  }

  /**
   * Validates Path geometry rules: Single stroke, Curves, Closure, Node Count, and Min Length.
   */
  function validatePathGeometry(dAttr, isHallwayFamily, objId, errors) {
    if (!dAttr) {
      errors.push(VALIDATION_ANSWERS.SECTOR_EMPTY_PATH(objId));
      return;
    }

    const dStr = dAttr.getValue();

    // 1. Single Stroke Check
    const mCount = (dStr.match(/[Mm]/g) || []).length;
    if (mCount !== 1) {
      errors.push(VALIDATION_ANSWERS.SECTOR_NOT_SINGLE_STROKE(objId, mCount));
    }

    // 2. Curve Check
    const hasCurves = /[CcQqTtSsAa]/.test(dStr);
    if (hasCurves) {
      errors.push(VALIDATION_ANSWERS.SECTOR_HAS_CURVES(objId));
    }

    // 3. Closure Check
    const isClosed = /[Zz]/.test(dStr);
    if (isHallwayFamily && !isClosed) {
      errors.push(VALIDATION_ANSWERS.SECTOR_NOT_EXPLICITLY_CLOSED(objId));
    } else if (!isHallwayFamily && isClosed) {
      errors.push(VALIDATION_ANSWERS.SECTOR_NOT_EXPLICITLY_OPEN(objId));
    }

    // 4. Mathematical Geometry & Length Validation
    const metrics = getPathMetrics(dStr);

    if (metrics.length < RULES.MIN_DIMENSIONS.PATH_LENGTH) {
      errors.push(VALIDATION_ANSWERS.SECTOR_PATH_TOO_SHORT(objId, metrics.length.toFixed(2), RULES.MIN_DIMENSIONS.PATH_LENGTH));
    }

    if (isHallwayFamily) {
      if (metrics.nodes !== RULES.FAMILIES.HALLWAY.REQUIRED_NODES) {
        errors.push(VALIDATION_ANSWERS.SECTOR_WRONG_NODE_COUNT_HALLWAY(objId, metrics.nodes, RULES.FAMILIES.HALLWAY.REQUIRED_NODES));
      }
    } else {
      if (metrics.nodes < 2) {
        errors.push(VALIDATION_ANSWERS.SECTOR_WRONG_NODE_COUNT_ROUTE(objId, metrics.nodes));
      }
    }
  }

  // ==========================================
  // MAIN VALIDATION LOGIC
  // ==========================================

  function validate(layerElement, svgNs, errors) {
    const children = layerElement.getChildren();

    if (children.length === 0) {
      errors.push(VALIDATION_ANSWERS.SECTOR_EMPTY_LAYER());
      return;
    }

    for (const child of children) {
      const tagName = child.getName().toLowerCase();
      const objId = child.getAttribute("id") ? child.getAttribute("id").getValue() : "unnamed_object";

      const childStyle = child.getAttribute("style") ? child.getAttribute("style").getValue() : "";
      const strokeColor = extractStrokeColor(childStyle);

      if (!strokeColor) {
        errors.push(VALIDATION_ANSWERS.SECTOR_NO_STROKE_COLOR(objId));
        continue;
      }

      const transformAttr = child.getAttribute("transform");
      const transformValue = transformAttr ? transformAttr.getValue().trim().toLowerCase() : "none";

      // ----------------------------------------------------
      // FAMILY 1: HALLWAY SECTORS (#00ff00)
      // ----------------------------------------------------
      if (strokeColor === RULES.FAMILIES.HALLWAY.COLOR) {

        if (RULES.FAMILIES.HALLWAY.ALLOWED_TAGS.indexOf(tagName) === -1) {
          errors.push(VALIDATION_ANSWERS.SECTOR_FORBIDDEN_TAG(objId, tagName, RULES.FAMILIES.HALLWAY.ALLOWED_TAGS));
          continue;
        }

        if (tagName === "rect") {
          const x = parseDim(child.getAttribute("x") ? child.getAttribute("x").getValue() : "0");
          const y = parseDim(child.getAttribute("y") ? child.getAttribute("y").getValue() : "0");
          const w = parseDim(child.getAttribute("width") ? child.getAttribute("width").getValue() : "0");
          const h = parseDim(child.getAttribute("height") ? child.getAttribute("height").getValue() : "0");
          const rx = parseDim(child.getAttribute("rx") ? child.getAttribute("rx").getValue() : "0");
          const ry = parseDim(child.getAttribute("ry") ? child.getAttribute("ry").getValue() : "0");

          // PARCHE APLICADO AQUÍ: Solo exigir x>0 y>0 si no hay transformación
          if (transformValue === "none" && (x <= 0 || y <= 0)) {
            errors.push(VALIDATION_ANSWERS.SECTOR_MISSING_COORDINATES(objId));
          }

          // Lógica: Si el ancho es menor a 100 Y el alto es menor a 100, entonces lo rechaza.
          // Con que uno de los dos lados mida 100 o más, pasa la validación.
          if (w < RULES.MIN_DIMENSIONS.SIDE && h < RULES.MIN_DIMENSIONS.SIDE) {
            errors.push(VALIDATION_ANSWERS.SECTOR_TOO_SMALL(objId, RULES.MIN_DIMENSIONS.SIDE));
          }

          if (rx !== 0 || ry !== 0) {
            errors.push(VALIDATION_ANSWERS.SECTOR_ROUNDED_CORNERS(objId));
          }
        }
        else if (tagName === "path") {
          validatePathGeometry(child.getAttribute("d"), true, objId, errors);
        }
      }

      // ----------------------------------------------------
      // FAMILY 2: ROUTE SECTORS (CHS, Teach, Olive)
      // ----------------------------------------------------
      else if (RULES.FAMILIES.ROUTES.COLORS.indexOf(strokeColor) !== -1) {

        if (RULES.FAMILIES.ROUTES.ALLOWED_TAGS.indexOf(tagName) === -1) {
          errors.push(VALIDATION_ANSWERS.SECTOR_FORBIDDEN_TAG(objId, tagName, RULES.FAMILIES.ROUTES.ALLOWED_TAGS));
          continue;
        }

        if (transformValue !== "none") {
          errors.push(VALIDATION_ANSWERS.SECTOR_FORBIDDEN_TRANSFORM(objId, transformValue));
        }

        validatePathGeometry(child.getAttribute("d"), false, objId, errors);
      }

      // ----------------------------------------------------
      // REJECT: UNKNOWN COLORS
      // ----------------------------------------------------
      else {
        errors.push(VALIDATION_ANSWERS.SECTOR_UNAUTHORIZED_COLOR(objId, strokeColor));
      }
    }
  }

  return { validate: validate };
})();