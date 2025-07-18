import {Dayjs} from "dayjs";

import {Nullable} from "../../../typings/common";
import {
    Decoder,
    DecodeResult,
    DecoderOptions,
    FilteredLogEventMap,
    LogEventCount,
    Metadata,
} from "../../../typings/decoders";
import {Formatter} from "../../../typings/formatters";
import {JsonValue} from "../../../typings/js";
import {
    INVALID_TIMESTAMP_VALUE,
    LOG_LEVEL,
    LogEvent,
    LogLevelFilter,
} from "../../../typings/logs";
import {getNestedJsonValue} from "../../../utils/js";
import YscopeFormatter from "../../formatters/YscopeFormatter";
import {parseFilterKeys} from "../utils";
import {
    convertToDayjsTimestamp,
    convertToLogLevelValue,
    isJsonObject,
} from "./utils";


/**
 * A decoder for JSONL (JSON lines) files that contain log events. See `DecoderOptions` for
 * properties that are specific to log events (compared to generic JSON records).
 */
class JsonlDecoder implements Decoder {
    static #textDecoder = new TextDecoder();

    #dataArray: Nullable<Uint8Array>;

    #logLevelKeyParts: string[];

    #timestampKeyParts: string[];

    #logEvents: LogEvent[] = [];

    #filteredLogEventMap: FilteredLogEventMap = null;

    #invalidLogEventIdxToRawLine: Map<number, string> = new Map();

    #formatter: Formatter;

    /**
     * @param dataArray
     * @param decoderOptions
     */
    constructor (dataArray: Uint8Array, decoderOptions: DecoderOptions) {
        this.#dataArray = dataArray;

        const filterKeys = parseFilterKeys(decoderOptions, false);
        this.#logLevelKeyParts = filterKeys.logLevelKey.parts;
        this.#timestampKeyParts = filterKeys.timestampKey.parts;

        this.#formatter = new YscopeFormatter({formatString: decoderOptions.formatString});
    }

    static async create (dataArray: Uint8Array, decoderOptions: DecoderOptions) {
        if (0 < dataArray.length && "{".charCodeAt(0) !== dataArray[0]) {
            throw new Error("Invalid JSONL data: First byte is not '{'.");
        }

        return Promise.resolve(new JsonlDecoder(dataArray, decoderOptions));
    }

    getEstimatedNumEvents (): number {
        return this.#logEvents.length;
    }

    getFilteredLogEventMap (): FilteredLogEventMap {
        return this.#filteredLogEventMap;
    }

    // eslint-disable-next-line class-methods-use-this
    getMetadata (): Metadata {
        // Metadata is not available for JSONL files.
        return {};
    }

    setLogLevelFilter (logLevelFilter: LogLevelFilter): boolean {
        this.#filterLogEvents(logLevelFilter);

        return true;
    }

    build (): LogEventCount {
        this.#deserialize();

        const numInvalidEvents = this.#invalidLogEventIdxToRawLine.size;

        return {
            numValidEvents: this.#logEvents.length - numInvalidEvents,
            numInvalidEvents: numInvalidEvents,
        };
    }

    setFormatterOptions (options: DecoderOptions): boolean {
        this.#formatter = new YscopeFormatter({formatString: options.formatString});

        return true;
    }

    decodeRange (
        beginIdx: number,
        endIdx: number,
        useFilter: boolean,
    ): Nullable<DecodeResult[]> {
        if (useFilter && null === this.#filteredLogEventMap) {
            return null;
        }

        const length: number = (useFilter && null !== this.#filteredLogEventMap) ?
            this.#filteredLogEventMap.length :
            this.#logEvents.length;

        if (0 > beginIdx || length < endIdx) {
            return null;
        }

        const results: DecodeResult[] = [];
        for (let i = beginIdx; i < endIdx; i++) {
            // Explicit cast since typescript thinks `#filteredLogEventMap[i]` can be undefined, but
            // it shouldn't be since we performed a bounds check at the beginning of the method.
            const logEventIdx: number = (useFilter && null !== this.#filteredLogEventMap) ?
                (this.#filteredLogEventMap[i] as number) :
                i;

            results.push(this.#decodeLogEvent(logEventIdx));
        }

        return results;
    }

    findNearestLogEventByTimestamp (timestamp: number): Nullable<number> {
        let low = 0;
        let high = this.#logEvents.length - 1;
        if (high < low) {
            return null;
        }

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);

            // `mid` is guaranteed to be within bounds since `low <= high`.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const midTimestamp = this.#logEvents[mid]!.timestamp.valueOf();
            if (midTimestamp <= timestamp) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        // corner case: all log events have timestamps >= timestamp
        if (0 > high) {
            return 0;
        }

        return high;
    }

    /**
     * Parses each line from the data array and buffers it internally.
     *
     * NOTE: `#dataArray` is freed after the very first run of this method.
     */
    #deserialize () {
        if (null === this.#dataArray) {
            return;
        }

        const text = JsonlDecoder.#textDecoder.decode(this.#dataArray);
        let beginIdx = 0;
        while (beginIdx < text.length) {
            const endIdx = text.indexOf("\n", beginIdx);
            const line = (-1 === endIdx) ?
                text.substring(beginIdx) :
                text.substring(beginIdx, endIdx);

            beginIdx = (-1 === endIdx) ?
                text.length :
                endIdx + 1;

            this.#parseJson(line);
        }

        this.#dataArray = null;
    }

    /**
     * Parses a JSON line into a log event and buffers it internally. If the line isn't valid JSON,
     * a default log event is buffered and the line is added to `#invalidLogEventIdxToRawLine`.
     *
     * @param line
     */
    #parseJson (line: string) {
        let fields: JsonValue;
        let level: LOG_LEVEL;
        let timestamp: Dayjs;
        try {
            fields = JSON.parse(line) as JsonValue;
            if (false === isJsonObject(fields)) {
                throw new Error("Unexpected non-object.");
            }
            level = convertToLogLevelValue(getNestedJsonValue(
                fields,
                this.#logLevelKeyParts
            ));
            timestamp = convertToDayjsTimestamp(getNestedJsonValue(
                fields,
                this.#timestampKeyParts
            ));
        } catch (e) {
            if (0 === line.length) {
                return;
            }
            console.error(e, line);
            const currentLogEventIdx = this.#logEvents.length;
            this.#invalidLogEventIdxToRawLine.set(currentLogEventIdx, line);
            fields = {};
            level = LOG_LEVEL.UNKNOWN;
            timestamp = convertToDayjsTimestamp(INVALID_TIMESTAMP_VALUE);
        }
        this.#logEvents.push({
            fields,
            level,
            timestamp,
        });
    }

    /**
     * Filters log events and generates `#filteredLogEventMap`. If `logLevelFilter` is `null`,
     * `#filteredLogEventMap` will be set to `null`.
     *
     * @param logLevelFilter
     */
    #filterLogEvents (logLevelFilter: LogLevelFilter) {
        if (null === logLevelFilter) {
            this.#filteredLogEventMap = null;

            return;
        }

        const filteredLogEventMap: number[] = [];
        this.#logEvents.forEach((logEvent, index) => {
            if (logLevelFilter.includes(logEvent.level)) {
                filteredLogEventMap.push(index);
            }
        });
        this.#filteredLogEventMap = filteredLogEventMap;
    }

    /**
     * Decodes a log event into a `DecodeResult`.
     *
     * @param logEventIdx
     * @return The decoded log event.
     */
    #decodeLogEvent = (logEventIdx: number): DecodeResult => {
        let timestamp: bigint;
        let message: string;
        let logLevel: LOG_LEVEL;

        // eslint-disable-next-line no-warning-comments
        // TODO We could probably optimize this to avoid checking `#invalidLogEventIdxToRawLine` on
        // every iteration.
        if (this.#invalidLogEventIdxToRawLine.has(logEventIdx)) {
            timestamp = INVALID_TIMESTAMP_VALUE;
            message = `${this.#invalidLogEventIdxToRawLine.get(logEventIdx)}\n`;
            logLevel = LOG_LEVEL.UNKNOWN;
        } else {
            // Explicit cast since typescript thinks `#logEvents[logEventIdx]` can be undefined,
            // but it shouldn't be since the index comes from a class-internal filter.
            const logEvent = this.#logEvents[logEventIdx] as LogEvent;
            logLevel = logEvent.level;
            message = this.#formatter.formatLogEvent(logEvent);
            timestamp = BigInt(logEvent.timestamp.valueOf());
        }

        // eslint-disable-next-line no-warning-comments
        // TODO: extract timezone data from jsonl.
        return {
            logEventNum: logEventIdx + 1,
            logLevel: logLevel,
            message: message,
            timestamp: timestamp,
            utcOffset: 0n,
        };
    };
}


export default JsonlDecoder;
