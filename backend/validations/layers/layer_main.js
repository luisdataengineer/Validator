/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/layers/layer_main.js
 * @brief   Orchestrator for all specific layer interior validations (Phase 4).
 * @author  Luis N. Espinosa
 */

const LayerValidator = (function () {

  /**
   * Acts as a sub-orchestrator delegating tasks to specific layer workers.
   * Evaluates the internal attributes, styles, and contents of VIP layers.
   *
   * @param {GoogleAppsScript.XML_Service.Element} rootElement - The parsed root <svg> element.
   * @returns {string[]} An array of error messages found during layer-specific validation.
   */
  function validate(rootElement) {
    const errors = [];

    // Initialize required XML namespaces once to pass down to workers
    const svgNs = XmlService.getNamespace("", SVG_CONSTANTS.NAMESPACES.SVG);
    const inkscapeNs = XmlService.getNamespace("inkscape", SVG_CONSTANTS.NAMESPACES.INKSCAPE);

    // Delegate validation to specialized layer modules.
    // The 'errors' array is passed by reference for state mutation.
    LayerAttributesValidator.validate(rootElement, svgNs, inkscapeNs, errors);

    // Route to specific VIP layer workers based on their ID
    const layers = rootElement.getChildren("g", svgNs);

    for (const layer of layers) {
      const idAttr = layer.getAttribute("id");
      const layerId = idAttr ? idAttr.getValue().trim() : "";

      // Switchboard for layer-specific interior rules
      switch (layerId) {

        case "sectors":
          // Hands over the isolated <g id="sectors"> to the Sectors Worker
          SectorsValidator.validate(layer, svgNs, errors);
          break;

        case "End vector":
          EndVectorValidator.validate(layer, svgNs, errors);
          break;

        case "Start vector":
          StartVectorValidator.validate(layer, svgNs, errors);
          break;

        case "distance transform":
        case "cleanable area":
        case "collision check":
        case "cleaned area":
          PostRenderLayersValidator.validate(layer, svgNs, errors, layerId);
          break;

        case "glass walls":
          GlassWallsValidator.validate(layer, svgNs, errors);
          break;

        case "no go zones":
          NoGoZonesValidator.validate(layer, svgNs, errors);
          break;

        case "cloudpointed zones":
        case "static features":
          CloudpointedZonesValidator.validate(layer, svgNs, errors);
          break;

        case "movable obstacles":
          MovableObstaclesValidator.validate(layer, svgNs, errors);
          break;

        case "no scrub zones":
        case "slow down zones":
          DynamicZonesValidator.validate(layer, svgNs, errors, layerId);
          break;

        case "subplan no go zones":
        case "stealth no go zones":
        case "movable localization features":
        case "camera settings zones":
        case "no clean zones":
        case "Gazebo obstacles":
          EmptyLayersValidator.validate(layer, svgNs, errors, layerId);
          break;

        // case "real room":
        //   RealRoomValidator.validate(layer, svgNs, errors, layerId);
        //   break;

        // case "original map":
        //   OriginalMapValidator.validate(layer, svgNs, errors, layerId);
        //   break;

        // case "robot image":
        //   RobotImageValidator.validate(layer, svgNs, errors, layerId);
        //   break;

        // case "move image crop box":
        //   MoveImageCropBoxValidator.validate(layer, svgNs, errors, layerId);
        //   break;

        // case "move image":
        //   MoveImageValidator.validate(layer, svgNs, errors, layerId);
        //   break;

        // case "plan image":
        // case "annotations":
        //   PlanImageValidator.validate(layer, svgNs, errors, layerId);
        //   break;

        // case "background":
        //   BackgroundValidator.validate(layer, svgNs, errors, layerId);
        //   break;
      }
    }

    return errors;
  }

  // Expose only the main validation method to the global scope
  return {
    validate: validate
  };

})();