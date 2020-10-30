// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';

import { Workspace } from 'reducers/interfaces';
import { InfoIcon, FullscreenIcon ,SettingsIcon} from 'icons';
import TogglesModal from './toggles-modal';
import { switchToggleFeatureModal } from 'actions/annotation-actions';

interface Props {
    workspace: Workspace;
    showStatistics(): void;
    changeWorkspace(workspace: Workspace): void;
    jobInstance:any;
    featuresToggle:any;
    showFeaturesToggle(visibility:boolean):void;
}

function RightGroup(props: Props): JSX.Element {
    const { showStatistics, changeWorkspace, workspace,jobInstance,
        // ISL FEATURES TOGGLE
        featuresToggle,
        showFeaturesToggle,
        // ISL END
    } = props;
    // ISL FEATURES TOGGLE
    function onCancel():void{
        showFeaturesToggle(false);
    }

    // ISL END
    return (
        <Col className='cvat-annotation-header-right-group'>
            <Button
                type='link'
                className='cvat-annotation-header-button'
                onClick={(): void => {
                    if (window.document.fullscreenEnabled) {
                        if (window.document.fullscreenElement) {
                            window.document.exitFullscreen();
                        } else {
                            window.document.documentElement.requestFullscreen();
                        }
                    }
                }}
            >
                <Icon component={FullscreenIcon} />
                Fullscreen
            </Button>
            <Button type='link' className='cvat-annotation-header-button' onClick={showStatistics}>
                <Icon component={InfoIcon} />
                Info
            </Button>
            <div>
                <Select
                    className='cvat-workspace-selector'
                    onChange={changeWorkspace}
                    value={workspace}
                >
                    {Object.values(Workspace).map((ws) => (
                        <Select.Option key={ws} value={ws}>
                            {ws}
                        </Select.Option>
                    ))}
                </Select>
            </div>
            <Button
                type='link'
                className='cvat-annotation-header-button'
                onClick={(): void => {
                    console.log('Advance options');
                    console.log({jobInstance});
                    showFeaturesToggle(true);

            }}
            >
                <Icon component={SettingsIcon} />
                Added Features
            </Button>
        </Col>

    );
}

export default React.memo(RightGroup);
