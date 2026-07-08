/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/move_image_crop_box.js
 * @brief   Validation rules for the "move image crop box" layer. Checks aspect ratio and Start Vector containment.
 * @author  Luis N. Espinosa
 */

const MoveImageCropBoxValidator = (function () {

    const RULES = {
        ALLOWED_TAG: "rect",
        TARGET_RATIO: 15 / 7,
        TOLERANCE: 0.20
    };

    function wrapShape(originalShape) {
        if (!originalShape) return null;
        return {
            getName: function () {
                let name = "";
                if (typeof originalShape.getName === 'function') name = originalShape.getName();
                else name = originalShape.tagName || originalShape.name || originalShape.type || "";
                return (name || "").split(':').pop().toLowerCase();
            },
            getAttribute: function (attrName) {
                let val = null;
                if (typeof originalShape.getAttribute === 'function') {
                    const attrObj = originalShape.getAttribute(attrName);
                    if (typeof attrObj === 'string') val = attrObj;
                    else if (attrObj && typeof attrObj.getValue === 'function') val = attrObj.getValue();
                } else {
                    const attrs = originalShape['$'] || originalShape.attributes || originalShape;
                    val = attrs[attrName] || attrs['svg:' + attrName] || attrs['@_' + attrName];
                }
                return val !== null && val !== undefined ? { getValue: function () { return String(val); } } : null;
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
                const wrapped = wrapShape(elem);
                const tagName = wrapped.getName();
                if (tagName && visualTags.indexOf(tagName) !== -1) {
                    shapes.push(elem);
                }
            }
        }
        return shapes;
    }

    function getStartVectorCoordinates(layerElement) {
        let root = layerElement;
        while (root.getParentElement()) { root = root.getParentElement(); }

        const allDescendants = root.getDescendants();
        let startVectorLayer = null;

        for (let i = 0; i < allDescendants.length; i++) {
            const node = allDescendants[i];
            if (node.getType() === XmlService.ContentTypes.ELEMENT) {
                const elem = node.asElement();
                const wrapped = wrapShape(elem);
                if (wrapped.getName() === "g") {
                    const id = (wrapped.getAttribute("id") ? wrapped.getAttribute("id").getValue() : "").toLowerCase();
                    const labelAttr = elem.getAttribute("label", root.getNamespace("inkscape"));
                    const label = labelAttr ? labelAttr.getValue().toLowerCase() : "";
                    if (id === "start vector" || label === "start vector") {
                        startVectorLayer = elem;
                        break;
                    }
                }
            }
        }

        if (!startVectorLayer) return null;

        const layerDescendants = startVectorLayer.getDescendants();
        for (let i = 0; i < layerDescendants.length; i++) {
            const node = layerDescendants[i];
            if (node.getType() === XmlService.ContentTypes.ELEMENT) {
                const elem = node.asElement();
                const wrapped = wrapShape(elem);
                if (wrapped.getName() === "path") {
                    const dAttr = wrapped.getAttribute("d");
                    if (dAttr) {
                        const nums = dAttr.getValue().match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
                        if (nums && nums.length >= 2) return { x: parseFloat(nums), y: parseFloat(nums[1]) };
                    }
                }
            }
        }
        return null;
    }

    function validate(layerElement, svgNs, errors, layerName) {
        const prefix = layerName ? layerName.toUpperCase() : "MOVE IMAGE CROP BOX";

        const layerWrapped = wrapShape(layerElement);
        const layerTransform = layerWrapped.getAttribute("transform");
        if (layerTransform && layerTransform.getValue().trim().toLowerCase() !== "none") {
            errors.push(VALIDATION_ANSWERS.CROP_BOX_LAYER_TRANSFORM());
        }

        const shapes = getGeometricShapes(layerElement);

        if (shapes.length === 0) return;

        if (shapes.length > 1) {
            errors.push(VALIDATION_ANSWERS.CROP_BOX_MULTIPLE_ELEMENTS(shapes.length));
            return;
        }

        const shape = wrapShape(shapes);
        const tagName = shape.getName();
        const objId = shape.getAttribute("id") ? shape.getAttribute("id").getValue() : "crop_box_rect";

        if (tagName !== RULES.ALLOWED_TAG) {
            errors.push(VALIDATION_ANSWERS.CROP_BOX_FORBIDDEN_TAG(objId, tagName));
            return;
        }

        const transformAttr = shape.getAttribute("transform");
        if (transformAttr && transformAttr.getValue().toLowerCase() !== "none") {
            errors.push(VALIDATION_ANSWERS.CROP_BOX_TRANSFORM(objId));
        }

        const rectX = shape.getAttribute("x") ? parseFloat(shape.getAttribute("x").getValue()) : null;
        const rectY = shape.getAttribute("y") ? parseFloat(shape.getAttribute("y").getValue()) : null;
        const width = shape.getAttribute("width") ? parseFloat(shape.getAttribute("width").getValue()) : 0;
        const height = shape.getAttribute("height") ? parseFloat(shape.getAttribute("height").getValue()) : 0;

        if (rectX === null || rectY === null || width <= 0 || height <= 0) {
            errors.push(VALIDATION_ANSWERS.CROP_BOX_INVALID_COORDS(objId));
        } else {
            const actualRatio = width / height;
            const lowerBound = RULES.TARGET_RATIO * (1 - RULES.TOLERANCE);
            const upperBound = RULES.TARGET_RATIO * (1 + RULES.TOLERANCE);

            if (actualRatio < lowerBound || actualRatio > upperBound) {
                errors.push(VALIDATION_ANSWERS.CROP_BOX_INVALID_RATIO(actualRatio.toFixed(2)));
            }

            const startVectorCoords = getStartVectorCoordinates(layerElement);
            if (!startVectorCoords) {
                errors.push(VALIDATION_ANSWERS.CROP_BOX_NO_START_VECTOR());
            } else {
                const svX = startVectorCoords.x;
                const svY = startVectorCoords.y;
                if (svX < rectX || svX > rectX + width || svY < rectY || svY > rectY + height) {
                    errors.push(VALIDATION_ANSWERS.CROP_BOX_START_VECTOR_OUTSIDE(svX, svY));
                }
            }
        }
    }

    return { validate: validate };
})();