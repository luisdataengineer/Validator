/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/original_map.js
 * @brief   Validation rules for the "original map" layer.
 * @author  Luis N. Espinosa
 */

const OriginalMapValidator = (function () {

    /**
     * Adaptador Universal V3: Blindado contra Namespaces de Inkscape.
     * Extrae el nombre de la etiqueta sin prefijos y normaliza atributos.
     */
    function wrapShape(originalShape) {
        if (!originalShape) return null;
        return {
            getName: function () {
                let name = "";
                if (typeof originalShape.getName === 'function') {
                    name = originalShape.getName();
                } else {
                    name = originalShape.tagName || originalShape.name || originalShape.localName || "";
                }
                // Limpieza total de Namespace: "svg:image" -> "image"
                return (name || "").split(':').pop().toLowerCase();
            },
            getAttribute: function (attrName) {
                let val = null;
                if (typeof originalShape.getAttribute === 'function') {
                    const attrObj = originalShape.getAttribute(attrName);
                    if (typeof attrObj === 'string') {
                        val = attrObj;
                    } else if (attrObj && typeof attrObj.getValue === 'function') {
                        val = attrObj.getValue();
                    }
                } else {
                    // Búsqueda en objeto JSON plano (soporta múltiples formatos de parsers)
                    const attrs = originalShape['$'] || originalShape.attributes || originalShape;
                    val = attrs[attrName] || attrs['svg:' + attrName] || attrs['@_' + attrName];
                }
                return val !== null && val !== undefined ? { getValue: function () { return String(val); } } : null;
            }
        };
    }

    /**
     * Extrae elementos visuales filtrando nodos de texto o basura del XML.
     */
    function getVisualElements(layerElement) {
        const elements = [];
        const descendants = layerElement.getDescendants();
        const visualTags = ["rect", "path", "polyline", "polygon", "circle", "ellipse", "line", "text", "image"];

        for (let i = 0; i < descendants.length; i++) {
            const node = descendants[i];
            if (node.getType() === XmlService.ContentTypes.ELEMENT) {
                const elem = node.asElement();
                const wrapped = wrapShape(elem);
                const tagName = wrapped.getName();

                if (tagName && visualTags.indexOf(tagName) !== -1) {
                    elements.push(elem);
                }
            }
        }
        return elements;
    }

    // ==========================================
    // LÓGICA DE VALIDACIÓN PRINCIPAL
    // ==========================================

    function validate(layerElement, svgNs, errors, layerName) {
        const prefix = layerName ? layerName.toUpperCase() : "ORIGINAL MAP";
        const visualElements = getVisualElements(layerElement);

        // 1. Requisito de existencia: Debe tener exactamente 1 imagen [cite: 56, 100]
        if (visualElements.length === 0) {
            errors.push(VALIDATION_ANSWERS.BASELINE_MAP_EMPTY());
            return;
        }

        if (visualElements.length > 1) {
            errors.push(VALIDATION_ANSWERS.BASELINE_MAP_MULTIPLE_ELEMENTS(visualElements.length));
            return;
        }

        // 2. Validación de etiqueta [cite: 56]
        const shape = wrapShape(visualElements);
        const tagName = shape.getName();
        const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : "unknown_id";

        // Solo se permite la etiqueta <image> [cite: 56]
        if (tagName !== "image") {
            errors.push(VALIDATION_ANSWERS.BASELINE_MAP_FORBIDDEN_TAG(objId, tagName));
        }

        // 3. Verificación de visibilidad (Opcional según reglas generales) [cite: 57]
        const opacityAttr = shape.getAttribute("opacity");
        if (opacityAttr && parseFloat(opacityAttr.getValue()) === 0) {
            errors.push(VALIDATION_ANSWERS.BASELINE_MAP_INVISIBLE(objId));
        }
    }

    return { validate: validate };
})();