/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/answers.js
 * @brief   Centralized dictionary for Didactic Messages (Errors and Warnings).
 * @author  Luis N. Espinosa
 */

const VALIDATION_ANSWERS = {

  // Validation 4 - Plan SVG File Size
  FILE_SIZE_ERROR: function (sizeMB) {
    return {
      type: "warning",
      message: `This SVG file is very heavy (${sizeMB.toFixed(2)} MB), please check:  
        1. Minimize the original_map.png file size according to the cleanable areas the robot will travel. Remember that the robot only senses up to 20 meters (400 px). You can remove information that the robot will not need in the original map.
        2. Make sure you are minimizing the number of logos in the plan image layer.
        3. Remove all the NSZs, MOZs, and SDZs that the robot will not use while running the cleaning plan.
        4. Remove the real room data that is not relevant to the cleanable area.`
    };
  },

  // Validation 5 - Plan SVG Canvas Dimensions
  CANVAS_DIMENSIONS_ERROR: function () {
    return {
      type: "error",
      message: `There are mismatches between the canvas size and the original map size, please:
        1. Select the 'original map' layer. 
        2. Go to 'File > Document Properties > Display'.
        3. Press 'Resize to content' button.`
    };
  },
  ORIGINAL_MAP_NOT_FOUND: function () {
    return {
      type: "error",
      message: `Layer 'original map' not found, please:
        1. Verify the existance of the layer in the svg file.
        2. Verify the name of the layer is exactly 'original map'.
        3. Verify the layer isn't inside another layer.`
    };
  },
  ORIGINAL_MAP_NO_IMAGE: function () {
    return {
      type: "error",
      message: `The 'original map' layer exists but contains no image element, please:
        1. Run the command 'fixplan' in the terminal to regenerate the original_map layer.`
    };
  },
  MAP_SIZE_EXCEEDED: function (size, limit) {
    return {
      type: "warning",
      message: `The map (${(size / 1000000).toFixed(2)} MPx) exceeds the ${limit} limit, please:
        1. Crop the original_map.png image until it gets to less than 35.6 MPx.`
    };
  },
  INVALID_MAP_DIMENSIONS: function () {
    return {
      type: "error",
      message: `The map image has zero or invalid dimensions, please:
        1. Verify the original_map.png file is not corrupted.
        2. Verify the original_map.png file is not empty.`
    };
  },
  OUT_OF_BOUNDS: function (elementId, layerName, tagName) {
    return {
      type: "error",
      message: `The '${tagName}' tag (ID: '${elementId}') in layer '${layerName}' is placed outside the canvas area, please:
        1. Move the object inside the canvas area.`
    ,
      groupKey: `OUT_OF_BOUNDS_${layerName}`,
      objId: elementId
    };
  },

  // Validation 7 - Layer Encapsulation
  UNENCAPSULATED_OBJECT: function (id) {
    return {
      type: "error",
      message: `The object with ID: '${id}' doesn't belong to any layer, please:
        1. Verify to which layer this object belongs.
        2. Move it to the correct layer.`
    ,
      groupKey: 'UNENCAPSULATED_OBJECT',
      objId: id
    };
  },

  // Validation 8 - Plan SVG Global Properties - Part 1
  SOFTWARE_VERSION_ERROR: function (expectedVersion) {
    return {
      type: "warning",
      message: `The SVG file must be created using Inkscape v${expectedVersion}, please:
        1. Open the file in Inkscape v${expectedVersion}.
        2. Save the file without any changes.`
    };
  },
  MISSING_ENVIRONMENT_TYPE: function () {
    return {
      type: "error",
      message: `There isn't an environmental type defined, please:
        1. Go to 'File > Document Properties > Metadata > Description'.
        2. Add an environmental type. Options are:
          - environmental_type: Standard
          - environmental_type: Retail
          - environmental_type: Industrial`
    };
  },

  // Validation 9 - Plan SVG Global Properties - Part 2
  INVALID_IS_HOMEBASE: function () {
    return {
      type: "error",
      message: "This is a Kas cleaning plan, please disable the homebase feature by adding 'is_homebase: false' in File > Document Properties > Metadata > Description."
    };
  },

  // Validation 10 - Layers' Existence
  LAYER_FORMAT_ERROR: function (idText, labelText) {
    return {
      type: "warning",
      message: `Layer ID and inkscape:label must match exactly. Mismatch found on: (ID: '${idText}', Label: '${labelText}'), please:
        1. Open the XML Editor (Ctrl+Shift+X).
        2. Search for the layer with the wrong ID or label.
        3. Fix the layer ID to match the inkscape:label.`
    };
  },
  MISSING_LAYER: function (layerName) {
    return {
      type: "error",
      message: `Layer '${layerName}' doesn't exist, or it's empty, please:
        1. Verify the existance of the layer in the svg file.
        2. Verify the name of the layer is exactly '${layerName}'.
        3. Verify the layer isn't inside another layer.`
    };
  },
  DUPLICATE_LAYER: function (layerName) {
    return {
      type: "warning",
      message: `Duplicate layer found: '${layerName}', please:
        1. Remove the duplicate layer with the different ID of label.`
    };
  },
  UNKNOWN_LAYER: function (layerName) {
    return {
      type: "warning",
      message: `Unknown or extra layer found: '${layerName}', please:
        1. Remove the unknown or extra layer.`
    };
  },
  LAYER_ORDER_ERROR: function (current, expected) {
    return {
      type: "warning",
      message: `The layer '${current}' is out of order. Expected '${expected}' at this position, order the layers as follows:
        1. sectors
        2. End vector
        3. Start vector
        4. distance transform
        5. cleanable area
        6. collision check
        7. annotations
        8. glass walls
        9. subplan no go zones
        10. stealth no go zones
        11. no go zones
        12. movable localization features
        13. movable obstacles
        14. cloudpointed zones
        15. static features
        16. camera settings zones
        17. no clean zones
        18. no scrub zones
        19. slow down zones
        20. disinfection zones
        21. Gazebo obstacles
        22. real room
        23. localization map
        24. original map
        25. robot image
        26. move image crop box
        27. move image
        28. disinfected area
        29. cleaned area
        30. plan image
        31. background`
    };
  },

  // Validation 11 - Mandatory Layer Attributes
  MISSING_LAYER_ATTRIBUTE: function (layerName) {
    return {
      type: "error",
      message: `The layer: '${layerName}' is missing some attributes, please:
        1. Create the plan.svg from scratch.
        2. Copy-paste the global metadata and the objects inside layers in the corresponding layers.`
    };
  },

  // Validation 12 - Layer Transformations Restrictions
  LAYER_TRANSFORM: function (layerName) {
    return {
      type: "error",
      message: `There is a transform property in layer: '${layerName}', please:
        1. Open the XML Editor (Ctrl+Shift+X).
        2. Remove the transform property from the layer.
        3. Adjust the elements inside the layer.`
    };
  },
  RESTRICTED_PROPERTY: function (attrName, layerName) {
    return {
      type: "error",
      message: `The attribute '${attrName}' is NOT allowed on the official layer '${layerName}'.`
    };
  },

  // Validation 13 - Sectors Layer
  SECTOR_EMPTY_LAYER: function () {
    return {
      type: "warning",
      message: `The 'sectors' layer is empty, please:
        1. Ensure you have at least one valid sector defined (e.g. Hallway or Route).`
    };
  },
  SECTOR_NO_STROKE_COLOR: function (objId) {
    return {
      type: "error",
      message: `Object (ID: '${objId}') in the 'sectors' layer has no valid stroke color, please:
        1. Select the object.
        2. Open the 'Fill and Stroke' panel (Shift+Ctrl+F).
        3. Set a valid stroke color (e.g., #00ff00 for Hallways).`,
      groupKey: 'SECTOR_NO_STROKE_COLOR',
      objId: objId
    };
  },
  SECTOR_FORBIDDEN_TAG: function (objId, tagName, allowedTags) {
    return {
      type: "error",
      message: `Object (ID: '${objId}') in the 'sectors' layer uses a forbidden '${tagName}' tag. Only '${allowedTags.join("' or '")}' tags are allowed, please:
        1. Replace the object with a valid shape, or
        2. Select the object and use 'Path > Object to Path' (Shift+Ctrl+C).`,
      groupKey: 'SECTOR_FORBIDDEN_TAG',
      objId: objId
    };
  },
  SECTOR_MISSING_COORDINATES: function (objId) {
    return {
      type: "error",
      message: `Hallway 'rect' (ID: '${objId}') must have strictly positive 'x' and 'y' coordinates (x > 0, y > 0) unless it has a transform applied, please:
        1. Verify the object is positioned correctly within the canvas.`,
      groupKey: 'SECTOR_MISSING_COORDINATES',
      objId: objId
    };
  },
  SECTOR_TOO_SMALL: function (objId, minSide) {
    return {
      type: "error",
      message: `Hallway 'rect' (ID: '${objId}') is too small, please:
        1. Ensure at least one dimension (width or height) is >= ${minSide}px.`,
      groupKey: 'SECTOR_TOO_SMALL',
      objId: objId
    };
  },
  SECTOR_ROUNDED_CORNERS: function (objId) {
    return {
      type: "warning",
      message: `Hallway 'rect' (ID: '${objId}') cannot have rounded corners, please:
        1. Select the object.
        2. Open the XML Editor (Shift+Ctrl+X).
        3. Remove the 'rx' and 'ry' attributes, or set them to 0.`,
      groupKey: 'SECTOR_ROUNDED_CORNERS',
      objId: objId
    };
  },
  SECTOR_UNAUTHORIZED_COLOR: function (objId, strokeColor) {
    return {
      type: "error",
      message: `Object (ID: '${objId}') uses an unauthorized stroke color ('${strokeColor}'), please:
        1. Select the object.
        2. Open the 'Fill and Stroke' panel (Shift+Ctrl+F).
        3. Change the stroke color to an allowed color: Lime Green (#00ff00), Dark Green (#008000), Blue (#0000ff), or Olive (#808000).`,
      groupKey: 'SECTOR_UNAUTHORIZED_COLOR',
      objId: objId
    };
  },
  SECTOR_FORBIDDEN_TRANSFORM: function (objId, transformValue) {
    return {
      type: "error",
      message: `Route object (ID: '${objId}') has a forbidden transform attribute ('${transformValue}'), please:
        1. Select the object.
        2. Open the XML Editor (Shift+Ctrl+X).
        3. Remove the 'transform' attribute or set it to 'none'.`,
      groupKey: 'SECTOR_FORBIDDEN_TRANSFORM',
      objId: objId
    };
  },
  SECTOR_EMPTY_PATH: function (objId) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') is empty. Missing 'd' attribute, please:
        1. Ensure the path is drawn correctly.`,
      groupKey: 'SECTOR_EMPTY_PATH',
      objId: objId
    };
  },
  SECTOR_NOT_SINGLE_STROKE: function (objId, mCount) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') must be a single stroke. Found ${mCount} 'M' commands, please:
        1. Redraw the path as a continuous single stroke without interruptions.`,
      groupKey: 'SECTOR_NOT_SINGLE_STROKE',
      objId: objId
    };
  },
  SECTOR_HAS_CURVES: function (objId) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') contains forbidden curve commands, please:
        1. Select the path.
        2. Use the Node tool (N) to convert curves to straight lines.`,
      groupKey: 'SECTOR_HAS_CURVES',
      objId: objId
    };
  },
  SECTOR_NOT_EXPLICITLY_CLOSED: function (objId) {
    return {
      type: "error",
      message: `Hallway Path (ID: '${objId}') must be explicitly closed, please:
        1. Select the path.
        2. Use the Node tool (N) to select the start and end nodes, and join them to close the path.`,
      groupKey: 'SECTOR_NOT_EXPLICITLY_CLOSED',
      objId: objId
    };
  },
  SECTOR_NOT_EXPLICITLY_OPEN: function (objId) {
    return {
      type: "error",
      message: `Route Path (ID: '${objId}') must be explicitly open, please:
        1. Open the XML Editor (Shift+Ctrl+X).
        2. Remove the 'Z' command from the end of the 'd' attribute.`,
      groupKey: 'SECTOR_NOT_EXPLICITLY_OPEN',
      objId: objId
    };
  },
  SECTOR_PATH_TOO_SHORT: function (objId, length, minLength) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') is too short. Total length (${length}px) must be >= ${minLength}px, please:
        1. Extend the path to meet the minimum length requirement.`,
      groupKey: 'SECTOR_PATH_TOO_SHORT',
      objId: objId
    };
  },
  SECTOR_WRONG_NODE_COUNT_HALLWAY: function (objId, nodes, requiredNodes) {
    return {
      type: "error",
      message: `Closed Hallway Path (ID: '${objId}') must have exactly ${requiredNodes} nodes. Found ${nodes}, please:
        1. Use the Node tool (N) to add or remove nodes to meet the required count.`,
      groupKey: 'SECTOR_WRONG_NODE_COUNT_HALLWAY',
      objId: objId
    };
  },
  SECTOR_WRONG_NODE_COUNT_ROUTE: function (objId, nodes) {
    return {
      type: "error",
      message: `Route Path (ID: '${objId}') must have at least 2 nodes to form a line. Found ${nodes}, please:
        1. Ensure the route path has at least a start and end point.`,
      groupKey: 'SECTOR_WRONG_NODE_COUNT_ROUTE',
      objId: objId
    };
  },

  // Validation 14 - End Vector Layer
  END_VECTOR_MULTIPLE_OBJECTS: function (count) {
    return {
      type: "error",
      message: `The 'End vector' layer contains ${count} geometric objects. If present, it must contain exactly 1 End vector object, please:
        1. Keep only one path for the end vector and remove the rest.`
    };
  },
  END_VECTOR_FORBIDDEN_TAG: function (objId, tagName, allowedTag) {
    return {
      type: "error",
      message: `Object (ID: '${objId}') in the 'End vector' layer uses a forbidden '${tagName}' tag. Only '${allowedTag}' is allowed, please:
        1. Replace the object with a valid '${allowedTag}', or
        2. Select the object and use 'Path > Object to Path' (Shift+Ctrl+C).`,
      groupKey: 'END_VECTOR_FORBIDDEN_TAG',
      objId: objId
    };
  },
  END_VECTOR_EMPTY_PATH: function (objId) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') in the 'End vector' layer is empty. Missing 'd' attribute, please:
        1. Ensure the path is drawn correctly.`,
      groupKey: 'END_VECTOR_EMPTY_PATH',
      objId: objId
    };
  },
  END_VECTOR_CLOSED_PATH: function (objId) {
    return {
      type: "error",
      message: `The End vector (ID: '${objId}') must be explicitly open, please:
        1. Open the XML Editor (Shift+Ctrl+X).
        2. Remove the 'Z' command from the end of the 'd' attribute.`,
      groupKey: 'END_VECTOR_CLOSED_PATH',
      objId: objId
    };
  },
  END_VECTOR_HAS_CURVES: function (objId) {
    return {
      type: "error",
      message: `The End vector (ID: '${objId}') cannot contain curves. It must be a straight line, please:
        1. Select the path.
        2. Use the Node tool (N) to convert curves to straight lines.`,
      groupKey: 'END_VECTOR_HAS_CURVES',
      objId: objId
    };
  },
  END_VECTOR_WRONG_NODE_COUNT: function (objId, count, expected) {
    return {
      type: "error",
      message: `The End vector (ID: '${objId}') must have exactly ${expected} nodes. Currently it has ${count} nodes, please:
        1. Redraw the End vector as a single straight line with exactly ${expected} nodes.`,
      groupKey: 'END_VECTOR_WRONG_NODE_COUNT',
      objId: objId
    };
  },

  // Validation 15 - Start Vector Layer
  START_VECTOR_EMPTY_LAYER: function () {
    return {
      type: "error",
      message: `The 'Start vector' layer is empty. It requires exactly 1 open path, please:
        1. Draw exactly 1 start vector line in this layer.`
    };
  },
  START_VECTOR_MULTIPLE_OBJECTS: function (count) {
    return {
      type: "error",
      message: `The 'Start vector' layer contains ${count} geometric objects. It must contain exactly 1 Start vector object, please:
        1. Keep only one path for the start vector and remove the rest.`
    };
  },
  START_VECTOR_FORBIDDEN_TAG: function (objId, tagName, allowedTag) {
    return {
      type: "error",
      message: `Object (ID: '${objId}') in the 'Start vector' layer uses a forbidden '${tagName}' tag. Only '${allowedTag}' is allowed, please:
        1. Replace the object with a valid '${allowedTag}', or
        2. Select the object and use 'Path > Object to Path' (Shift+Ctrl+C).`,
      groupKey: 'START_VECTOR_FORBIDDEN_TAG',
      objId: objId
    };
  },
  START_VECTOR_EMPTY_PATH: function (objId) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') in the 'Start vector' layer is empty. Missing 'd' attribute, please:
        1. Ensure the path is drawn correctly.`,
      groupKey: 'START_VECTOR_EMPTY_PATH',
      objId: objId
    };
  },
  START_VECTOR_CLOSED_PATH: function (objId) {
    return {
      type: "error",
      message: `The Start vector (ID: '${objId}') must be explicitly open, please:
        1. Open the XML Editor (Shift+Ctrl+X).
        2. Remove the 'Z' command from the end of the 'd' attribute.`,
      groupKey: 'START_VECTOR_CLOSED_PATH',
      objId: objId
    };
  },
  START_VECTOR_HAS_CURVES: function (objId) {
    return {
      type: "error",
      message: `The Start vector (ID: '${objId}') cannot contain curves. It must be a straight line, please:
        1. Select the path.
        2. Use the Node tool (N) to convert curves to straight lines.`,
      groupKey: 'START_VECTOR_HAS_CURVES',
      objId: objId
    };
  },
  START_VECTOR_WRONG_NODE_COUNT: function (objId, count, expected) {
    return {
      type: "error",
      message: `The Start vector (ID: '${objId}') must have exactly ${expected} nodes. Currently it has ${count} nodes, please:
        1. Redraw the Start vector as a single straight line with exactly ${expected} nodes.`,
      groupKey: 'START_VECTOR_WRONG_NODE_COUNT',
      objId: objId
    };
  },

  EMPTY_LAYER_ERROR: function (layerName, fallbackStr) {
    const fallback = fallbackStr || "another layer";
    return {
      type: "error",
      message: `The '${layerName}' layer must be strictly empty, but it currently contains objects, please:
        1. Select all objects in the '${layerName}' layer.
        2. Delete them, or move them to ${fallback}.`
    };
  },

  // Validations for Exclusion & Feature Layers (glass walls, no go zones, etc.)
  SHAPE_FORBIDDEN_TAG: function (layerName, objId, tagName, allowedTags) {
    return {
      type: "error",
      message: `Object (ID: '${objId}') in the '${layerName}' layer uses a forbidden '${tagName}' tag. Only '${allowedTags.join("' or '")}' tags are allowed, please:
        1. Replace the object with a valid shape, or
        2. Select the object and use 'Path > Object to Path' (Shift+Ctrl+C).`,
      groupKey: `SHAPE_FORBIDDEN_TAG_${layerName}`,
      objId: objId
    };
  },
  SHAPE_ROUNDED_CORNERS: function (layerName, objId) {
    return {
      type: "error",
      message: `Rectangle (ID: '${objId}') in the '${layerName}' layer has rounded corners (rx/ry). This is prohibited for collision/exclusion zones, please:
        1. Select the object.
        2. Open the XML Editor (Shift+Ctrl+X).
        3. Remove the 'rx' and 'ry' attributes, or set them to 0.`,
      groupKey: `SHAPE_ROUNDED_CORNERS_${layerName}`,
      objId: objId
    };
  },
  SHAPE_TOO_SMALL: function (layerName, objId, width, height, minSize) {
    return {
      type: "error",
      message: `Rectangle (ID: '${objId}') in the '${layerName}' layer is too small (${width}x${height}). Both width and height must be >= ${minSize}px, please:
        1. Resize the object to meet the minimum size requirement, or delete it if it was an accidental click.`,
      groupKey: `SHAPE_TOO_SMALL_${layerName}`,
      objId: objId
    };
  },
  SHAPE_MISSING_COORDINATES: function (layerName, objId) {
    return {
      type: "error",
      message: `Rectangle (ID: '${objId}') in the '${layerName}' layer must have strictly positive 'x' and 'y' coordinates (x > 0, y > 0) unless it has a transform applied, please:
        1. Verify the object is positioned correctly within the canvas.`,
      groupKey: `SHAPE_MISSING_COORDINATES_${layerName}`,
      objId: objId
    };
  },
  SHAPE_EMPTY_PATH: function (layerName, objId) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') in the '${layerName}' layer is empty. Missing 'd' attribute, please:
        1. Ensure the path is drawn correctly.`,
      groupKey: `SHAPE_EMPTY_PATH_${layerName}`,
      objId: objId
    };
  },
  SHAPE_HAS_CURVES: function (layerName, objId) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') in the '${layerName}' layer contains curves. These zones must be drawn using straight lines only, please:
        1. Select the path.
        2. Use the Node tool (N) to convert curves to straight lines.`,
      groupKey: `SHAPE_HAS_CURVES_${layerName}`,
      objId: objId
    };
  },
  SHAPE_WRONG_NODE_COUNT: function (layerName, objId, requiredNodes) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') in the '${layerName}' layer does not have enough nodes. It must have at least ${requiredNodes} nodes, please:
        1. Ensure the path has at least a start and end point.`,
      groupKey: `SHAPE_WRONG_NODE_COUNT_${layerName}`,
      objId: objId
    };
  },
  SHAPE_PATH_TOO_SHORT: function (layerName, objId, minSize) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') in the '${layerName}' layer is smaller than the minimum allowed length of ${minSize}px (possible accidental click), please:
        1. Extend the path to meet the minimum length requirement, or delete it.`,
      groupKey: `SHAPE_PATH_TOO_SHORT_${layerName}`,
      objId: objId
    };
  },
  SHAPE_POLYGON_NOT_SINGLE_STROKE: function (layerName, objId, mCount) {
    return {
      type: "error",
      message: `Area (ID: '${objId}') in the '${layerName}' layer must be a single continuous stroke. Found ${mCount} 'M' commands, please:
        1. Do not combine multiple areas into one object. Draw them as separate objects.`,
      groupKey: `SHAPE_POLYGON_NOT_SINGLE_STROKE_${layerName}`,
      objId: objId
    };
  },
  SHAPE_POLYGON_HAS_CURVES: function (layerName, objId) {
    return {
      type: "error",
      message: `Area (ID: '${objId}') in the '${layerName}' layer contains curves. Zones must be drawn using straight lines (polygons) only, please:
        1. Select the path.
        2. Use the Node tool (N) to convert curves to straight lines.`,
      groupKey: `SHAPE_POLYGON_HAS_CURVES_${layerName}`,
      objId: objId
    };
  },
  SHAPE_POLYGON_NOT_CLOSED: function (layerName, objId) {
    return {
      type: "error",
      message: `Area (ID: '${objId}') in the '${layerName}' layer is open. It must be an explicitly closed polygon (ending with 'Z'), please:
        1. Use the Node tool (N) to join the start and end nodes of the path.`,
      groupKey: `SHAPE_POLYGON_NOT_CLOSED_${layerName}`,
      objId: objId
    };
  },
  SHAPE_POLYGON_WRONG_NODE_COUNT: function (layerName, objId, minNodes, count) {
    return {
      type: "error",
      message: `Area (ID: '${objId}') in the '${layerName}' layer does not have enough nodes to form a closed polygon. It needs at least ${minNodes} nodes, but found ${count}, please:
        1. Ensure the polygon has enough vertices to enclose an area.`,
      groupKey: `SHAPE_POLYGON_WRONG_NODE_COUNT_${layerName}`,
      objId: objId
    };
  },
  SHAPE_POLYGON_TOO_SMALL: function (layerName, objId, minSize) {
    return {
      type: "error",
      message: `Area (ID: '${objId}') in the '${layerName}' layer is too small (under ${minSize}px), please:
        1. Resize the area, or delete it if it is an accidental micro-click.`,
      groupKey: `SHAPE_POLYGON_TOO_SMALL_${layerName}`,
      objId: objId
    };
  },
  SHAPE_PATH_NOT_SINGLE_STROKE: function (layerName, objId, mCount) {
    return {
      type: "error",
      message: `Path (ID: '${objId}') in the '${layerName}' layer must be a single continuous stroke. Found ${mCount} 'M' commands, please:
        1. Do not group multiple obstacles/lines into one path.`,
      groupKey: `SHAPE_PATH_NOT_SINGLE_STROKE_${layerName}`,
      objId: objId
    };
  },

  // Validations for Post-Render Layers (distance transform, cleanable area, collision check)
  POST_RENDER_MULTIPLE_OBJECTS: function (layerName, count) {
    return {
      type: "error",
      message: `The '${layerName}' layer contains ${count} elements. It must contain exactly 1 image element, please:
        1. Ensure the layer only contains the generated image.`
    };
  },
  POST_RENDER_FORBIDDEN_TAG: function (layerName, tagName) {
    return {
      type: "error",
      message: `Object in the '${layerName}' layer uses a forbidden '${tagName}' tag. Only strictly 'image' is allowed, please:
        1. Remove the invalid object or replace it with the correct image element.`
    };
  },
  POST_RENDER_NO_ORIGINAL_MAP: function (layerName) {
    return {
      type: "error",
      message: `Cannot validate dimensions for '${layerName}' because the 'original map' layer/image was not found in the document, please:
        1. Ensure the 'original map' layer exists and contains its image.`
    };
  },
  POST_RENDER_GEOMETRY_MISMATCH: function (layerName, attr, currentVal, origVal) {
    return {
      type: "error",
      message: `Geometry mismatch in the '${layerName}' layer. The '${attr}' attribute is ${currentVal}, but 'original map' is ${origVal}. They must match exactly, please:
        1. Align and resize the image in '${layerName}' to perfectly match the 'original map' image.`
    };
  },

  // Fallback wrapper for strings that haven't been migrated yet
  LEGACY_MESSAGE: function (msg) {
    return {
      type: "error",
      message: msg
    };
  }

};
