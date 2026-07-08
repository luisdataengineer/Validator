/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/no_go_zones.js
 * @brief   Validation rules for the "no go zones" exclusion layer.
 * @author  Luis N. Espinosa
 */

const NoGoZonesValidator = (function () {

    const RULES = {
        ALLOWED_TAGS: ["rect", "path"],
        MIN_SIZE: 2.0 // Minimum 2 pixels to prevent micro-clicks
    };

    /**
     * Safely extracts all actual geometric shapes inside the layer.
     */
    function getGeometricShapes(layerElement) {
        const shapes = [];
        const descendants = layerElement.getDescendants();
        const visualTags = ["rect", "path", "polyline", "polygon", "circle", "ellipse", "line", "text", "image"];

        for (let i = 0; i < descendants.length; i++) {
            const node = descendants[i];
            if (node.getType() === XmlService.ContentTypes.ELEMENT) {
                const elem = node.asElement();
                const tagName = (typeof elem.getName === "function" ? elem.getName() : (elem.tagName || elem.name || "")).toLowerCase()

                if (visualTags.indexOf(tagName) !== -1) {
                    shapes.push(elem);
                }
            }
        }
        return shapes;
    }

    /**
     * Approximates the physical size of a straight-line path to prevent 1px accidental dots.
     */
    function analyzePathGeometry(dAttrValue) {
        const dValue = String(dAttrValue);

        let nodeCount = 0;
        let maxDistance = 0;

        // 1. TÁCTICA NUCLEAR: Rompemos el string usando cualquier letra como separador.
        // Ej: "m 10 h 20" se convierte en array: ["", "m", " 10 ", "h", " 20"]
        const parts = dValue.split(/([a-zA-Z])/);

        let startX = 0, startY = 0;
        let currentX = 0, currentY = 0;
        let isFirstMove = true;

        // 2. Iteramos de 2 en 2, porque parts es la letra y parts son los números
        for (let i = 1; i < parts.length; i += 2) {
            const cmd = parts[i];
            const upperCmd = cmd.toUpperCase();
            const argsStr = parts[i + 1] || "";

            // Extraer los números reales
            const nums = (argsStr.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);

            // ==========================================
            // LÓGICA DE CONTEO DE NODOS
            // ==========================================
            if (upperCmd === 'M' || upperCmd === 'L') {
                nodeCount += Math.floor(nums.length / 2);
            } else if (upperCmd === 'H' || upperCmd === 'V') {
                nodeCount += nums.length;
            }

            // ==========================================
            // LÓGICA DE DISTANCIA (REGLA MIN_SIZE)
            // ==========================================
            if (upperCmd === 'Z') {
                const dist = Math.sqrt(Math.pow(startX - currentX, 2) + Math.pow(startY - currentY, 2));
                if (dist > maxDistance) maxDistance = dist;
                currentX = startX;
                currentY = startY;
            }
            else if (upperCmd === 'M' || upperCmd === 'L') {
                for (let j = 0; j < nums.length; j += 2) {
                    const x = nums[j];
                    const y = nums[j + 1] || 0;

                    if (cmd === 'm' || cmd === 'l') {
                        currentX += x; currentY += y;
                    } else {
                        currentX = x; currentY = y;
                    }

                    if (isFirstMove) {
                        startX = currentX; startY = currentY; isFirstMove = false;
                    } else {
                        const dist = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                        if (dist > maxDistance) maxDistance = dist;
                    }
                }
            }
            else if (upperCmd === 'H') {
                for (let j = 0; j < nums.length; j++) {
                    if (cmd === 'h') currentX += nums[j];
                    else currentX = nums[j];

                    if (!isFirstMove) {
                        const dist = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                        if (dist > maxDistance) maxDistance = dist;
                    }
                }
            }
            else if (upperCmd === 'V') {
                for (let j = 0; j < nums.length; j++) {
                    if (cmd === 'v') currentY += nums[j];
                    else currentY = nums[j];

                    if (!isFirstMove) {
                        const dist = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                        if (dist > maxDistance) maxDistance = dist;
                    }
                }
            }
        }

        // 3. Evaluar reglas finales
        return {
            isValidSize: maxDistance >= RULES.MIN_SIZE,
            hasEnoughNodes: nodeCount >= 2
        };
    }


    // ==========================================
    // MAIN VALIDATION LOGIC
    // ==========================================

    function validate(layerElement, svgNs, errors) {
        const shapes = getGeometricShapes(layerElement);

        // 1. Optional Existence Check
        if (shapes.length === 0) {
            return;
        }

        for (let i = 0; i < shapes.length; i++) {
            const shape = shapes[i];
            const tagName = (typeof shape.getName === "function" ? shape.getName() : (shape.tagName || shape.name || "")).toLowerCase();
            const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : `unnamed_${tagName}`;

            // 2. Allowed Tags Check
            if (RULES.ALLOWED_TAGS.indexOf(tagName) === -1) {
                errors.push(VALIDATION_ANSWERS.SHAPE_FORBIDDEN_TAG("no go zones", objId, tagName, RULES.ALLOWED_TAGS));
                continue;
            }

            // 3. Rules for <rect>
            if (tagName === "rect") {
                // Round Corners Check
                const rx = shape.getAttribute("rx") ? parseFloat(shape.getAttribute("rx").getValue()) : 0;
                const ry = shape.getAttribute("ry") ? parseFloat(shape.getAttribute("ry").getValue()) : 0;

                if (rx > 0 || ry > 0) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_ROUNDED_CORNERS("no go zones", objId));
                }

                // Minimum Size Check
                const width = shape.getAttribute("width") ? parseFloat(shape.getAttribute("width").getValue()) : 0;
                const height = shape.getAttribute("height") ? parseFloat(shape.getAttribute("height").getValue()) : 0;

                if (width < RULES.MIN_SIZE || height < RULES.MIN_SIZE) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_TOO_SMALL("no go zones", objId, width, height, RULES.MIN_SIZE));
                }

                // Coordinate Check (x > 0, y > 0) unless transformed
                const x = shape.getAttribute("x") ? parseFloat(shape.getAttribute("x").getValue()) : 0;
                const y = shape.getAttribute("y") ? parseFloat(shape.getAttribute("y").getValue()) : 0;
                const transformAttr = shape.getAttribute("transform");
                const transformValue = transformAttr ? transformAttr.getValue().trim().toLowerCase() : "none";

                if (transformValue === "none" && (x <= 0 || y <= 0)) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_MISSING_COORDINATES("no go zones", objId));
                }
            }

            // 4. Rules for <path>
            if (tagName === "path") {
                const dAttr = shape.getAttribute("d");
                if (!dAttr) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_EMPTY_PATH("no go zones", objId));
                    continue;
                }

                const dValue = dAttr.getValue();

                // Forbidden Curves Check
                if (/[CcSsQqTtAa]/.test(dValue)) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_HAS_CURVES("no go zones", objId));
                    continue;
                }

                // Minimum Length and Nodes Check
                const geometryInfo = analyzePathGeometry(dValue);

                if (!geometryInfo.hasEnoughNodes) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_WRONG_NODE_COUNT("no go zones", objId, 2));
                } else if (!geometryInfo.isValidSize) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_PATH_TOO_SHORT("no go zones", objId, RULES.MIN_SIZE));
                }
            }
        }
    }

    return { validate: validate };
})();