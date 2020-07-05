// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import HelpContent from './help-content';

interface Props {
    listHeight: number;
}

function HelpListComponent(props: Props): JSX.Element {
    const {
        listHeight,
    } = props;

    return (
        <div style={{ height: listHeight }}>
            <HelpContent />
        </div>
    );
}

export default React.memo(HelpListComponent);
