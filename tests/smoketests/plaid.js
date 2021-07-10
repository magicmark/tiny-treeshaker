// https://github.com/plaid/react-plaid-link/blob/bba75a08e94b2ee3f5b370135d7d99213f9d02db/examples/hooks.js

import React, { useCallback } from 'react';

import { usePlaidLink } from '../src';

const App = (props) => {
    const onSuccess = useCallback((token, metadata) => console.log('onSuccess', token, metadata), []);
    const onEvent = useCallback((eventName, metadata) => console.log('onEvent', eventName, metadata), []);
    const onExit = useCallback((err, metadata) => console.log('onExit', err, metadata), []);
    const config = {
        token: props.token,
        onSuccess,
        onEvent,
        onExit,
        // –– optional parameters
        // receivedRedirectUri: props.receivedRedirectUri || null,
        // ...
    };
    const { open, ready, error } = usePlaidLink(config);
    return (
        <>
            <button type="button" className="button" onClick={() => open()} disabled={!ready || error}>
                Open Plaid Link
            </button>
        </>
    );
};
export default App;
