import {StrictMode} from "react";
import ReactDOM from "react-dom/client";

import App from "./App";


// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(
    <StrictMode>
        <App/>
    </StrictMode>
);
