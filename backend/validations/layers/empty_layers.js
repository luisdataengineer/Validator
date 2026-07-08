/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/empty_layers.js
 * @brief   Validation rules for layers that must remain strictly empty.
 * @author  Luis N. Espinosa
 */

const EmptyLayersValidator = (function () {

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
     * Safely extracts any visual elements inside the layer.
     * Returns an array of elements.
     */
    function getVisualElements(layerElement) {
        const elements = [];
        const descendants = layerElement.getDescendants();
        const visualTags = ["rect", "path", "polyline", "polygon", "circle", "ellipse", "line", "text", "image"];

        for (let i = 0; i < descendants.length; i++) {
            const node = descendants[i];
            if (node.getType() === XmlService.ContentTypes.ELEMENT) {
                const elem = node.asElement();
                const tagName = (typeof elem.getName === "function" ? elem.getName() : (elem.tagName || elem.name || "")).toLowerCase();

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
        const layerNameUpper = layerName.toUpperCase();
        const visualElements = getVisualElements(layerElement);

        // Si encontramos CUALQUIER objeto visual, lanzamos el error inmediatamente.
        if (visualElements.length > 0) {
            // Envolvemos el primer elemento encontrado solo para obtener su ID de forma segura si es necesario
            const firstShape = wrapShape(visualElements);
            const tagName = firstShape.getName().toLowerCase();

            let fallbackStr = "another layer";
            if (layerName.toLowerCase() === "subplan no go zones") {
                fallbackStr = "the 'no go zones' layer";
            }
            errors.push(VALIDATION_ANSWERS.EMPTY_LAYER_ERROR(layerName.toLowerCase(), fallbackStr));
        }
    }

    return { validate: validate };
})();