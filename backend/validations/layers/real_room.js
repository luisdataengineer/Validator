/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/real_room.js
 * @brief   Validation rules for the "real room" boundary layer. Enforces 0% opacity ON THE LAYER.
 * @author  Luis N. Espinosa
 */

const RealRoomValidator = (function () {

    const RULES = {
        ALLOWED_TAG: "path",
        MIN_SIZE: 2.0,
        MIN_NODES: 2
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

    function analyzeLineGeometry(dAttrValue) {
        const nums = dAttrValue.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
        const nodeCount = Math.floor(nums.length / 2);
        if (nodeCount < RULES.MIN_NODES) return { isValidSize: false, hasEnoughNodes: false };

        const startX = parseFloat(nums);
        const startY = parseFloat(nums[1]);
        let maxDistance = 0;
        for (let i = 2; i < nums.length; i += 2) {
            const x = parseFloat(nums[i]);
            const y = (i + 1 < nums.length) ? parseFloat(nums[i + 1]) : startY;
            const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            if (distance > maxDistance) maxDistance = distance;
        }
        return { isValidSize: maxDistance >= RULES.MIN_SIZE, hasEnoughNodes: true };
    }

    function validate(layerElement, svgNs, errors, layerName) {
        const prefix = layerName ? layerName.toUpperCase() : "REAL ROOM";

        const layerWrapped = wrapShape(layerElement);
        const layerStyle = layerWrapped.getAttribute("style") ? layerWrapped.getAttribute("style").getValue().toLowerCase() : "";
        const layerOpacity = layerWrapped.getAttribute("opacity") ? layerWrapped.getAttribute("opacity").getValue().trim() : null;

        let layerIsTransparent = false;
        if (layerOpacity === "0" || layerOpacity === "0.0" || layerOpacity === "0%") layerIsTransparent = true;

        if (!layerIsTransparent && layerStyle) {
            const opacityMatch = layerStyle.match(/opacity\s*:\s*([0-9.]+)(%)?/);
            if (opacityMatch && parseFloat(opacityMatch[1]) === 0) layerIsTransparent = true;
        }

        if (!layerIsTransparent) {
            errors.push(VALIDATION_ANSWERS.REAL_ROOM_LAYER_NOT_TRANSPARENT());
        }

        const elements = getGeometricShapes(layerElement);
        if (elements.length === 0) return;

        for (let i = 0; i < elements.length; i++) {
            const shape = wrapShape(elements[i]);
            const tagName = shape.getName().toLowerCase();
            const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : `unnamed_${tagName}`;

            if (tagName !== RULES.ALLOWED_TAG) {
                errors.push(VALIDATION_ANSWERS.REAL_ROOM_FORBIDDEN_TAG(objId, tagName));
                continue;
            }

            const transformAttr = shape.getAttribute("transform");
            if (transformAttr && transformAttr.getValue().trim().toLowerCase() !== "none") {
                errors.push(VALIDATION_ANSWERS.REAL_ROOM_FORBIDDEN_TRANSFORM(objId));
            }

            const dAttr = shape.getAttribute("d");
            if (!dAttr) continue;
            const dValue = dAttr.getValue();

            if ((dValue.match(/[Mm]/g) || []).length !== 1) {
                errors.push(VALIDATION_ANSWERS.REAL_ROOM_NOT_SINGLE_STROKE(objId));
            }
            if (/[CcSsQqTtAa]/.test(dValue)) {
                errors.push(VALIDATION_ANSWERS.REAL_ROOM_HAS_CURVES(objId));
            }
            if (/[Zz]/.test(dValue)) {
                errors.push(VALIDATION_ANSWERS.REAL_ROOM_NOT_OPEN(objId));
            }

            const geometryInfo = analyzeLineGeometry(dValue);
            if (!geometryInfo.isValidSize) {
                errors.push(VALIDATION_ANSWERS.REAL_ROOM_TOO_SMALL(objId, RULES.MIN_SIZE));
            }
        }
    }

    return { validate: validate };
})();