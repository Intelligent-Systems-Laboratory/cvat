// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Timeline from 'antd/lib/timeline';
import Dropdown from 'antd/lib/dropdown';
// ISL GLOBAL ATTRIBUTES
import { Label } from './common';
import Menu from 'antd/lib/menu';
import Text from 'antd/lib/typography/Text';
import globalConditionsModal from '../standard-workspace/canvas-wrapper';
// ISL END
import AnnotationMenuContainer from 'containers/annotation-page/top-bar/annotation-menu';
import {
    MainMenuIcon,
    SaveIcon,
    UndoIcon,
    RedoIcon,
    // ISL GLOBAL ATTRIBUTES
    ConditionsIcon,
    // ISL END
} from 'icons';

interface Props {
    saving: boolean;
    savingStatuses: string[];
    undoAction?: string;
    redoAction?: string;
    saveShortcut: string;
    undoShortcut: string;
    redoShortcut: string;
    onSaveAnnotation(): void;
    onUndoClick(): void;
    onRedoClick(): void;
    onGlobalIconClick(): void; // ISL GLOBAL ATTRIBUTES
    lastSavePopup(event: any): void; // ISL Save-Popup
}

function LeftGroup(props: Props): JSX.Element {
    const {
        saving,
        savingStatuses,
        undoAction,
        redoAction,
        saveShortcut,
        undoShortcut,
        redoShortcut,
        onSaveAnnotation,
        onUndoClick,
        onRedoClick,
        onGlobalIconClick, // ISL GLOBAL ATTRIBUTES
        lastSavePopup, // ISL Save-Popup
    } = props;
    // ISL GLOBAL ATTRIBUTES
    // const [show, setShow] = useState(false);
    // const handleClose = () => setShow(false);
    // const handleShow = () => setShow(true);
    // ISL END
    return (
        <Col className='cvat-annotation-header-left-group'>
            <Dropdown overlay={<AnnotationMenuContainer />}>
                <Button type='link' className='cvat-annotation-header-button'>
                    <Icon component={MainMenuIcon} />
                    Menu
                </Button>
            </Dropdown>
            <Button
                title={`Save current changes ${saveShortcut}`}
                onClick={lastSavePopup} // ISL Save-Popup
                type='link'
                className={saving ? 'cvat-annotation-disabled-header-button' : 'cvat-annotation-header-button'}
            >
                <Icon component={SaveIcon} />
                {saving ? 'Saving...' : 'Save'}
                <Modal title='Saving changes on the server' visible={saving} footer={[]} closable={false}>
                    <Timeline pending={savingStatuses[savingStatuses.length - 1] || 'Pending..'}>
                        {savingStatuses.slice(0, -1).map((status: string, id: number) => (
                            <Timeline.Item key={id}>{status}</Timeline.Item>
                        ))}
                    </Timeline>
                </Modal>
            </Button>
            <Button
                title={`Undo: ${undoAction} ${undoShortcut}`}
                disabled={!undoAction}
                style={{ pointerEvents: undoAction ? 'initial' : 'none', opacity: undoAction ? 1 : 0.5 }}
                type='link'
                className='cvat-annotation-header-button'
                onClick={onUndoClick}
            >
                <Icon component={UndoIcon} />
                <span>Undo</span>
            </Button>
            <Button
                title={`Redo: ${redoAction} ${redoShortcut}`}
                disabled={!redoAction}
                style={{ pointerEvents: redoAction ? 'initial' : 'none', opacity: redoAction ? 1 : 0.5 }}
                type='link'
                className='cvat-annotation-header-button'
                onClick={onRedoClick}
            >
                <Icon component={RedoIcon} />
                Redo
            </Button>
            {/* ISL GLOBAL ATTRIBUTES */}
            <Button
                title={`View conditions menu`}
                onClick={onGlobalIconClick}// ISL GLOBAL ATTRIBUTES
                type='link'
                className={'cvat-annotation-header-button'}
            >
                <Icon component={ConditionsIcon} />
                Conditions
            </Button>
            {/* ISL END */}
        </Col>
    );
}

export default React.memo(LeftGroup);
