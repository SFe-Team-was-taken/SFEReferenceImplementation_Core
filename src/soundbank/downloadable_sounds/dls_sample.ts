import { BasicSample } from "../basic_soundbank/basic_sample";
import { IndexedByteArray } from "../../utils/indexed_array";
import type { RIFFChunk } from "../../utils/riff_chunk";
import { SampleTypes } from "../enums";
import { SpessaLog } from "../../utils/loggin";
import { readPCM, readALAW, W_FORMAT_TAG } from "../basic_soundbank/wav_sample";

export class DLSSample extends BasicSample {
    protected wFormatTag: number;
    protected bytesPerSample: number;

    /**
     * Sample's raw data before decoding it, for faster writing
     */
    protected rawData: IndexedByteArray;

    /**
     * @param name
     * @param rate
     * @param pitch
     * @param pitchCorrection
     * @param loopStart sample data points
     * @param loopEnd sample data points
     * @param dataChunk
     * @param wFormatTag
     * @param bytesPerSample
     */
    public constructor(
        name: string,
        rate: number,
        pitch: number,
        pitchCorrection: number,
        loopStart: number,
        loopEnd: number,
        dataChunk: RIFFChunk,
        wFormatTag: number,
        bytesPerSample: number
    ) {
        super(
            name,
            rate,
            pitch,
            pitchCorrection,
            SampleTypes.monoSample,
            loopStart,
            loopEnd
        );
        this.dataOverridden = false;
        this.rawData = dataChunk.data;
        this.wFormatTag = wFormatTag;
        this.bytesPerSample = bytesPerSample;
    }

    public getAudioData(): Float32Array {
        if (!this.rawData) {
            return new Float32Array(0);
        }
        if (!this.audioData) {
            let sampleData;
            switch (this.wFormatTag) {
                default: {
                    SpessaLog.warn(
                        `Failed to decode sample. Unknown wFormatTag: ${this.wFormatTag}`
                    );
                    sampleData = new Float32Array(
                        this.rawData.length / this.bytesPerSample
                    );
                    break;
                }

                case W_FORMAT_TAG.PCM: {
                    sampleData = readPCM(this.rawData, this.bytesPerSample);
                    break;
                }

                case W_FORMAT_TAG.ALAW: {
                    sampleData = readALAW(this.rawData, this.bytesPerSample);
                    break;
                }
            }
            this.setAudioData(sampleData, this.sampleRate);
        }
        return this.audioData ?? new Float32Array(0);
    }

    public getRawData(allowVorbis: boolean) {
        if (this.dataOverridden || this.isCompressed) {
            return super.getRawData(allowVorbis);
        }
        if (this.wFormatTag === W_FORMAT_TAG.PCM && this.bytesPerSample === 2) {
            // Copy straight away
            return this.rawData;
        }
        return this.encodeS16LE();
    }
}
