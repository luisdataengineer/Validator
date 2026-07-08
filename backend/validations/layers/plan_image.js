/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/plan_image.js
 * @brief   Validation rules for the "plan image" layer. Highly flexible, but enforces visibility.
 * @author  Luis N. Espinosa
 */

const PlanImageValidator = (function () {

    const RULES = {
        ALLOWED_TAGS: ["rect", "circle", "ellipse", "path", "text", "image"]
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

    // Check if any opacity attribute is explicitly set to 0
    function isInvisible(shape) {
        const opacityAttr = shape.getAttribute("opacity");
        const styleAttr = shape.getAttribute("style");
        const styleValue = styleAttr ? styleAttr.getValue().toLowerCase() : "";

        if (opacityAttr && parseFloat(opacityAttr.getValue()) <= 0) return true;

        if (styleValue) {
            const opMatch = styleValue.match(/(?:^|;)opacity\s*:\s*([0-9.]+)/);
            const fillOpMatch = styleValue.match(/(?:^|;)fill-opacity\s*:\s*([0-9.]+)/);
            const strokeOpMatch = styleValue.match(/(?:^|;)stroke-opacity\s*:\s*([0-9.]+)/);
            const strokeWdMatch = styleValue.match(/(?:^|;)stroke-width\s*:\s*([0-9.]+)/);

            if (opMatch && parseFloat(opMatch[1]) <= 0) return true;
            // According to legacy rules, fill, stroke opacity and width must be > 0 
            // We will flag it if they explicitly set it to 0.
            if (fillOpMatch && parseFloat(fillOpMatch[1]) <= 0) return true;
            if (strokeOpMatch && parseFloat(strokeOpMatch[1]) <= 0) return true;
            if (strokeWdMatch && parseFloat(strokeWdMatch[1]) <= 0) return true;
        }
        return false;
    }

    // ==========================================
    // MAIN VALIDATION LOGIC
    // ==========================================

    function validate(layerElement, svgNs, errors, layerName) {
        const elements = getVisualElements(layerElement);
        const prefix = layerName ? layerName.toUpperCase() : "PLAN IMAGE";

        if (elements.length === 0) {
            return;
        }

        for (let i = 0; i < elements.length; i++) {
            const shape = elements[i];
            const tagName = (typeof shape.getName === "function" ? shape.getName() : (shape.tagName || shape.name || "")).toLowerCase();
            const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : `unnamed_${tagName}`;

            // 1. Allowed Tag Check
            if (RULES.ALLOWED_TAGS.indexOf(tagName) === -1) {
                errors.push(VALIDATION_ANSWERS.PLAN_IMAGE_FORBIDDEN_TAG(objId, tagName));
                continue;
            }

            // 2. Strict Visibility Check
            if (isInvisible(shape)) {
                errors.push(VALIDATION_ANSWERS.PLAN_IMAGE_INVISIBLE(objId));
            }

            // 3. Geometric Minimum Requirements
            if (tagName === "rect") {
                const w = shape.getAttribute("width") ? parseFloat(shape.getAttribute("width").getValue()) : 0;
                const h = shape.getAttribute("height") ? parseFloat(shape.getAttribute("height").getValue()) : 0;
                if (w <= 0 || h <= 0) errors.push(VALIDATION_ANSWERS.PLAN_IMAGE_INVALID_RECT(objId));
            }
            else if (tagName === "circle") {
                const r = shape.getAttribute("r") ? parseFloat(shape.getAttribute("r").getValue()) : 0;
                if (r <= 0) errors.push(VALIDATION_ANSWERS.PLAN_IMAGE_INVALID_CIRCLE(objId));
            }
            else if (tagName === "ellipse") {
                const rx = shape.getAttribute("rx") ? parseFloat(shape.getAttribute("rx").getValue()) : 0;
                const ry = shape.getAttribute("ry") ? parseFloat(shape.getAttribute("ry").getValue()) : 0;
                if (rx <= 0 || ry <= 0) errors.push(VALIDATION_ANSWERS.PLAN_IMAGE_INVALID_ELLIPSE(objId));
            }
            else if (tagName === "path") {
                if (!shape.getAttribute("d")) errors.push(VALIDATION_ANSWERS.SHAPE_EMPTY_PATH(prefix, objId));
            }
            else if (tagName === "text" || tagName === "image") {
                const xAttr = shape.getAttribute("x");
                const yAttr = shape.getAttribute("y");
                // Images and texts usually need base coordinates to render properly.
                if (!xAttr && !yAttr && !shape.getAttribute("transform")) {
                    errors.push(VALIDATION_ANSWERS.PLAN_IMAGE_MISSING_COORDS(objId, tagName));
                }
            }
        }
    }

    return { validate: validate };
})();