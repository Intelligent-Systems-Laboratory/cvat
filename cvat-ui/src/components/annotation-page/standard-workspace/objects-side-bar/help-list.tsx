// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { StatesOrdering } from 'reducers/interfaces';
// import HelpItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/help-item';
import HelpListHeader from './help-list-header';

interface Props {
    listHeight: number;
}

function HelpListComponent(props: Props): JSX.Element {
    const {
        listHeight,
    } = props;

    return (
        <div style={{ height: 42 }}>
            <HelpListHeader />
        </div>
    );
}

export default React.memo(HelpListComponent);
