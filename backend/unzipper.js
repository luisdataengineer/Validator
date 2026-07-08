/**
 *      ___ _   _ ___ ___  ___   ___ _____ ___ 
 *     / _ \ | | |_ _|   \| _ ) / _ \_   _/ __|
 *    |  _  \ V / | || |) | _ \| (_) || | \__ \
 *    |_| |_|\_/ |___|___/|___/ \___/ |_| |___/
 * Copyright 2026, Avidbots Corp.
 * @name    backend/unzipper.gs
 * @brief   Utility service to handle ZIP and TGZ (tar.gz) archives.
 * Extracts the first .svg file found inside compressed folders.
 * @author  Luis N. Espinosa
 */

/**
 * Decompresses a ZIP archive and searches for the first SVG file.
 * * @param {string} base64Data - The Base64 encoded string of the ZIP file.
 * @returns {string|null} The raw text content of the extracted SVG, or null if not found.
 */
function extractSvgFromZip(base64Data) {
  const decodedData = Utilities.base64Decode(base64Data);
  const zipBlob = Utilities.newBlob(decodedData, 'application/zip', 'archive.zip');
  const extractedFiles = Utilities.unzip(zipBlob);

  for (let i = 0; i < extractedFiles.length; i++) {
    const fileName = extractedFiles[i].getName().toLowerCase();
    if (fileName.endsWith('.svg') && !fileName.includes('__macosx')) {
      return extractedFiles[i].getDataAsString();
    }
  }
  return null;
}

/**
 * Decompresses a TGZ (tar.gz) archive by removing the GZIP layer and 
 * manually parsing the binary TAR format blocks.
 * * @param {string} base64Data - The Base64 encoded string of the TGZ file.
 * @returns {string|null} The raw text content of the extracted SVG, or null if not found.
 * @throws {Error} If the binary parsing or decompression fails.
 */
function extractSvgFromTgz(base64Data) {
  try {
    // 1. Decode Base64 and remove the GZIP compression layer
    const decodedData = Utilities.base64Decode(base64Data);
    const gzipBlob = Utilities.newBlob(decodedData, 'application/x-gzip', 'archive.tgz');
    const tarBlob = Utilities.ungzip(gzipBlob); // Yields the raw .tar file
    
    // 2. Get the raw binary bytes to parse the TAR format manually
    const tarBytes = tarBlob.getBytes();
    let offset = 0;

    // 3. Loop through the TAR blocks (each header is 512 bytes)
    while (offset < tarBytes.length) {
      
      // Read the filename (first 100 bytes of the header, null-terminated)
      let fileName = "";
      for (let i = 0; i < 100; i++) {
        if (tarBytes[offset + i] === 0) break; // End of string
        fileName += String.fromCharCode(tarBytes[offset + i]);
      }

      // If filename is empty, we reached the end of the archive
      if (fileName === "") break;

      // Read the file size (12 bytes at offset 124, encoded in octal)
      let sizeStr = "";
      for (let j = 0; j < 11; j++) {
        const charCode = tarBytes[offset + 124 + j];
        if (charCode === 0 || charCode === 32) break; // Null or space
        sizeStr += String.fromCharCode(charCode);
      }
      let fileSize = parseInt(sizeStr, 8); // Convert octal string to decimal number
      if (isNaN(fileSize)) fileSize = 0;

      // Move the offset past the 512-byte header to the actual file data
      offset += 512;

      // Check if this is our SVG file
      const lowerFileName = fileName.toLowerCase();
      if (lowerFileName.endsWith('.svg') && !lowerFileName.includes('__macosx')) {
        // Extract exactly 'fileSize' bytes
        const svgBytes = tarBytes.slice(offset, offset + fileSize);
        // Convert the bytes back into text
        const svgBlob = Utilities.newBlob(svgBytes);
        return svgBlob.getDataAsString();
      }

      // If it's not the SVG, skip the data blocks. 
      // TAR pads data to the nearest 512-byte boundary.
      const dataBlocks = Math.ceil(fileSize / 512);
      offset += dataBlocks * 512;
    }

    return null; // No SVG found in the TAR

  } catch (error) {
    throw new Error("Failed to decompress TGZ file. " + error.message);
  }
}