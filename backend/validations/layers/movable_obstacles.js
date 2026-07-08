/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/movable_obstacles.js
 * @brief   Validation rules for the "movable obstacles" layer.
 * @author  Luis N. Espinosa
 */

const MovableObstaclesValidator = (function () {

    const RULES = {
        ALLOWED_TAGS: ["rect", "path"],
        MIN_SIZE: 2.0 // Minimum 2 pixels to prevent micro-clicks
    };

    function wrapShape(originalShape) {
        if (!originalShape) return null;
        return {
            getName: function () {
                if (typeof originalShape.getName === 'function') return originalShape.getName();
                return originalShape.tagName || originalShape.name || originalShape.type || "";
            },
            getAttribute: function (attrName) {
                let val = null;
                if (typeof originalShape.getAttribute === 'function') {
                    const attrObj = originalShape.getAttribute(attrName);
                    if (typeof attrObj === 'string') val = attrObj;
                    else if (attrObj !== null && attrObj !== undefined) {
                        val = (typeof attrObj.getValue === 'function') ? attrObj.getValue() : attrObj;
                    }
                } else {
                    if (originalShape['$'] && originalShape['$'][attrName] !== undefined) val = originalShape['$'][attrName];
                    else if (originalShape['@_' + attrName] !== undefined) val = originalShape['@_' + attrName];
                    else if (originalShape.attributes && originalShape.attributes[attrName] !== undefined) val = originalShape.attributes[attrName];
                    else if (originalShape[attrName] !== undefined) val = originalShape[attrName];
                }
                if (val === null || val === undefined) return null;
                return { getValue: function () { return String(val); } };
            }
        };
    }

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
     * Approximates the physical size of a path (even with curves) 
     * by finding the max Euclidean distance between its coordinate points.
     */
    function analyzePathGeometry(dAttrValue) {
        // Extract all numbers (coordinates and curve control points)
        const nums = dAttrValue.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];

        if (nums.length < 4) {
            return { isValidSize: false }; // Too few coordinates to form a shape
        }

        const startX = parseFloat(nums); // Corregido índice
        const startY = parseFloat(nums[1]);
        let maxDistance = 0;

        for (let i = 2; i < nums.length; i += 2) {
            const x = parseFloat(nums[i]);
            const y = (i + 1 < nums.length) ? parseFloat(nums[i + 1]) : startY;

            const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            if (distance > maxDistance) {
                maxDistance = distance;
            }
        }

        return { isValidSize: maxDistance >= RULES.MIN_SIZE };
    }

    // ==========================================
    // MAIN VALIDATION LOGIC
    // ==========================================

    function validate(layerElement, svgNs, errors) {
        const elements = getGeometricShapes(layerElement);

        // 1. Optional Existence Check
        if (elements.length === 0) {
            return;
        }

        for (let i = 0; i < elements.length; i++) {
            // Aplicamos el adaptador al elemento
            const shape = wrapShape(elements[i]);
            const tagName = shape.getName().toLowerCase();
            const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : `unnamed_${tagName}`;

            // 2. Allowed Tags Check
            if (RULES.ALLOWED_TAGS.indexOf(tagName) === -1) {
                errors.push(VALIDATION_ANSWERS.SHAPE_FORBIDDEN_TAG("movable obstacles", objId, tagName, RULES.ALLOWED_TAGS));
                continue;
            }

            // 3. Rules for <rect>
            if (tagName === "rect") {
                // Round Corners Check
                const rx = shape.getAttribute("rx") ? parseFloat(shape.getAttribute("rx").getValue()) : 0;
                const ry = shape.getAttribute("ry") ? parseFloat(shape.getAttribute("ry").getValue()) : 0;

                if (rx > 0 || ry > 0) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_ROUNDED_CORNERS("movable obstacles", objId));
                }

                // Minimum Size Check
                const width = shape.getAttribute("width") ? parseFloat(shape.getAttribute("width").getValue()) : 0;
                const height = shape.getAttribute("height") ? parseFloat(shape.getAttribute("height").getValue()) : 0;

                if (width < RULES.MIN_SIZE || height < RULES.MIN_SIZE) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_TOO_SMALL("movable obstacles", objId, width, height, RULES.MIN_SIZE));
                }

                // Coordinate Check (x > 0, y > 0) unless transformed
                const x = shape.getAttribute("x") ? parseFloat(shape.getAttribute("x").getValue()) : 0;
                const y = shape.getAttribute("y") ? parseFloat(shape.getAttribute("y").getValue()) : 0;
                const transformAttr = shape.getAttribute("transform");
                const transformValue = transformAttr ? transformAttr.getValue().trim().toLowerCase() : "none";

                if (transformValue === "none" && (x <= 0 || y <= 0)) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_MISSING_COORDINATES("movable obstacles", objId));
                }
            }

            // 4. Rules for <path>
            if (tagName === "path") {
                const dAttr = shape.getAttribute("d");
                if (!dAttr) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_EMPTY_PATH("movable obstacles", objId));
                    continue;
                }

                const dValue = dAttr.getValue();

                // Single Stroke Check: Only ONE 'M' or 'm' allowed per obstacle
                const mCount = (dValue.match(/[Mm]/g) || []).length;
                if (mCount !== 1) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_PATH_NOT_SINGLE_STROKE("movable obstacles", objId, mCount));
                }

                // Minimum Size Check (approximated for curves)
                const geometryInfo = analyzePathGeometry(dValue);
                if (!geometryInfo.isValidSize) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_PATH_TOO_SHORT("movable obstacles", objId, RULES.MIN_SIZE));
                }
            }
        }
    }

    return { validate: validate };
})();