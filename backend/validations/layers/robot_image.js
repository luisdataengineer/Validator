/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 * 
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/robot_image.js
 * @brief   Validation rules for the "robot image" layer. Restricts to exactly max 1 image and max 1 ellipse.
 * @author  Luis N. Espinosa
 */

const RobotImageValidator = (function () {

    function getVisualElements(layerElement) {
        const elements = [];
        const descendants = layerElement.getDescendants();
        const visualTags = ["rect", "path", "polyline", "polygon", "circle", "ellipse", "line", "text", "image"];

        for (let i = 0; i < descendants.length; i++) {
            const node = descendants[i];
            if (node.getType() === XmlService.ContentTypes.ELEMENT) {
                const elem = node.asElement();
                // Parche rápido para el tagName en la extracción
                const tagName = (typeof elem.getName === "function" ? elem.getName() : (elem.tagName || elem.name || "")).toLowerCase();

                if (visualTags.indexOf(tagName) !== -1) {
                    elements.push(elem);
                }
            }
        }
        return elements;
    }

    // ==========================================
    // 1. AQUÍ ESTÁ EL ADAPTADOR UNIVERSAL
    // ==========================================
    function wrapShape(originalShape) {
        if (!originalShape) return null;
        return {
            getName: function () {
                if (typeof originalShape.getName === 'function') return originalShape.getName();
                return originalShape.tagName || originalShape.name || originalShape.type || "";
            },
            getAttribute: function (attrName) {
                let val = null;

                // Si el parser usa el estándar DOM o XmlService nativo
                if (typeof originalShape.getAttribute === 'function') {
                    const attrObj = originalShape.getAttribute(attrName);
                    if (typeof attrObj === 'string') {
                        val = attrObj; // DOM estándar
                    } else if (attrObj !== null && attrObj !== undefined) {
                        val = (typeof attrObj.getValue === 'function') ? attrObj.getValue() : attrObj; // XmlService
                    }
                } else {
                    // Si el parser convirtió el XML a JSON (xml2js, fast-xml-parser, etc.)
                    if (originalShape['$'] && originalShape['$'][attrName] !== undefined) val = originalShape['$'][attrName];
                    else if (originalShape['@_' + attrName] !== undefined) val = originalShape['@_' + attrName];
                    else if (originalShape.attributes && originalShape.attributes[attrName] !== undefined) val = originalShape.attributes[attrName];
                    else if (originalShape[attrName] !== undefined) val = originalShape[attrName];
                }

                if (val === null || val === undefined) return null;

                // Simulamos el objeto Attribute nativo de Google Apps Script
                return {
                    getValue: function () { return String(val); }
                };
            }
        };
    }

    // ==========================================
    // MAIN VALIDATION LOGIC
    // ==========================================

    function validate(layerElement, svgNs, errors, layerName) {
        const elements = getVisualElements(layerElement);
        const prefix = layerName ? layerName.toUpperCase() : "ROBOT IMAGE";

        if (elements.length === 0) {
            return;
        }

        let imageCount = 0;
        let ellipseCount = 0;

        for (let i = 0; i < elements.length; i++) {
            // ==========================================
            // 2. AQUÍ ENVOLVEMOS EL ELEMENTO
            // ==========================================
            const shape = wrapShape(elements[i]);

            // A partir de aquí, shape.getName() y shape.getAttribute() SIEMPRE van a funcionar
            const tagName = shape.getName().toLowerCase();
            const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : `unnamed_${tagName}`;

            if (tagName === "image") {
                imageCount++;
            } else if (tagName === "ellipse" || tagName === "circle") {
                ellipseCount++;
            } else {
                errors.push(VALIDATION_ANSWERS.ROBOT_IMAGE_FORBIDDEN_TAG(objId, tagName));
            }
        }

        if (imageCount > 1) {
            errors.push(VALIDATION_ANSWERS.ROBOT_IMAGE_MULTIPLE_IMAGES(imageCount));
        }

        if (ellipseCount > 1) {
            errors.push(VALIDATION_ANSWERS.ROBOT_IMAGE_MULTIPLE_ELLIPSES(ellipseCount));
        }
    }

    return { validate: validate };
})();