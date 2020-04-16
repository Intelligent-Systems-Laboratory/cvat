// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { Row, Col } from 'antd/lib/grid';
import InputNumber from 'antd/lib/input-number';
import { SliderValue } from 'antd/lib/slider';

import { Workspace } from 'reducers/interfaces';
import LeftGroup from './left-group';
import RightGroup from './right-group';
import PlayerNavigation from './player-navigation';
import PlayerButtons from './player-buttons';

interface Props {
    // EDITED FOR USER STORY 12/13
    tracking:boolean;
    onSwitchTrack(): void;
    // EDITED END
    playing: boolean;
    saving: boolean;
    savingStatuses: string[];
    frameNumber: number;
    frameFilename: string;
    inputFrameRef: React.RefObject<InputNumber>;
    startFrame: number;
    stopFrame: number;
    undoAction?: string;
    redoAction?: string;
    workspace: Workspace;
    saveShortcut: string;
    undoShortcut: string;
    redoShortcut: string;
    playPauseShortcut: string;
    nextFrameShortcut: string;
    previousFrameShortcut: string;
    forwardShortcut: string;
    backwardShortcut: string;
    focusFrameInputShortcut: string;
    changeWorkspace(workspace: Workspace): void;
    showStatistics(): void;
    onSwitchPlay(): void;
    onSaveAnnotation(): void;
    onPrevFrame(): void;
    onNextFrame(): void;
    onForward(): void;
    onBackward(): void;
    onFirstFrame(): void;
    onLastFrame(): void;
    onSliderChange(value: SliderValue): void;
    onInputChange(value: number): void;
    onURLIconClick(): void;
    onUndoClick(): void;
    onRedoClick(): void;
}

export default function AnnotationTopBarComponent(props: Props): JSX.Element {
    const {
        saving,
        savingStatuses,
        undoAction,
        redoAction,
        tracking,// EDITED FOR USER STORY 12/13
        playing,
        frameNumber,
        frameFilename,
        inputFrameRef,
        startFrame,
        stopFrame,
        workspace,
        saveShortcut,
        undoShortcut,
        redoShortcut,
        playPauseShortcut,
        nextFrameShortcut,
        previousFrameShortcut,
        forwardShortcut,
        backwardShortcut,
        focusFrameInputShortcut,
        showStatistics,
        changeWorkspace,
        onSwitchPlay,
        onSaveAnnotation,
        onPrevFrame,
        onNextFrame,
        onForward,
        onBackward,
        onFirstFrame,
        onLastFrame,
        onSliderChange,
        onInputChange,
        onURLIconClick,
        onUndoClick,
        onRedoClick,
        onSwitchTrack,
    } = props;

    return (
        <Row type='flex' justify='space-between'>
            <LeftGroup
                saving={saving}
                savingStatuses={savingStatuses}
                undoAction={undoAction}
                redoAction={redoAction}
                saveShortcut={saveShortcut}
                undoShortcut={undoShortcut}
                redoShortcut={redoShortcut}
                onSaveAnnotation={onSaveAnnotation}
                onUndoClick={onUndoClick}
                onRedoClick={onRedoClick}
            />
            <Col className='cvat-annotation-header-player-group'>
                <Row type='flex' align='middle'>
                    <PlayerButtons
                        tracking={tracking}// EDITED FOR USER STORY 12/13
                        playing={playing}
                        playPauseShortcut={playPauseShortcut}
                        nextFrameShortcut={nextFrameShortcut}
                        previousFrameShortcut={previousFrameShortcut}
                        forwardShortcut={forwardShortcut}
                        backwardShortcut={backwardShortcut}
                        onPrevFrame={onPrevFrame}
                        onNextFrame={onNextFrame}
                        onForward={onForward}
                        onBackward={onBackward}
                        onFirstFrame={onFirstFrame}
                        onLastFrame={onLastFrame}
                        onSwitchPlay={onSwitchPlay}
                        onSwitchTrack={onSwitchTrack}// EDITED FOR USER STORY 12/13
                    />
                    <PlayerNavigation
                        startFrame={startFrame}
                        stopFrame={stopFrame}
                        frameNumber={frameNumber}
                        frameFilename={frameFilename}
                        focusFrameInputShortcut={focusFrameInputShortcut}
                        inputFrameRef={inputFrameRef}
                        onSliderChange={onSliderChange}
                        onInputChange={onInputChange}
                        onURLIconClick={onURLIconClick}
                    />
                </Row>
            </Col>
            <RightGroup
                workspace={workspace}
                changeWorkspace={changeWorkspace}
                showStatistics={showStatistics}
            />
        </Row>
    );
}
