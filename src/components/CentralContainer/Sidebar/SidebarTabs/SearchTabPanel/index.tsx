import {
    useCallback,
    useState,
} from "react";

import {
    AccordionGroup,
    Box,
} from "@mui/joy";

import ShareIcon from "@mui/icons-material/Share";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";

import useQueryStore from "../../../../../stores/queryStore";
import {
    TAB_DISPLAY_NAMES,
    TAB_NAME,
} from "../../../../../typings/tab";
import {
    copyPermalinkToClipboard,
    URL_HASH_PARAMS_DEFAULT,
} from "../../../../../utils/url";
import CustomTabPanel from "../CustomTabPanel";
import PanelTitleButton from "../PanelTitleButton";
import QueryInputBox from "./QueryInputBox";
import ResultsGroup from "./ResultsGroup";

import "./index.css";


/**
 * Displays a panel for submitting queries and viewing query results.
 *
 * @return
 */
const SearchTabPanel = () => {
    const queryResults = useQueryStore((state) => state.queryResults);

    const [isAllExpanded, setIsAllExpanded] = useState<boolean>(true);

    const handleCollapseAllButtonClick = useCallback(() => {
        setIsAllExpanded((v) => !v);
    }, []);

    const handleShareButtonClick = useCallback(() => {
        const {
            queryIsCaseSensitive,
            queryIsRegex,
            queryString,
            setQueryIsCaseSensitive,
            setQueryIsRegex,
            setQueryString,
        } = useQueryStore.getState();

        setQueryIsCaseSensitive(queryIsCaseSensitive);
        setQueryIsRegex(queryIsRegex);
        setQueryString(queryString);

        copyPermalinkToClipboard({}, {
            logEventNum: URL_HASH_PARAMS_DEFAULT.logEventNum,
            queryString: queryString,
            queryIsCaseSensitive: queryIsCaseSensitive,
            queryIsRegex: queryIsRegex,
        });
    }, []);

    return (
        <CustomTabPanel
            tabName={TAB_NAME.SEARCH}
            title={TAB_DISPLAY_NAMES[TAB_NAME.SEARCH]}
            titleButtons={
                <>
                    <PanelTitleButton
                        title={isAllExpanded ?
                            "Collapse all" :
                            "Expand all"}
                        onClick={handleCollapseAllButtonClick}
                    >
                        {isAllExpanded ?
                            <UnfoldLessIcon/> :
                            <UnfoldMoreIcon/>}
                    </PanelTitleButton>
                    <PanelTitleButton
                        title={"Copy URL with search parameters"}
                        onClick={handleShareButtonClick}
                    >
                        <ShareIcon/>
                    </PanelTitleButton>
                </>
            }
        >
            <Box className={"search-tab-container"}>
                <QueryInputBox/>
                <AccordionGroup
                    className={"query-results"}
                    disableDivider={true}
                    size={"sm"}
                >
                    {Array.from(queryResults.entries()).map(([pageNum, results]) => (
                        <ResultsGroup
                            isAllExpanded={isAllExpanded}
                            key={`${pageNum}-${results.length}`}
                            pageNum={pageNum}
                            results={results}/>
                    ))}
                </AccordionGroup>
            </Box>
        </CustomTabPanel>
    );
};


export default SearchTabPanel;
