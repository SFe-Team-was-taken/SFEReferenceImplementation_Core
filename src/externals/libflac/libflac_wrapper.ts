import * as Flac from "./dist/libflac";
import { Decoder } from "./src/decoder";

const isInitialized: Promise<boolean> = new Promise((resolve) => {
    if (Flac.isReady()) {
        resolve(true);
        return;
    }
    function onReady(): void {
        Flac.off("ready", onReady);
        resolve(true);
    }
    Flac.on("ready", onReady);
});

interface DecodedData {
    data: Uint8Array;
    sampleRate: number;
    bytesPerSample: number;
}

function decode(buffer: Uint8Array | ArrayBuffer): DecodedData {
    const libflacDecoder = new Decoder(Flac, { verify: true, isOgg: false });

    const flacBytes =
        buffer instanceof Uint8Array
            ? Uint8Array.from(buffer)
            : new Uint8Array(buffer);

    if (!libflacDecoder.decode(flacBytes)) {
        const errorState = libflacDecoder.getState();
        libflacDecoder.destroy();
        throw new Error(
            `libflac.js decode failed: decoding error ${errorState}`
        );
    }

    if (!libflacDecoder.metadata) {
        libflacDecoder.destroy();
        throw new Error("libflac.js decode failed: no metadata");
    }

    if (libflacDecoder.metadata?.channels !== 1) {
        libflacDecoder.destroy();
        throw new Error(
            `libflac.js decode failed: sample not mono (channels: ${libflacDecoder.metadata.channels})`
        );
    }

    const flacData: Uint8Array = libflacDecoder.getSamples(false)[0];
    const flacSampleRate: number = libflacDecoder.metadata.sampleRate;
    const flacBytesPerSample: number = Math.floor(
        libflacDecoder.metadata.bitsPerSample / 8
    );

    libflacDecoder.destroy();
    return {
        data: flacData,
        sampleRate: flacSampleRate,
        bytesPerSample: flacBytesPerSample
    };
}

const libflacjsExport = {
    decode,
    isInitialized
};

export { libflacjsExport as libFlac };
