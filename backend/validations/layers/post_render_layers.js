/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 * 
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/post_render_layers.js
 * @brief   Validation rules for post-rendering layers. Bypasses GAS memory bugs.
 * @author  Luis N. Espinosa
 */

const PostRenderLayersValidator = (function () {

    /**
     * Helper function to find the <image> tag inside the "original map" layer.
     */
    function getOriginalMapImage(layerElement) {
        const root = layerElement.getParentElement();
        if (!root) return null;

        const children = root.getChildren();
        for (let i = 0; i < children.length; i++) {
            const g = children[i];
            if (g.getName().toLowerCase() === "g") {
                const attrs = g.getAttributes();
                let isOriginalMap = false;

                for (let j = 0; j < attrs.length; j++) {
                    if (attrs[j].getName() === "label" && attrs[j].getValue() === "original map") {
                        isOriginalMap = true;
                        break;
                    }
                }

                if (isOriginalMap) {
                    // Extraemos los hijos directos del original map
                    const mapChildren = g.getChildren();
                    for (let k = 0; k < mapChildren.length; k++) {
                        if (mapChildren[k].getName().toLowerCase() === "image") {
                            return mapChildren[k];
                        }
                    }
                }
            }
        }
        return null;
    }

    // ==========================================
    // MAIN VALIDATION LOGIC
    // ==========================================

    function validate(layerElement, svgNs, errors, layerName) {
        const layerNameUpper = layerName.toUpperCase();

        // Leemos los hijos directos en caliente, sin guardarlos en arreglos JS
        const children = layerElement.getChildren();

        let validElementsCount = 0;
        let foundImage = null;
        let forbiddenTagName = null;

        for (let i = 0; i < children.length; i++) {
            const elem = children[i];
            const tagName = (typeof elem.getName === "function" ? elem.getName() : (elem.tagName || elem.name || "")).toLowerCase()

            // Ignoramos etiquetas estructurales invisibles (title, desc)
            if (tagName !== "title" && tagName !== "desc") {
                validElementsCount++;

                if (tagName === "image") {
                    foundImage = elem;
                } else {
                    forbiddenTagName = tagName;
                }
            }
        }

        // 1. Optional Existence & Uniqueness Check
        if (validElementsCount === 0) {
            return; // Layer is empty (optional). Exit successfully.
        }

        if (validElementsCount > 1) {
            errors.push(VALIDATION_ANSWERS.POST_RENDER_MULTIPLE_OBJECTS(layerName, validElementsCount));
            return;
        }

        // 2. Allowed Tag Check
        if (!foundImage && forbiddenTagName) {
            errors.push(VALIDATION_ANSWERS.POST_RENDER_FORBIDDEN_TAG(layerName, forbiddenTagName));
            return;
        }

        // 3. Fetch the "original map" baseline image
        const origImage = getOriginalMapImage(layerElement);
        if (!origImage) {
            errors.push(VALIDATION_ANSWERS.POST_RENDER_NO_ORIGINAL_MAP(layerName));
            return;
        }

        // 4. Compare Dimensions & Coordinates (x, y, width, height)
        const attributesToCheck = ["x", "y", "width", "height"];

        for (let i = 0; i < attributesToCheck.length; i++) {
            const attr = attributesToCheck[i];
            const currentValStr = foundImage.getAttribute(attr) ? foundImage.getAttribute(attr).getValue() : "0";
            const origValStr = origImage.getAttribute(attr) ? origImage.getAttribute(attr).getValue() : "0";

            const currentVal = parseFloat(currentValStr) || 0;
            const origVal = parseFloat(origValStr) || 0;

            if (Math.abs(currentVal - origVal) > 0.01) {
                errors.push(VALIDATION_ANSWERS.POST_RENDER_GEOMETRY_MISMATCH(layerName, attr, currentVal, origVal));
            }
        }
    }

    return { validate: validate };
})();