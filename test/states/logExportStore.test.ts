/**
 * @jest-environment jsdom
 */
import useLogExportStore from "../../src/contexts/states/logExportStore";
import useLogFileStore from "../../src/contexts/states/logFileStore";
import useMainWorkerStore from "../../src/contexts/states/mainWorkerStore";
import LogExportManager from "../../src/services/LogExportManager";
import {WORKER_REQ_CODE} from "../../src/typings/worker";
import {EXPORT_LOGS_CHUNK_SIZE} from "../../src/utils/config";


jest.mock("../../src/contexts/states/mainWorkerStore");
jest.mock("../../src/contexts/states/logFileStore");
jest.mock("../../src/services/LogExportManager");

describe("useLogExportStore", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("initial state", () => {
        const {exportProgress, logExportManager} = useLogExportStore.getState();
        expect(exportProgress).toBe(0);
        expect(logExportManager).toBeNull();
    });

    test("setExportProgress updates exportProgress", () => {
        const {setExportProgress} = useLogExportStore.getState();
        setExportProgress(50);
        const {exportProgress} = useLogExportStore.getState();
        expect(exportProgress).toBe(50);
    });

    test("exportLogs initializes LogExportManager and sends message to mainWorker", () => {
        const mockPostMessage = jest.fn();
        const mockMainWorker = {postMessage: mockPostMessage};
        const mockNumEvents = 100;
        const mockFileName = "test.log";

        (useMainWorkerStore.getState as jest.Mock).mockReturnValue({
            mainWorker: mockMainWorker,
        });
        (useLogFileStore.getState as jest.Mock).mockReturnValue({
            numEvents: mockNumEvents,
            fileName: mockFileName,
        });

        const {exportLogs} = useLogExportStore.getState();
        exportLogs();

        expect(LogExportManager).toHaveBeenCalledWith(
            Math.ceil(mockNumEvents / EXPORT_LOGS_CHUNK_SIZE),
            mockFileName
        );
        expect(mockPostMessage).toHaveBeenCalledWith({
            code: WORKER_REQ_CODE.EXPORT_LOGS,
            args: null,
        });

        const {logExportManager} = useLogExportStore.getState();
        expect(logExportManager).toBeInstanceOf(LogExportManager);
    });

    test("exportLogs logs error if mainWorker is not initialized", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();
        (useMainWorkerStore.getState as jest.Mock).mockReturnValue({
            mainWorker: null,
        });

        const {exportLogs} = useLogExportStore.getState();
        exportLogs();

        expect(consoleSpy).toHaveBeenCalledWith(
            "exportLogs: mainWorker is not initialized"
        );
        consoleSpy.mockRestore();
    });
});
