/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/dynamic_zones.js
 * @brief   Validation rules for operational dynamic modifier layers (no scrub zones, slow down zones).
 * @author  Luis N. Espinosa
 */

const DynamicZonesValidator = (function () {

    const RULES = {
        ALLOWED_TAGS: ["rect", "path"],
        MIN_SIZE: 2.0, // Minimum 2 pixels
        MIN_NODES: 4   // Paths must form a closed area (polygon)
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

    function analyzePolygonGeometry(dAttrValue) {
        const nums = dAttrValue.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
        const nodeCount = Math.floor(nums.length / 2);

        if (nodeCount < RULES.MIN_NODES) {
            return { isValidSize: false, hasEnoughNodes: false, nodeCount: nodeCount };
        }

        const startX = parseFloat(nums); // Corregido: añadido índice
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

        return {
            isValidSize: maxDistance >= RULES.MIN_SIZE,
            hasEnoughNodes: true,
            nodeCount: nodeCount
        };
    }

    // ==========================================
    // MAIN VALIDATION LOGIC
    // ==========================================

    function validate(layerElement, svgNs, errors, layerName) {
        const elements = getGeometricShapes(layerElement);
        const prefix = layerName ? layerName.toUpperCase() : "DYNAMIC ZONE";

        if (elements.length === 0) {
            return;
        }

        for (let i = 0; i < elements.length; i++) {
            // Aplicación del adaptador
            const shape = wrapShape(elements[i]);
            const tagName = shape.getName().toLowerCase();
            const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : `unnamed_${tagName}`;

            if (RULES.ALLOWED_TAGS.indexOf(tagName) === -1) {
                errors.push(VALIDATION_ANSWERS.SHAPE_FORBIDDEN_TAG(prefix, objId, tagName, RULES.ALLOWED_TAGS));
                continue;
            }

            // Rules for <rect>
            if (tagName === "rect") {
                const rx = shape.getAttribute("rx") ? parseFloat(shape.getAttribute("rx").getValue()) : 0;
                const ry = shape.getAttribute("ry") ? parseFloat(shape.getAttribute("ry").getValue()) : 0;

                if (rx > 0 || ry > 0) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_ROUNDED_CORNERS(prefix, objId));
                }

                const width = shape.getAttribute("width") ? parseFloat(shape.getAttribute("width").getValue()) : 0;
                const height = shape.getAttribute("height") ? parseFloat(shape.getAttribute("height").getValue()) : 0;

                if (width < RULES.MIN_SIZE || height < RULES.MIN_SIZE) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_TOO_SMALL(prefix, objId, width, height, RULES.MIN_SIZE));
                }

                const x = shape.getAttribute("x") ? parseFloat(shape.getAttribute("x").getValue()) : 0;
                const y = shape.getAttribute("y") ? parseFloat(shape.getAttribute("y").getValue()) : 0;
                const transformAttr = shape.getAttribute("transform");
                const transformValue = transformAttr ? transformAttr.getValue().trim().toLowerCase() : "none";

                if (transformValue === "none" && (x <= 0 || y <= 0)) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_MISSING_COORDINATES(prefix, objId));
                }
            }

            // Rules for <path>
            if (tagName === "path") {
                const dAttr = shape.getAttribute("d");
                if (!dAttr) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_EMPTY_PATH(prefix, objId));
                    continue;
                }

                const dValue = dAttr.getValue();

                // Single Stroke Check
                const mCount = (dValue.match(/[Mm]/g) || []).length;
                if (mCount !== 1) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_POLYGON_NOT_SINGLE_STROKE(prefix, objId, mCount));
                }

                // Forbidden Curves Check
                if (/[CcSsQqTtAa]/.test(dValue)) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_POLYGON_HAS_CURVES(prefix, objId));
                }

                // Closure Check (MUST be closed)
                if (!/[Zz]/.test(dValue)) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_POLYGON_NOT_CLOSED(prefix, objId));
                }

                // Nodes and Size Check
                const geometryInfo = analyzePolygonGeometry(dValue);

                if (!geometryInfo.hasEnoughNodes) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_POLYGON_WRONG_NODE_COUNT(prefix, objId, RULES.MIN_NODES, geometryInfo.nodeCount));
                } else if (!geometryInfo.isValidSize) {
                    errors.push(VALIDATION_ANSWERS.SHAPE_POLYGON_TOO_SMALL(prefix, objId, RULES.MIN_SIZE));
                }
            }
        }
    }

    return { validate: validate };
})();