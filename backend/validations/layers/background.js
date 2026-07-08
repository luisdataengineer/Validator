/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/background.js
 * @brief   Validation rules for the "background" layer. Strictly enforces a single rect at 0,0.
 * @author  Luis N. Espinosa
 */

const BackgroundValidator = (function () {

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
        const prefix = layerName ? layerName.toUpperCase() : "BACKGROUND";

        // 1. Optional Existence Check
        if (elements.length === 0) {
            return;
        }

        // 2. Exact Cardinality Check (Strictly 1 element)
        if (elements.length > 1) {
            errors.push(VALIDATION_ANSWERS.BACKGROUND_MULTIPLE_ELEMENTS(elements.length));
            return;
        }

        const shape = elements;
        const tagName = (typeof shape.getName === "function" ? shape.getName() : (shape.tagName || shape.name || "")).toLowerCase();
        const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : `unnamed_${tagName}`;

        // 3. Allowed Tag Check (Strictly <rect>)
        if (tagName !== "rect") {
            errors.push(VALIDATION_ANSWERS.BACKGROUND_FORBIDDEN_TAG(objId, tagName));
            return;
        }

        // 4. Transform Check (Strictly NONE)
        const transformAttr = shape.getAttribute("transform");
        const transformValue = transformAttr ? transformAttr.getValue().trim().toLowerCase() : "none";
        if (transformValue !== "none") {
            errors.push(VALIDATION_ANSWERS.BACKGROUND_FORBIDDEN_TRANSFORM(objId, transformValue));
        }

        // 5. Origin Coordinates Check (Must be EXACTLY x=0, y=0)
        const xAttr = shape.getAttribute("x");
        const yAttr = shape.getAttribute("y");
        const xVal = xAttr ? parseFloat(xAttr.getValue()) : null;
        const yVal = yAttr ? parseFloat(yAttr.getValue()) : null;

        if (xVal !== 0 || yVal !== 0) {
            errors.push(VALIDATION_ANSWERS.BACKGROUND_NOT_AT_ORIGIN(objId, xVal, yVal));
        }

        // 6. Dimensions Check
        const width = shape.getAttribute("width") ? parseFloat(shape.getAttribute("width").getValue()) : 0;
        const height = shape.getAttribute("height") ? parseFloat(shape.getAttribute("height").getValue()) : 0;

        if (width <= 0 || height <= 0) {
            errors.push(VALIDATION_ANSWERS.BACKGROUND_INVALID_DIMENSIONS(objId, width, height));
        }
    }

    return { validate: validate };
})();