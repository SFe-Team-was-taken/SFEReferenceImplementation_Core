import { readLittleEndianIndexed } from "../../utils/byte_functions/little_endian";
import { IndexedByteArray } from "../../utils/indexed_array";

export const W_FORMAT_TAG = {
    PCM: 0x01,
    ALAW: 0x06
} as const;

export function readPCM(
    data: IndexedByteArray,
    bytesPerSample: number
): Float32Array {
    const maxSampleValue = Math.pow(2, bytesPerSample * 8 - 1); // Max value for the sample
    const maxUnsigned = Math.pow(2, bytesPerSample * 8);

    let normalizationFactor;
    let isUnsigned = false;

    if (bytesPerSample === 1) {
        normalizationFactor = 255; // For 8-bit normalize from 0-255
        isUnsigned = true;
    } else {
        normalizationFactor = maxSampleValue; // For 16-bit normalize from -32,768 to 32,767
    }
    const sampleLength = data.length / bytesPerSample;
    const sampleData = new Float32Array(sampleLength);
    if (bytesPerSample === 2) {
        // Special optimized case for s16 (most common)
        const s16 = new Int16Array(data.buffer);
        const s16l = s16.length;
        for (let i = 0; i < s16l; i++) {
            sampleData[i] = s16[i] / 32_768;
        }
    } else {
        for (let i = 0; i < sampleData.length; i++) {
            // Read
            let sample = readLittleEndianIndexed(data, bytesPerSample);
            // Turn into signed
            if (isUnsigned) {
                // Normalize unsigned 8-bit sample
                sampleData[i] = sample / normalizationFactor - 0.5;
            } else {
                // Normalize signed sample
                if (sample >= maxSampleValue) {
                    sample -= maxUnsigned;
                }
                sampleData[i] = sample / normalizationFactor;
            }
        }
    }
    return sampleData;
}

export function readALAW(
    data: IndexedByteArray,
    bytesPerSample: number
): Float32Array {
    const sampleLength = data.length / bytesPerSample;
    const sampleData = new Float32Array(sampleLength);
    for (let i = 0; i < sampleData.length; i++) {
        // Read
        const input = readLittleEndianIndexed(data, bytesPerSample);

        // https://en.wikipedia.org/wiki/G.711#A-law
        // Re-toggle toggled bits
        let sample = input ^ 0x55;

        // Remove sign bit
        sample &= 0x7f;

        // Extract exponent
        const exponent = sample >> 4;
        // Extract mantissa
        let mantissa = sample & 0xf;
        if (exponent > 0) {
            mantissa += 16; // Add leading '1', if exponent > 0
        }

        mantissa = (mantissa << 4) + 0x8;
        if (exponent > 1) {
            mantissa = mantissa << (exponent - 1);
        }

        const s16sample = input > 127 ? mantissa : -mantissa;

        // Convert to float
        sampleData[i] = s16sample / 32_768;
    }
    return sampleData;
}
