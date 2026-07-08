/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/move_image.js
 * @brief   Validation rules for the "move image" layer. Allows strict 2-node paths and text elements.
 * @author  Luis N. Espinosa
 */

const MoveImageValidator = (function () {

    const RULES = {
        ALLOWED_TAGS: ["path", "text"]
    };

    function getVisualElements(layerElement) {
        const elements = [];
        const descendants = layerElement.getDescendants();
        const visualTags = ["rect", "path", "polyline", "polygon", "circle", "ellipse", "line", "text", "image"];

        for (let i = 0; i < descendants.length; i++) {
            const node = descendants[i];
            if (node.getType() === XmlService.ContentTypes.ELEMENT) {
                const elem = node.asElement();
                const tagName = (typeof elem.getName === "function" ? elem.getName() : (elem.tagName || elem.name || "")).toLowerCase()

                if (visualTags.indexOf(tagName) !== -1) {
                    elements.push(elem);
                }
            }
        }
        return elements;
    }

    // ==========================================
    // MAIN VALIDATION LOGIC
    // ==========================================

    function validate(layerElement, svgNs, errors, layerName) {
        const elements = getVisualElements(layerElement);
        const prefix = layerName ? layerName.toUpperCase() : "MOVE IMAGE";

        // Optional Existence Check
        if (elements.length === 0) {
            return;
        }

        for (let i = 0; i < elements.length; i++) {
            const shape = elements[i];
            const tagName = (typeof shape.getName === "function" ? shape.getName() : (shape.tagName || shape.name || "")).toLowerCase();
            const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : `unnamed_${tagName}`;

            // 1. Allowed Tag Check
            if (RULES.ALLOWED_TAGS.indexOf(tagName) === -1) {
                errors.push(VALIDATION_ANSWERS.MOVE_IMAGE_FORBIDDEN_TAG(objId, tagName));
                continue;
            }

            // 2. Rules for <text>
            if (tagName === "text") {
                const xAttr = shape.getAttribute("x");
                const yAttr = shape.getAttribute("y");

                if (!xAttr || !yAttr) {
                    errors.push(VALIDATION_ANSWERS.MOVE_IMAGE_TEXT_NO_COORDS(objId));
                }
            }

            // 3. Rules for <path> (Lines)
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
                    errors.push(VALIDATION_ANSWERS.MOVE_IMAGE_NOT_SINGLE_STROKE(objId, mCount));
                }

                // Forbidden Curves Check
                if (/[CcSsQqTtAa]/.test(dValue)) {
                    errors.push(VALIDATION_ANSWERS.MOVE_IMAGE_HAS_CURVES(objId));
                }

                // Open Line Check (MUST be open)
                if (/[Zz]/.test(dValue)) {
                    errors.push(VALIDATION_ANSWERS.MOVE_IMAGE_CLOSED(objId));
                }

                // Exactly Two Nodes Check
                const nums = dValue.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
                const nodeCount = Math.floor(nums.length / 2);
                if (nodeCount !== 2) {
                    errors.push(VALIDATION_ANSWERS.MOVE_IMAGE_WRONG_NODES(objId, nodeCount));
                }

                // Basic Visibility Check (Cannot be fully transparent)
                const styleAttr = shape.getAttribute("style");
                const styleValue = styleAttr ? styleAttr.getValue().toLowerCase() : "";
                const opacityMatch = styleValue.match(/opacity\s*:\s*([0-9.]+)/);
                if (opacityMatch && parseFloat(opacityMatch[1]) === 0) {
                    errors.push(VALIDATION_ANSWERS.MOVE_IMAGE_INVISIBLE(objId));
                }
            }
        }
    }

    return { validate: validate };
})();