// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

// import HelpItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/help-item';
import HelpListHeader from './help-list-header';
import HelpContent from './help-content';
import { Row, Col } from 'antd/lib/grid';
import Paragraph from 'antd/lib/typography/Paragraph';

interface Props {
    listHeight: number;
    tracking: boolean;
    activatedStateID: number | null;
    onSwitchTracking(tracking: boolean, trackedStateID: number | null): void;
}

function HelpListComponent(props: Props): JSX.Element {
    const {
        listHeight,
        tracking,
        activatedStateID,
        onSwitchTracking,
    } = props;

    return (
        <div style={{ height: listHeight }}>
            <HelpListHeader />
            <HelpContent
                tracking={tracking}
                activatedStateID={activatedStateID}
                onSwitchTracking={onSwitchTracking}
            />
        </div>
    );
}

export default React.memo(HelpListComponent);
