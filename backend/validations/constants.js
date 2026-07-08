/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 *
 * Copyright 2026, Avidbots Corp.
 * @name    backend/validations/constants.gs
 * @brief   Global constants for the SVG validation process.
 * Centralizes namespaces, expected attributes, and required layers.
 * @author  Luis N. Espinosa
 */

/**
 * Global configuration object for backend validation.
 * Acts as the Single Source of Truth (SSOT) for all map rules.
 * @constant {Object}
 */
const SVG_CONSTANTS = {

  /** @property {string} Expected Inkscape version to guarantee template integrity */
  SOFTWARE: {
    EXPECTED_INKSCAPE_VERSION: "1.2.2"
  },

  /** @property {Object} Global Document Properties constraints (Metadata) */
  GLOBAL_PROPERTIES: {
    ALLOWED_ENVIRONMENTS: ["Standard", "Retail", "Industrial"],
    HOMEBASE_EXPECTED: "false"
  },

  /** @property {number} Maximum allowed canvas area in pixels (35 Megapixels) */
  MAP_MAX_SIZE: 36500000,

  /** @property {number} Maximum allowed file size in Megabytes */
  MAX_FILE_SIZE_MB: 20,

  /** @property {Object} XML Namespaces required for parsing Inkscape SVGs */
  NAMESPACES: {
    SVG: "http://www.w3.org/2000/svg",
    INKSCAPE: "http://www.inkscape.org/namespaces/inkscape",
    SODIPODI: "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd",
    RDF: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    CC: "http://creativecommons.org/ns#",
    DC: "http://purl.org/dc/elements/1.1/"
  },

  /** @property {string[]} Required attributes in the root <svg> tag */
  REQUIRED_ROOT_ATTRIBUTES: [
    "width",
    "height"
  ],

  /** @property {string[]} Whitelist of allowed attributes in official layer <g> tags */
  ALLOWED_LAYER_ATTRIBUTES: [
    "id",
    "label",
    "groupmode",
    "insensitive",
    "style",
    "display"
  ],

  /** @property {string[]} Layers that MUST exist in the map file */
  MANDATORY_LAYERS: [
    "sectors",
    "End vector",
    "Start vector",
    "distance transform",
    "cleanable area",
    "collision check",
    "annotations",
    "glass walls",
    "no go zones",
    "movable obstacles",
    "no scrub zones",
    "slow down zones",
    "real room",
    "original map",
    "robot image",
    "move image crop box",
    "move image",
    "cleaned area",
    "plan image",
    "background"
  ],

  /** @property {string[]} Layers that MAY exist, but won't trigger an error if absent */
  OPTIONAL_LAYERS: [
    "subplan no go zones",
    "stealth no go zones",
    "camera settings zones",
    "no clean zones",
    "disinfection zones",
    "Gazebo obstacles",
    "movable localization features",
    "cloudpointed zones",
    "static features",
    "disinfected area",
    "localization map"
  ],

  /** @property {string[]} The exact Z-index (top to bottom) visual order expected in the SVG */
  FULL_EXPECTED_ORDER: [
    "sectors",
    "End vector",
    "Start vector",
    "distance transform",
    "cleanable area",
    "collision check",
    "annotations",
    "glass walls",
    "subplan no go zones",
    "stealth no go zones",
    "no go zones",
    "movable localization features",
    "movable obstacles",
    "cloudpointed zones",
    "static features",
    "camera settings zones",
    "no clean zones",
    "no scrub zones",
    "slow down zones",
    "disinfection zones",
    "Gazebo obstacles",
    "real room",
    "localization map",
    "original map",
    "robot image",
    "move image crop box",
    "move image",
    "disinfected area",
    "cleaned area",
    "plan image",
    "background"
  ],

  /** @property {string[]} Whitelist of allowed elements directly inside the root <svg> */
  ALLOWED_ROOT_TAGS: [
    "g",
    "defs",
    "metadata",
    "namedview",
    "title",
    "desc",
    "style"
  ],

  /** @property {string[]} Whitelist of dev emails authorized to use automated sync logic */
  AUTHORIZED_DEVS: [
    "luis.vasquez@avidbots.com",
    "carlos.solis@avidbots.com",
    "juan.garcia@avidbots.com"
  ]
};