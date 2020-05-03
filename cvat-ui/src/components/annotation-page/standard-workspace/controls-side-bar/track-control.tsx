// Added for User story 12/13

import React from 'react';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';

import { TrackIcon } from 'icons';

interface Props {
    switchTrackingShortcut: string;
    tracking: boolean;
    activatedStateID: number | null;
    onSwitchTracking(tracking: boolean, trackedStateID: number | null): void;
}

function TrackControl(props: Props): JSX.Element {
    const {
        switchTrackingShortcut,
        tracking,
        activatedStateID,
        onSwitchTracking,
    } = props;

    return (
        <Tooltip title={`Track rectangle with mouse ${switchTrackingShortcut}`} placement='right'>
            <Icon
                component={TrackIcon}
                onClick={(): void => {
                    if (!tracking && activatedStateID !== null) {
                        onSwitchTracking(true, activatedStateID);
                    } else {
                        onSwitchTracking(false, null);
                    }
                }}
            />
        </Tooltip>
    );
}

export default React.memo(TrackControl);
