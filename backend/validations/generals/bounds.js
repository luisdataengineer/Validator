/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 * 
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/generals/bounds.js
 * @brief   Mathematical engine to simulate SVG drawing and detect out-of-bounds objects.
 * Includes a full Affine Transformation Matrix engine to handle rotate, scale, translate, and matrix.
 * @author  Luis N. Espinosa
 */

const BoundsValidator = (function() {

  /**
   * Cleans and parses a dimension string into a float.
   * @param {string} val - The raw dimension string (e.g., "100.5px").
   * @returns {number} The parsed numeric value.
   */
  function parseDimension(val) {
    if (!val) return 0;
    const parsed = parseFloat(val.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  // ==========================================
  // MATH ENGINE: Affine Transformations
  // ==========================================

  /**
   * Multiplies two SVG affine transformation matrices: [a, b, c, d, e, f].
   * @param {number[]} m1 - The first matrix.
   * @param {number[]} m2 - The second matrix.
   * @returns {number[]} The resulting multiplied matrix.
   */
  function multiplyMatrix(m1, m2) {
    return [
      m1[0]*m2[0] + m1[2]*m2[1],         // a
      m1[1]*m2[0] + m1[3]*m2[1],         // b
      m1[0]*m2[2] + m1[2]*m2[3],         // c
      m1[1]*m2[2] + m1[3]*m2[3],         // d
      m1[0]*m2[4] + m1[2]*m2[5] + m1[4], // e
      m1[1]*m2[4] + m1[3]*m2[5] + m1[5]  // f
    ];
  }

  /**
   * Parses an SVG transform string and accumulates it into a final matrix.
   * @param {string} transformStr - The raw transform attribute (e.g., "translate(10,20) rotate(90)").
   * @returns {number[]} The accumulated affine matrix [a, b, c, d, e, f].
   */
  function getTransformMatrix(transformStr) {
    let matrix = [1, 0, 0, 1, 0, 0]; // Identity matrix
    if (!transformStr) return matrix;

    // Match all transform commands
    const regex = /([a-zA-Z]+)\s*\(([^)]+)\)/g;
    let match;

    while ((match = regex.exec(transformStr)) !== null) {
      const type = match[1].toLowerCase();
      const args = match[2].split(/[ ,]+/).map(parseFloat);
      let currentMatrix = [1, 0, 0, 1, 0, 0];

      if (type === 'matrix' && args.length === 6) {
        currentMatrix = args;
      } else if (type === 'translate') {
        const tx = args[0] || 0;
        const ty = args[1] !== undefined ? args[1] : 0;
        currentMatrix = [1, 0, 0, 1, tx, ty];
      } else if (type === 'scale') {
        const sx = args[0] || 1;
        const sy = args[1] !== undefined ? args[1] : sx;
        currentMatrix = [sx, 0, 0, sy, 0, 0];
      } else if (type === 'rotate') {
        const angle = args[0] * Math.PI / 180; // Convert degrees to radians
        const cx = args[1] || 0;
        const cy = args[2] || 0;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Translation -> Rotation -> Reverse Translation
        const t1 = [1, 0, 0, 1, cx, cy];
        const rot = [cos, sin, -sin, cos, 0, 0];
        const t2 = [1, 0, 0, 1, -cx, -cy];
        currentMatrix = multiplyMatrix(multiplyMatrix(t1, rot), t2);
      }
      
      // Multiply the new transformation into our accumulated matrix
      matrix = multiplyMatrix(matrix, currentMatrix);
    }
    return matrix;
  }

  /**
   * Applies an affine transformation matrix to a 2D Cartesian point.
   * @param {Object} p - The point object {x, y}.
   * @param {number[]} m - The affine matrix [a, b, c, d, e, f].
   * @returns {Object} The transformed point {x, y}.
   */
  function applyMatrix(p, m) {
    return {
      x: m[0] * p.x + m[2] * p.y + m[4],
      y: m[1] * p.x + m[3] * p.y + m[5]
    };
  }

  // ==========================================
  // PATH & POINTS MATH ENGINE
  // ==========================================

  /**
   * Calculates the bounding box of a path 'd' string, handling absolute and relative commands.
   */
  function getPathBoundingBox(dStr) {
    if (!dStr) return null;
    const commands = dStr.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
    if (!commands) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let cx = 0, cy = 0;
    let startX = 0, startY = 0;
    
    let currentCmd = 'M';
    let isRelative = false;

    const updateBounds = (x, y) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };

    for (let i = 0; i < commands.length; ) {
      let token = commands[i];
      if (isNaN(parseFloat(token))) {
        currentCmd = token;
        isRelative = currentCmd === currentCmd.toLowerCase();
        i++;
        if (currentCmd.toUpperCase() === 'Z') {
          cx = startX;
          cy = startY;
          updateBounds(cx, cy);
          continue;
        }
      }
      
      const cmdUpper = currentCmd.toUpperCase();
      
      if (cmdUpper === 'M' || cmdUpper === 'L' || cmdUpper === 'T') {
        if (i + 1 < commands.length) {
          let x = parseFloat(commands[i]);
          let y = parseFloat(commands[i+1]);
          if (isRelative) { x += cx; y += cy; }
          cx = x; cy = y;
          if (cmdUpper === 'M') { startX = cx; startY = cy; }
          updateBounds(cx, cy);
          i += 2;
        } else break;
      } else if (cmdUpper === 'H') {
        if (i < commands.length) {
          let x = parseFloat(commands[i]);
          if (isRelative) x += cx;
          cx = x;
          updateBounds(cx, cy);
          i += 1;
        } else break;
      } else if (cmdUpper === 'V') {
        if (i < commands.length) {
          let y = parseFloat(commands[i]);
          if (isRelative) y += cy;
          cy = y;
          updateBounds(cx, cy);
          i += 1;
        } else break;
      } else if (cmdUpper === 'C') {
        if (i + 5 < commands.length) {
          let x = parseFloat(commands[i+4]);
          let y = parseFloat(commands[i+5]);
          if (isRelative) { x += cx; y += cy; }
          cx = x; cy = y;
          updateBounds(cx, cy);
          i += 6;
        } else break;
      } else if (cmdUpper === 'S' || cmdUpper === 'Q') {
        if (i + 3 < commands.length) {
          let x = parseFloat(commands[i+2]);
          let y = parseFloat(commands[i+3]);
          if (isRelative) { x += cx; y += cy; }
          cx = x; cy = y;
          updateBounds(cx, cy);
          i += 4;
        } else break;
      } else if (cmdUpper === 'A') {
        if (i + 6 < commands.length) {
          let x = parseFloat(commands[i+5]);
          let y = parseFloat(commands[i+6]);
          if (isRelative) { x += cx; y += cy; }
          cx = x; cy = y;
          updateBounds(cx, cy);
          i += 7;
        } else break;
      } else {
        i++;
      }
      
      if (currentCmd === 'M') currentCmd = 'L';
      if (currentCmd === 'm') currentCmd = 'l';
    }
    
    if (minX === Infinity) return null;
    return [
      {x: minX, y: minY}, {x: maxX, y: minY}, {x: minX, y: maxY}, {x: maxX, y: maxY}
    ];
  }

  function getPointsBoundingBox(pointsStr) {
    if (!pointsStr) return null;
    const numbers = pointsStr.match(/-?\d*\.?\d+/g);
    if (!numbers || numbers.length < 2) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < numbers.length - 1; i += 2) {
      const px = parseFloat(numbers[i]);
      const py = parseFloat(numbers[i+1]);
      if (!isNaN(px) && !isNaN(py)) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
    if (minX === Infinity) return null;
    return [
      {x: minX, y: minY}, {x: maxX, y: minY}, {x: minX, y: maxY}, {x: maxX, y: maxY}
    ];
  }

  // ==========================================
  // VALIDATOR MAIN LOGIC
  // ==========================================

  /**
   * Validates that all critical objects (<rect>) stay within the canvas boundaries.
   * @param {GoogleAppsScript.XML_Service.Element} rootElement - The parsed root <svg> element.
   * @param {GoogleAppsScript.XML_Service.Namespace} svgNs - The standard SVG namespace.
   * @param {string[]} errors - The shared array to push validation errors into.
   */
  function validate(rootElement, svgNs, errors) {
    const canvasWidth = parseDimension(rootElement.getAttribute("width") ? rootElement.getAttribute("width").getValue() : "");
    const canvasHeight = parseDimension(rootElement.getAttribute("height") ? rootElement.getAttribute("height").getValue() : "");

    if (canvasWidth === 0 || canvasHeight === 0) return;

    const layers = rootElement.getChildren("g", svgNs);

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerName = layer.getAttribute("id") ? layer.getAttribute("id").getValue() : "unnamed";
      
      // Calculate the global transformation matrix of the entire layer
      const layerTransformStr = layer.getAttribute("transform") ? layer.getAttribute("transform").getValue() : "";
      const layerMatrix = getTransformMatrix(layerTransformStr);

      // 1. Evaluate all elements with full matrix simulation
      const elements = layer.getChildren();
      for (let r = 0; r < elements.length; r++) {
        const element = elements[r];
        const tagName = element.getName().toLowerCase();
        
        // Skip groups, definitions, metadata
        if (tagName === "g" || tagName === "defs" || tagName === "title" || tagName === "desc" || tagName === "style") {
          continue;
        }

        const elementId = element.getAttribute("id") ? element.getAttribute("id").getValue() : `unnamed ${tagName}`;
        let corners = [];

        if (tagName === "rect" || tagName === "image") {
          const x = parseDimension(element.getAttribute("x") ? element.getAttribute("x").getValue() : "0");
          const y = parseDimension(element.getAttribute("y") ? element.getAttribute("y").getValue() : "0");
          const w = parseDimension(element.getAttribute("width") ? element.getAttribute("width").getValue() : "0");
          const h = parseDimension(element.getAttribute("height") ? element.getAttribute("height").getValue() : "0");
          corners = [
            {x: x, y: y}, {x: x + w, y: y}, {x: x, y: y + h}, {x: x + w, y: y + h}
          ];
        } else if (tagName === "circle") {
          const cx = parseDimension(element.getAttribute("cx") ? element.getAttribute("cx").getValue() : "0");
          const cy = parseDimension(element.getAttribute("cy") ? element.getAttribute("cy").getValue() : "0");
          const radius = parseDimension(element.getAttribute("r") ? element.getAttribute("r").getValue() : "0");
          corners = [
            {x: cx - radius, y: cy - radius}, {x: cx + radius, y: cy - radius}, 
            {x: cx - radius, y: cy + radius}, {x: cx + radius, y: cy + radius}
          ];
        } else if (tagName === "ellipse") {
          const cx = parseDimension(element.getAttribute("cx") ? element.getAttribute("cx").getValue() : "0");
          const cy = parseDimension(element.getAttribute("cy") ? element.getAttribute("cy").getValue() : "0");
          const rx = parseDimension(element.getAttribute("rx") ? element.getAttribute("rx").getValue() : "0");
          const ry = parseDimension(element.getAttribute("ry") ? element.getAttribute("ry").getValue() : "0");
          corners = [
            {x: cx - rx, y: cy - ry}, {x: cx + rx, y: cy - ry}, 
            {x: cx - rx, y: cy + ry}, {x: cx + rx, y: cy + ry}
          ];
        } else if (tagName === "text") {
          const x = parseDimension(element.getAttribute("x") ? element.getAttribute("x").getValue() : "0");
          const y = parseDimension(element.getAttribute("y") ? element.getAttribute("y").getValue() : "0");
          corners = [{x: x, y: y}];
        } else if (tagName === "path") {
          const pathData = element.getAttribute("d") ? element.getAttribute("d").getValue() : "";
          const pathCorners = getPathBoundingBox(pathData);
          if (pathCorners) corners = pathCorners;
        } else if (tagName === "polygon" || tagName === "polyline") {
          const pointsData = element.getAttribute("points") ? element.getAttribute("points").getValue() : "";
          const pointsCorners = getPointsBoundingBox(pointsData);
          if (pointsCorners) corners = pointsCorners;
        }

        if (corners.length === 0) continue;

        // Combine layer matrix with the local element's matrix
        const transformStr = element.getAttribute("transform") ? element.getAttribute("transform").getValue() : "";
        const elementMatrix = getTransformMatrix(transformStr);
        const finalMatrix = multiplyMatrix(layerMatrix, elementMatrix);

        // Simulate drawing: Apply the final matrix to all corners to find their true Cartesian position
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let c = 0; c < corners.length; c++) {
          const tPoint = applyMatrix(corners[c], finalMatrix);
          if (tPoint.x < minX) minX = tPoint.x;
          if (tPoint.x > maxX) maxX = tPoint.x;
          if (tPoint.y < minY) minY = tPoint.y;
          if (tPoint.y > maxY) maxY = tPoint.y;
        }

        // Evaluate if the true mathematical bounding box escapes the canvas area
        // Includes a 5px tolerance margin for stroke widths or anti-aliasing artifacts
        if (minX < -5 || minY < -5 || maxX > (canvasWidth + 5) || maxY > (canvasHeight + 5)) {
          errors.push(VALIDATION_ANSWERS.OUT_OF_BOUNDS(elementId, layerName, tagName));
        }
      }
    }
  }

  return { validate: validate };
})();