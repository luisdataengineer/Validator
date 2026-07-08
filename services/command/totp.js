/**
 * =====================================================================================
 * LIBRERÍA AUTOCONTENIDA DE TOTP PARA GOOGLE APPS SCRIPT
 * No requiere 'eval()' ni librerías externas.
 * Contiene la decodificación Base32 y la lógica HMAC-SHA1.
 * =====================================================================================
 */

/**
 * Clase principal para generar códigos TOTP.
 */
class TotpGenerator {
    /**
     * Crea una instancia del generador de TOTP.
     * @param {string} base32Secret - La clave secreta en formato Base32.
     */
    constructor(base32Secret) {
        if (!base32Secret || typeof base32Secret !== 'string') {
            throw new Error("Se requiere una clave secreta (string) en formato Base32.");
        }
        // Decodifica la clave secreta una vez y la guarda.
        this.secretBytes = this._base32Decode(base32Secret);
    }

    /**
     * Genera y devuelve el código TOTP actual.
     * @returns {string} El código TOTP de 6 dígitos.
     */
    getCode() {
        const period = 30;
        const digits = 6;

        // Calcula el contador de tiempo actual.
        const timeStep = Math.floor(Date.now() / 1000 / period);

        // Convierte el contador de tiempo a un array de bytes.
        const timeBytes = [];
        let tempTime = timeStep;
        for (let i = 7; i >= 0; i--) {
            timeBytes[i] = tempTime & 0xff;
            tempTime = tempTime >> 8;
        }

        // Calcula el hash HMAC-SHA1 usando la función de ayuda interna.
        const hash = this._hmacSha1(this.secretBytes, timeBytes);

        // Extrae el código dinámico del hash.
        const offset = hash[19] & 0x0f;
        const truncatedHash = ((hash[offset] & 0x7f) << 24) |
            ((hash[offset + 1] & 0xff) << 16) |
            ((hash[offset + 2] & 0xff) << 8) |
            (hash[offset + 3] & 0xff);

        // Formatea el código final a la longitud de dígitos requerida.
        let otp = (truncatedHash % Math.pow(10, digits)).toString();
        return otp.padStart(digits, '0');
    }

    /**
     * Decodifica una cadena Base32 a un array de bytes.
     * @private
     */
    _base32Decode(base32) {
        const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        base32 = base32.toUpperCase().replace(/=+$/, "");
        let bits = "";
        for (let i = 0; i < base32.length; i++) {
            const charIndex = base32Chars.indexOf(base32[i]);
            if (charIndex === -1) throw new Error("Invalid Base32 character found.");
            bits += charIndex.toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            if (i + 8 <= bits.length) {
                bytes.push(parseInt(bits.substring(i, i + 8), 2));
            }
        }
        return bytes;
    }

    /**
     * Calcula un hash HMAC-SHA1 usando el servicio nativo de Apps Script.
     * @private
     */
    _hmacSha1(keyBytes, valueBytes) {
        const signature = Utilities.computeHmacSignature(
            Utilities.MacAlgorithm.HMAC_SHA_1,
            valueBytes,
            keyBytes
        );
        return signature;
    }
}


// --- FUNCIÓN DE PRUEBA ---
// Puedes usar esta función para verificar que tu librería funciona correctamente.
function probarGeneradorTOTP() {
    try {
        const miClaveSecreta = "YOUR_SECRET_HERE"; // Reemplaza con tu clave secreta

        // 1. Crear una instancia del generador
        const generador = new TotpGenerator(miClaveSecreta);

        // 2. Obtener el código
        const codigo = generador.getCode();

        Logger.log("El código TOTP generado es: " + codigo);

    } catch (e) {
        Logger.log("ERROR: " + e.message);
    }
}